import os
from langchain_openai import ChatOpenAI

def get_llm():
    """
    Initialize LLM via OpenRouter.
    We use ChatOpenAI because OpenRouter is fully compatible with OpenAI's API format.
    This safely defaults to NovelAIne's existing gemini-2.5-flash configuration.
    """
    return ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENROUTER_API_KEY", ""),
        model=os.environ.get("LLM_MODEL", "google/gemini-2.5-flash"),
        temperature=0.7,
    )

def load_skill_prompt(role: str) -> str:
    """
    Load the SKILL.md file for the specified role dynamically.
    This injects the global ~/.agents/skills persona.
    """
    path = os.path.expanduser(f"~/.agents/skills/{role}/SKILL.md")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return f"You are a helpful {role} assistant."
