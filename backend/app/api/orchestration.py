from fastapi import APIRouter, Depends, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from app.services.orchestrator.graph import build_graph
from supabase import create_client, Client
from datetime import datetime
import os
import asyncio

router = APIRouter(prefix="/orchestration", tags=["Orchestration"])

# Supabase Initialization
supabase_url = os.environ.get("SUPABASE_URL", "")
supabase_key = os.environ.get("SUPABASE_KEY", "")
supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

def summarize_task_history(task_id: str, messages: list, supabase: Client):
    """Background task to summarize chat history when it gets too long."""
    if len(messages) >= 10:
        try:
            api_key = os.environ.get("GOOGLE_API_KEY")
            if not api_key: return
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, api_key=os.environ.get("OPENAI_API_KEY"))
            chat_text = "\n".join([f"{'User' if isinstance(m, HumanMessage) else 'Agent'}: {m.content}" for m in messages if isinstance(m, (HumanMessage, AIMessage))])
            summary_prompt = f"Summarize the following chat history thoroughly but concisely in Korean (max 3 lines):\n\n{chat_text}"
            summary_response = llm.invoke(summary_prompt)
            summary = summary_response.content
            
            # Save to tasks table summary explicitly
            supabase.table('tasks').update({'summary': summary}).eq('id', task_id).execute()
        except Exception as e:
            print(f"Summarization failed: {e}")

async def verify_api_key(x_api_secret: str = Header(None)):
    """Middleware to verify the secret key matching between frontend and backend."""
    expected_secret = os.environ.get("API_SECRET_KEY")
    # If a secret is defined in backend but not provided or mismatched in header, block request
    if expected_secret and x_api_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid AgentWebClient Secret Key")
    return x_api_secret

class OrchestrationRequest(BaseModel):
    message: str
    task_id: Optional[str] = None
    workspace_name: str = "NovelAIne"
    provider: str = "openrouter"
    model: str = "google/gemini-1.5-flash"
    temperature: float = 0.7
    theme: Optional[str] = None

# Create graph singleton
graph = build_graph()


async def execute_agent_workflow(
    request: OrchestrationRequest, 
    history_messages: list, 
    embeddings_model: Optional[OpenAIEmbeddings],
    supabase: Client
):
    """Long-running agent workflow executed in the background."""
    start_time = datetime.now()
    initial_state = {
        "messages": history_messages,
        "sender": "user",
        "current_task": "Initialize task",
        "provider": request.provider,
        "model": request.model,
        "temperature": request.temperature,
        "theme": request.theme
    }
    
    try:
        # Run the graph in a separate thread to avoid blocking the event loop
        print(f"[{start_time.strftime('%H:%M:%S')}] [Background] Starting LangGraph stream...")
        
        final_messages = []
        
        # Use astream for better async handling of steps
        # Small delay to ensure frontend realtime subscription is ready
        await asyncio.sleep(0.5)
        async for chunk in graph.astream(initial_state, stream_mode="updates"):
            for node_name, update in chunk.items():
                if "messages" in update:
                    new_msgs = update["messages"]
                    final_messages.extend(new_msgs)
                    
                    # Log progress for all agents except the final reporter
                    if node_name != "reporter" and request.task_id and supabase:
                        last_msg = new_msgs[-1]
                        content = f"[{node_name}] 작업을 진행 중입니다..."
                        
                        # If the agent wrote something meaningful (not just tool calls), use it as a hint
                        if hasattr(last_msg, 'content') and last_msg.content:
                            # Truncate content for the step log to keep it concise
                            hint = last_msg.content[:100] + "..." if len(last_msg.content) > 100 else last_msg.content
                            content = f"[{node_name}] {hint}"
                        
                        try:
                            supabase.table('messages').insert({
                                'task_id': request.task_id,
                                'role': 'agent_step',
                                'content': content
                            }).execute()
                            print(f"[{datetime.now().strftime('%H:%M:%S')}] [Background] Logged step: {node_name}")
                        except Exception as e:
                            print(f"Failed to log step {node_name}: {e}")

        # Robustly extract the final report from aggregated messages
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [Background] Graph finished with {len(final_messages)} total messages.")
        
        result = ""
        # Search backwards for the last non-empty AI message
        for msg in reversed(final_messages):
            if hasattr(msg, 'content') and msg.content and msg.content.strip():
                # Avoid using a message that clearly looks like a step hint
                result = msg.content
                break
        
        if not result:
            result = "에이전트가 작업을 완료했으나 상세 보고서를 생성하지 못했습니다. 생성된 파일들을 확인해 주세요."

        # Insert final agent message (This triggers the main chat update)
        if request.task_id and supabase:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [Background] Inserting final agent response...")
            try:
                agent_embedding = embeddings_model.embed_query(result) if embeddings_model else None
                insert_data = {'task_id': request.task_id, 'role': 'agent', 'content': result}
                if agent_embedding:
                    insert_data['embedding'] = agent_embedding
                
                supabase.table('messages').insert(insert_data).execute()
                print(f"[{datetime.now().strftime('%H:%M:%S')}] [Background] Pipeline fully complete.")
                
                # Final summary update
                summarize_task_history(request.task_id, final_messages, supabase)
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] [Background] ERROR during final insert: {e}")
            
        end_time = datetime.now()
        print(f"[{end_time.strftime('%H:%M:%S')}] [Background] Workflow completed in {(end_time - start_time).total_seconds():.2f}s")
        
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [Background] CRITICAL ERROR: {e}")
        if request.task_id and supabase:
            error_msg = f"에이전트 작업 중 중대한 오류가 발생했습니다: {str(e)}"
            # 1. Log as agent_step for progress UI visibility
            try:
                supabase.table('messages').insert({
                    'task_id': request.task_id, 
                    'role': 'agent_step', 
                    'content': f"⚠️ [CRITICAL ERROR] {error_msg}"
                }).execute()
            except: pass
            
            # 2. Log as agent role to trigger UI loading state completion
            try:
                supabase.table('messages').insert({
                    'task_id': request.task_id, 
                    'role': 'agent', 
                    'content': error_msg
                }).execute()
            except: pass

@router.post("/run", dependencies=[Depends(verify_api_key)])
async def run_orchestrator(request: OrchestrationRequest, background_tasks: BackgroundTasks):
    """
    Trigger the autonomous multi-agent pipeline from user prompt.
    Returns immediately while the agent works in the background.
    """
    start_time = datetime.now()
    print(f"\n[{start_time.strftime('%H:%M:%S')}] >>> ASYNC REQUEST RECEIVED <<<")

    from app.services.orchestrator.tools import set_workspace_root
    set_workspace_root(request.workspace_name)
    
    embeddings_model = None
    if os.environ.get("OPENAI_API_KEY"):
        embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small", dimensions=768, api_key=os.environ.get("OPENAI_API_KEY"))

    task_summary = ""
    rag_messages_text = ""
    history_messages = []
    
    if request.task_id and supabase:
        # 1. Fetch Summary & History
        try:
            task_resp = supabase.table('tasks').select('summary').eq('id', request.task_id).execute()
            if task_resp.data and task_resp.data[0].get('summary'):
                task_summary = task_resp.data[0]['summary']
        except Exception: pass
            
        recent_contents = []
        try:
            response = supabase.table('messages').select('*').eq('task_id', request.task_id).order('created_at', desc=True).limit(20).execute()
            if response.data:
                past_msgs = list(reversed(response.data))
                recent_contents = [m['content'] for m in past_msgs]
                for msg in past_msgs:
                    if msg['role'] == 'user':
                        history_messages.append(HumanMessage(content=msg['content']))
                    elif msg['role'] == 'agent':
                        history_messages.append(AIMessage(content=msg['content']))
        except Exception: pass

        # 2. Fetch RAG
        if embeddings_model:
            try:
                query_embedding = embeddings_model.embed_query(request.message)
                rag_resp = supabase.rpc('match_messages', {
                    'query_embedding': query_embedding,
                    'match_threshold': 0.6,
                    'match_count': 3,
                    'p_task_id': request.task_id
                }).execute()
                
                if rag_resp.data:
                    unique_rag = [f"[{m['role']}]: {m['content']}" for m in rag_resp.data if m['content'] != request.message and m['content'] not in recent_contents]
                    if unique_rag: rag_messages_text = "\n\n".join(unique_rag)
            except Exception: pass
        
        # 3. Inject Context
        context_injection = ""
        if task_summary: context_injection += f"[[Previous Conversation Summary]]\n{task_summary}\n\n"
        if rag_messages_text: context_injection += f"[[Relevant Past Fragments from memory]]\n{rag_messages_text}\n\n"
        if context_injection: history_messages.insert(0, SystemMessage(content=context_injection))
            
    # Add current user message
    history_messages.append(HumanMessage(content=request.message))
    
    # 4. Insert user message to Supabase (Sync)
    if request.task_id and supabase:
        try:
            user_embedding = embeddings_model.embed_query(request.message) if embeddings_model else None
            insert_data = {'task_id': request.task_id, 'role': 'user', 'content': request.message}
            if user_embedding: insert_data['embedding'] = user_embedding
            supabase.table('messages').insert(insert_data).execute()
        except Exception as e:
            print(f"User message insert failed: {e}")

    # 5. Launch Background Agent Workflow
    background_tasks.add_task(execute_agent_workflow, request, history_messages, embeddings_model, supabase)
    
    return {"success": True, "result": "에이전트 팀이 작업을 시작했습니다. 잠시만 기다려 주세요..."}
