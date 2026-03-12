import os
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

THEME_MAPPING = {
    "quality": {"provider": "openrouter", "model": "anthropic/claude-3.5-sonnet"},
    "balanced": {"provider": "openrouter", "model": "google/gemini-2.0-pro-exp-02-05"},
    "economy": {"provider": "openrouter", "model": "google/gemini-2.0-flash"},
}

# Role-based grade mapping (for Asymmetric Modeling)
# 1: Economy, 2: Balanced, 3: Quality
ROLE_GRADE = {
    "product_manager": "balanced",
    "backend_dev": "quality",
    "frontend_dev": "quality",
    "ui_ux_designer": "quality",
    "qa_engineer": "quality",
    "supervisor": "economy",
    "reporter": "economy",
}

def get_llm(state: dict, role: str = None):
    """
    Initialize LLM dynamically based on the state and role.
    Implements Asymmetric Modeling to optimize cost/performance.
    """
    theme = state.get("theme")
    provider = state.get("provider", "openrouter")
    model = state.get("model", "google/gemini-2.0-flash")
    temperature = state.get("temperature", 0.7)

    # 1. Apply Asymmetric Modeling if a role is provided
    # This overrides the global theme for efficiency
    if role and role in ROLE_GRADE:
        target_grade = ROLE_GRADE[role]
        mapping = THEME_MAPPING[target_grade]
        provider = mapping["provider"]
        model = mapping["model"]
    # 2. Otherwise apply global Theme Mapping
    elif theme and theme in THEME_MAPPING:
        mapping = THEME_MAPPING[theme]
        provider = mapping["provider"]
        model = mapping["model"]

    # Debug log to verify model assignment
    # print(f"--- [LLM Assignment] Role: {role} | Model: {model} ---")

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
        # Fallback to OpenRouter
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
