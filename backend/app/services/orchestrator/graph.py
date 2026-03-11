from typing import Annotated, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from .state import AgentState
from .tools import read_file, write_file
from .agents import get_llm, load_skill_prompt

# Shared Tools
tools = [read_file, write_file]

def create_agent_node(agent_name: str, role_id: str):
    """Factory to create an agent node."""
    def agent_node(state: AgentState):
        llm = get_llm()
        llm_with_tools = llm.bind_tools(tools)
        sys_prompt = load_skill_prompt(role_id)
        
        # Guide the agent to call tools if needed and explain their thought process
        sys_msg = SystemMessage(content=f"{sys_prompt}\n\nReview the conversation and use tools to write code or update task.md.")
        
        # Inject the system prompt and history
        messages = [sys_msg] + list(state["messages"])
        
        response = llm_with_tools.invoke(messages)
        return {"messages": [response], "sender": agent_name}
    return agent_node

# Create standard nodes
pm_node = create_agent_node("Manager", "product_manager")
backend_node = create_agent_node("BackendDev", "backend_dev")
ui_ux_node = create_agent_node("UIUXDesigner", "ui_ux_designer")
frontend_node = create_agent_node("FrontendDev", "frontend_dev")
qa_node = create_agent_node("QAEngineer", "qa_engineer")

class Route(BaseModel):
    next_node: Literal["manager", "backend", "ui_ux", "frontend", "qa", "FINISH"] = Field(
        description="The next agent to route to, or FINISH if all tasks are complete."
    )

def supervisor_router(state: AgentState):
    """Supervisor node that decides the next step."""
    llm = get_llm()
    messages = state["messages"]
    last_msg = messages[-1]
    
    if getattr(last_msg, "tool_calls", None):
        return "tools"
        
    system_prompt = (
        "You are a supervisor managing a conversation between: Manager, BackendDev, UIUXDesigner, FrontendDev, and QAEngineer. "
        "Based on the conversation so far, pick the next relevant worker, or FINISH if the overall goal is fully verified and met."
    )
    
    structured_llm = llm.with_structured_output(Route)
    result = structured_llm.invoke([SystemMessage(content=system_prompt)] + list(messages))
    
    if result.next_node == "FINISH":
        return END
    return result.next_node

def tool_edge(state: AgentState):
    """Route from tools back to the agent who called them."""
    sender = state.get("sender", "Manager")
    routing_map = {
        "Manager": "manager",
        "BackendDev": "backend",
        "FrontendDev": "frontend",
        "UIUXDesigner": "ui_ux",
        "QAEngineer": "qa"
    }
    return routing_map.get(sender, "manager")

def build_graph():
    builder = StateGraph(AgentState)
    
    # Add Agent Nodes
    builder.add_node("manager", pm_node)
    builder.add_node("backend", backend_node)
    builder.add_node("ui_ux", ui_ux_node)
    builder.add_node("frontend", frontend_node)
    builder.add_node("qa", qa_node)
    builder.add_node("tools", ToolNode(tools))
    
    # Define Entry Point
    builder.add_edge(START, "manager")
    
    # Tool edges return to the caller
    builder.add_conditional_edges("tools", tool_edge)
    
    # All agents route through the supervisor after they finish their turn
    nodes = ["manager", "backend", "ui_ux", "frontend", "qa"]
    for node in nodes:
        builder.add_conditional_edges(node, supervisor_router)
        
    return builder.compile()
