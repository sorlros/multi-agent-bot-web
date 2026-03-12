from fastapi import APIRouter, Depends, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from app.services.orchestrator.graph import build_graph
from supabase import create_client, Client
import os

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

@router.post("/run", dependencies=[Depends(verify_api_key)])
async def run_orchestrator(request: OrchestrationRequest, background_tasks: BackgroundTasks):
    """
    Trigger the autonomous multi-agent pipeline from user prompt.
    The orchestrator internally processes tasks using Manager, BackendDev, etc.
    """
    from app.services.orchestrator.tools import set_workspace_root
    set_workspace_root(request.workspace_name)
    
    embeddings_model = None
    if os.environ.get("OPENAI_API_KEY"):
        embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small", api_key=os.environ.get("OPENAI_API_KEY"))

    task_summary = ""
    rag_messages_text = ""
    history_messages = []
    
    if request.task_id and supabase:
        # Fetch task summary to prepend if it exists
        try:
            task_resp = supabase.table('tasks').select('summary').eq('id', request.task_id).execute()
            if task_resp.data and task_resp.data[0].get('summary'):
                task_summary = task_resp.data[0]['summary']
        except Exception as e:
            print(f"Failed to fetch task summary: {e}")
            
        recent_contents = []
        
        # 1. Fetch Recent History from Supabase (Fetch first to deduplicate RAG later)
        try:
            # Limit to last 20 messages to prevent context window explosion
            response = supabase.table('messages').select('*').eq('task_id', request.task_id).order('created_at', desc=True).limit(20).execute()
            if response.data:
                # Reverse to get chronological order [oldest ... newest]
                past_msgs = list(reversed(response.data))
                recent_contents = [m['content'] for m in past_msgs]
                for msg in past_msgs:
                    if msg['role'] == 'user':
                        history_messages.append(HumanMessage(content=msg['content']))
                    elif msg['role'] == 'agent':
                        history_messages.append(AIMessage(content=msg['content']))
        except Exception as e:
            print(f"Failed to fetch history for task {request.task_id}: {e}")

        # 2. Fetch RAG messages similar to user's new message
        if embeddings_model:
            try:
                query_embedding = embeddings_model.embed_query(request.message)
                rag_resp = supabase.rpc(
                    'match_messages',
                    {
                        'query_embedding': query_embedding,
                        'match_threshold': 0.6,
                        'match_count': 3, # Slightly more to allow filtering
                        'p_task_id': request.task_id
                    }
                ).execute()
                
                if rag_resp.data:
                    # Deduplicate: only include if not in the recent 20 messages
                    initial_count = len(rag_resp.data)
                    unique_rag = [
                        f"[{m['role']}]: {m['content']}" 
                        for m in rag_resp.data 
                        if m['content'] != request.message and m['content'] not in recent_contents
                    ]
                    print(f"--- [DEDUPLICATION] RAG: {initial_count} -> {len(unique_rag)} unique messages ---")
                    if unique_rag:
                        rag_messages_text = "\n\n".join(unique_rag)
            except Exception as e:
                print(f"Failed to fetch RAG matching messages: {e}")
        
        # 3. Inject Context into SystemMessage (Summary + filtered RAG)
        context_injection = ""
        if task_summary:
            context_injection += f"[[Previous Conversation Summary]]\n{task_summary}\n\n"
        if rag_messages_text:
            context_injection += f"[[Relevant Past Fragments from memory]]\n{rag_messages_text}\n\n"
            
        if context_injection:
            # Final history_messages is [System(Summary+RAG)] + [Past Messages]
            history_messages.insert(0, SystemMessage(content=context_injection))
            
    # 2. Append the current user message
    history_messages.append(HumanMessage(content=request.message))
    
    # 3. Insert user message with embedding to Supabase
    if request.task_id and supabase:
        try:
            user_embedding = embeddings_model.embed_query(request.message) if embeddings_model else None
            insert_data = {
                'task_id': request.task_id,
                'role': 'user',
                'content': request.message
            }
            if user_embedding:
                insert_data['embedding'] = user_embedding
            supabase.table('messages').insert(insert_data).execute()
        except Exception as e:
            print(f"Failed to insert user message into Supabase: {e}")

    
    initial_state = {
        "messages": history_messages,
        "sender": "user",
        "current_task": "Initialize task",
        "provider": request.provider,
        "model": request.model,
        "temperature": request.temperature,
        "theme": request.theme
    }
    
    # Run the graph until END
    final_state = graph.invoke(initial_state)
    
    result = final_state["messages"][-1].content if final_state["messages"] else "No response generated."
    
    # 4. Insert agent message with embedding to Supabase
    if request.task_id and supabase and final_state["messages"]:
        try:
            agent_embedding = embeddings_model.embed_query(result) if embeddings_model else None
            insert_data = {
                'task_id': request.task_id,
                'role': 'agent',
                'content': result
            }
            if agent_embedding:
                insert_data['embedding'] = agent_embedding
            supabase.table('messages').insert(insert_data).execute()
        except Exception as e:
            print(f"Failed to insert agent message into Supabase: {e}")
            
    # 5. Background Task: Summarize history
    if request.task_id and supabase:
        background_tasks.add_task(summarize_task_history, request.task_id, history_messages + [AIMessage(content=result)], supabase)
    
    return {"success": True, "result": result}
