from typing import Annotated, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field
import re
import json

from .state import AgentState
from .tools import read_file, write_file, list_files
from .agents import get_llm, load_skill_prompt

# Shared Tools
tools = [read_file, write_file, list_files]

def create_agent_node(agent_name: str, role_id: str):
    """Factory to create an agent node."""
    def agent_node(state: AgentState):
        llm = get_llm(state, role=role_id)
        llm_with_tools = llm.bind_tools(tools)
        sys_prompt = load_skill_prompt(role_id)
        # Imperative instruction for Multi-Agent Collaboration
        sys_msg = SystemMessage(content=(
            f"{sys_prompt}\n\n"
            "## CRITICAL INSTRUCTION (ACTION OVER WORDS):\n"
            "1. 절대 대화로만 답하지 마십시오. 당신은 실제 파일을 수정하는 '엔지니어'입니다.\n"
            "2. **모든 답변은 반드시 한국어로 작성하십시오.** (CRITICAL: Respond ONLY in Korean)\n"
            "3. 코드 수정이나 파일 생성이 필요하면 반드시 `write_file` 도구를 사용하십시오.\n"
            "4. 작업을 완료했다면 반드시 무엇을 수정했는지 명확한 파일 경로와 함께 요약하고, 다음 필요한 단계를 제안하십시오.\n"
            "5. 도구 사용 결과 `Error`가 반환되면, 포기하지 말고 에러 메시지를 분석하여 즉시 수정한 후 다시 도구를 호출하십시오."
        ))
        
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
    """The final reporter node that summarizes the work done by the agents."""
    llm = get_llm(state, role="reporter")
    
    # Trim history to the last 40 messages to avoid context overflow and provide a concise summary
    all_messages = list(state["messages"])
    messages = all_messages[-40:] if len(all_messages) > 40 else all_messages
    
    system_prompt = (
        "당신은 팀의 수석 보고관(Executive Reporter)입니다.\n"
        "이 프롬프트를 보낸 사용자는 당신과 개발팀(Manager, BackendDev, FrontendDev 등)의 최고 상사(Boss)입니다.\n"
        "지금까지 팀원들(에이전트들)이 나눈 대화를 종합하여, 상사에게 최종 보고를 올리세요.\n\n"
        "### 📝 보고서 작성 가이드 (반드시 마크다운 형식을 따름):\n"
        "1. **매우 정중한 한국어 존댓말(다나까체)**을 사용할 것.\n"
        "2. 도입부는 상사에게 올리는 결재 서류처럼 인사말과 함께 시작할 것 (예: '보고 드립니다. 작업을 성공적으로 마쳤습니다.')\n"
        "3. 어떤 팀원(에이전트)이 어떤 파일을 수정했는지 핵심을 요약할 것.\n"
        "4. 작업 결과물을 사용자가 어떻게 확인할 수 있는지 안내할 것.\n"
        "5. 마무리 인사와 함께 다음 지시를 기다리겠다는 멘트로 끝맺을 것.\n"
        "절대 스스로 코드를 수정(Tool usage)하지 말고, 오직 히스토리 요약 마크다운 텍스트만 답변하십시오."
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
    llm = get_llm(state, role="supervisor")
    messages = state["messages"]
    last_msg = messages[-1]
    
    if getattr(last_msg, "tool_calls", None):
        return "tools"
        
    system_prompt = (
        "Your goal is to ensure the user's request is ACTUALLY IMPLEMENTED in the local codebase.\n\n"
        "STRICT ROUTING RULES:\n"
        "1. NO TOOL, NO FINISH: 만약 에이전트가 코드를 수정했다고 말만 하고 `write_file` 도구를 사용한 기록이 없다면, 즉시 해당 에이전트에게 다시 보내 '도구를 사용하여 실제 파일을 수정하라'고 강력하게 명령하십시오.\n"
        "2. VERIFY ACTION: 코드가 작성되었다고 판단되면 반드시 QAEngineer로 보내 검증하십시오.\n"
        "3. LOGICAL PROGRESSION: 프로젝트 요구사항이 완전히 충족될 때까지 manager, backend, ui_ux, frontend 사이를 유기적으로 회전시키십시오.\n"
        "4. ABSOLUTE PATHS: 에이전트가 파일을 다룰 때 워크스페이스 루트 기준의 올바른 상대 경로를 사용하고 있는지 감시하십시오.\n\n"
        "OUTPUT FORMAT: You MUST answer ONLY in a single JSON block. No conversational filler, no 'Okay', no markdown outside the JSON."
    )
    
    # Trim history to the last 10 messages for the supervisor to ensure concise context and avoid response truncation
    all_messages = list(state["messages"])
    trimmed_messages = all_messages[-10:] if len(all_messages) > 10 else all_messages
    
    try:
        # Use structured output as the primary method
        structured_llm = llm.with_structured_output(Route)
        result = structured_llm.invoke([SystemMessage(content=system_prompt)] + trimmed_messages)
        
        if result.next_node == "FINISH":
            return "reporter"
        return result.next_node
    except Exception as e:
        print(f"[SUPERVISOR] Structured output failed, attempting regex fallback: {e}")
        
        try:
            # Manual Fallback: Handle trailing characters, markdown noise, and non-standard fields
            raw_response = llm.invoke([SystemMessage(content=system_prompt)] + trimmed_messages).content
            
            # Find the first { and the last } to isolate the pure JSON block
            start_idx = raw_response.find('{')
            end_idx = raw_response.rfind('}')
            
            if start_idx != -1 and end_idx != -1:
                json_str = raw_response[start_idx:end_idx + 1]
                data = json.loads(json_str)
                
                # Robust field mapping: LLMs sometimes hallucinate field names like 'to' or 'command'
                next_node = data.get("next_node") or data.get("to") or data.get("command")
                
                valid_nodes = ["manager", "backend", "ui_ux", "frontend", "qa"]
                if next_node == "FINISH":
                    return "reporter"
                if next_node in valid_nodes:
                    return next_node
                    
            raise ValueError(f"No valid JSON block found in response: {raw_response[:100]}...")
            
        except Exception as fallback_e:
            print(f"[SUPERVISOR CRITICAL ERROR] All parsing failed: {fallback_e}. Falling back to reporter.")
            return "reporter"

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
