import os
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

def get_llm(state: dict):
    """
    Initialize LLM dynamically based on the state payload from the frontend.
    Supports direct OpenAI, direct Google, or fallback to OpenRouter.
    """
    # Defensive typing since dict can be passed during tests
    provider = state.get("provider", "openrouter")
    model = state.get("model", "google/gemini-2.5-flash")
    temperature = state.get("temperature", 0.7)

    if provider == "openai":
        return ChatOpenAI(
            api_key=os.environ.get("OPENAI_API_KEY", ""),
            model=model,
            temperature=temperature,
        )
    elif provider == "google":
        return ChatGoogleGenerativeAI(
            api_key=os.environ.get("GOOGLE_API_KEY", ""),
            model=model,
            temperature=temperature,
        )
    else:
        # Fallback to OpenRouter (Uses ChatOpenAI because API formats match)
        or_model = model
        if "/" not in or_model:
            if "gemini" in or_model:
                or_model = f"google/{or_model}"
            elif "gpt" in or_model:
                or_model = f"openai/{or_model}"
            elif "claude" in or_model:
                or_model = f"anthropic/{or_model}"
                
        return ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ.get("OPENROUTER_API_KEY", ""),
            model=or_model,
            temperature=temperature,
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
