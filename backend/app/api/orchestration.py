from fastapi import APIRouter
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from app.services.orchestrator.graph import build_graph

router = APIRouter(prefix="/orchestration", tags=["Orchestration"])

class OrchestrationRequest(BaseModel):
    message: str
    workspace_name: str = "NovelAIne"

# Create graph singleton
graph = build_graph()

@router.post("/run")
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
        "current_task": "Initialize task"
    }
    
    # Run the graph until END
    final_state = graph.invoke(initial_state)
    
    result = final_state["messages"][-1].content if final_state["messages"] else "No response generated."
    
    return {"success": True, "result": result}
