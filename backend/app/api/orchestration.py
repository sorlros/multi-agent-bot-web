from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from langchain_core.messages import HumanMessage, AIMessage
from app.services.orchestrator.graph import build_graph
from supabase import create_client, Client
import os

router = APIRouter(prefix="/orchestration", tags=["Orchestration"])

# Supabase Initialization
supabase_url = os.environ.get("SUPABASE_URL", "")
supabase_key = os.environ.get("SUPABASE_KEY", "")
supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

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
    model: str = "google/gemini-2.5-flash"
    temperature: float = 0.7

# Create graph singleton
graph = build_graph()

@router.post("/run", dependencies=[Depends(verify_api_key)])
async def run_orchestrator(request: OrchestrationRequest):
    """
    Trigger the autonomous multi-agent pipeline from user prompt.
    The orchestrator internally processes tasks using Manager, BackendDev, etc.
    """
    from app.services.orchestrator.tools import set_workspace_root
    set_workspace_root(request.workspace_name)
    
    # 1. Fetch History from Supabase if task_id exists
    history_messages = []
    if request.task_id and supabase:
        try:
            # Fetch past messages for this task ordered by time
            # Limit to last 20 messages to prevent context window explosion
            response = supabase.table('messages').select('*').eq('task_id', request.task_id).order('created_at', desc=True).limit(20).execute()
            if response.data:
                # Reverse to get chronological order [oldest ... newest]
                past_msgs = reversed(response.data)
                for msg in past_msgs:
                    if msg['role'] == 'user':
                        history_messages.append(HumanMessage(content=msg['content']))
                    elif msg['role'] == 'agent':
                        history_messages.append(AIMessage(content=msg['content']))
        except Exception as e:
            print(f"Failed to fetch history for task {request.task_id}: {e}")
            
    # 2. Append the current user message
    history_messages.append(HumanMessage(content=request.message))
    
    initial_state = {
        "messages": history_messages,
        "sender": "user",
        "current_task": "Initialize task",
        "provider": request.provider,
        "model": request.model,
        "temperature": request.temperature
    }
    
    # Run the graph until END
    final_state = graph.invoke(initial_state)
    
    result = final_state["messages"][-1].content if final_state["messages"] else "No response generated."
    
    return {"success": True, "result": result}
