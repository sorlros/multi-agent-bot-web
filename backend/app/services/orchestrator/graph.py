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
        llm = get_llm(state)
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

def reporter_node(state: AgentState):
    """The final reporter node that summarizes the work done by the agents in a respectful Korean boss-employee persona."""
    llm = get_llm(state)
    messages = list(state["messages"])
    
    system_prompt = (
        "당신은 팀의 수석 보고관(Executive Reporter)입니다.\n"
        "이 프롬프트를 보낸 사용자는 당신과 개발팀(Manager, BackendDev, FrontendDev 등)의 최고 상사(Boss)입니다.\n"
        "지금까지 팀원들(에이전트들)이 나눈 대화를 종합하여, 상사에게 최종 보고를 올리세요.\n\n"
        "### 📝 보고서 작성 가이드 (반드시 마크다운 형식을 따름):\n"
        "1. **매우 정중한 한국어 존댓말(다나까체)**을 사용할 것.\n"
        "2. 도입부는 상사에게 올리는 결재 서류처럼 인사말과 함께 시작할 것 (예: '보고 드립니다. 팀원들이 작업을 성공적으로 마쳤습니다.')\n"
        "3. 어떤 팀원(에이전트)이 어떤 파일을 수정했는지, 그리고 구체적으로 코드가 어떻게 변경되었는지 핵심을 요약할 것.\n"
        "4. 작업 과정 중 발생했던 특이사항이나 에러가 해결된 과정을 투명하게 보고할 것.\n"
        "5. 마무리 인사와 함께 다음 지시를 기다리겠다는 멘트로 끝맺을 것.\n"
        "절대 스스로 코드를 수정(Tool usage)하지 말고, 오직 히스토리 요약 마크다운 텍스트만 뱉어내십시오."
    )
    
    sys_msg = SystemMessage(content=system_prompt)
    response = llm.invoke([sys_msg] + messages)
    return {"messages": [response], "sender": "Reporter"}


class Route(BaseModel):
    next_node: Literal["manager", "backend", "ui_ux", "frontend", "qa", "FINISH"] = Field(
        description="The next agent to route to, or FINISH if all tasks are complete."
    )

def supervisor_router(state: AgentState):
    """Supervisor node that decides the next step."""
    llm = get_llm(state)
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
        return "reporter"
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
    
    # Add Executive Reporter Node
    builder.add_node("reporter", reporter_node)
    
    # Define Entry Point
    builder.add_edge(START, "manager")
    
    # Tool edges return to the caller
    builder.add_conditional_edges("tools", tool_edge)
    
    # All agents route through the supervisor after they finish their turn
    nodes = ["manager", "backend", "ui_ux", "frontend", "qa"]
    for node in nodes:
        builder.add_conditional_edges(node, supervisor_router)
        
    # Final step: the reporter sends back the synthesized Korean report and ends.
    builder.add_edge("reporter", END)
        
    return builder.compile()
