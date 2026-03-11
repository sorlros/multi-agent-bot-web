from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from app.services.orchestrator.graph import build_graph
import os

router = APIRouter(prefix="/orchestration", tags=["Orchestration"])

async def verify_api_key(x_api_secret: str = Header(None)):
    """Middleware to verify the secret key matching between frontend and backend."""
    expected_secret = os.environ.get("API_SECRET_KEY")
    # If a secret is defined in backend but not provided or mismatched in header, block request
    if expected_secret and x_api_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid AgentWebClient Secret Key")
    return x_api_secret

class OrchestrationRequest(BaseModel):
    message: str
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
    initial_state = {
        "messages": [HumanMessage(content=request.message)],
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
