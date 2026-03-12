import os
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

THEME_MAPPING = {
    "quality": {"provider": "openrouter", "model": "anthropic/claude-3.5-sonnet"},
    "balanced": {"provider": "openrouter", "model": "google/gemini-2.0-pro-exp-02-05"},
    "economy": {"provider": "openrouter", "model": "google/gemini-2.0-flash"},
}

# Role-based grade mapping (for Asymmetric Modeling)
# FIXED_ROLES always use these grades regardless of the global theme to ensure efficiency.
FIXED_ROLES = {
    "product_manager": "balanced",
    "supervisor": "economy",
    "reporter": "economy",
}

# CODING_ROLES respect the global theme (Quality/Balanced/Economy) selected by the user.
CODING_ROLES = ["backend_dev", "frontend_dev", "ui_ux_designer", "qa_engineer"]

def get_llm(state: dict, role: str = None):
    """
    Initialize LLM dynamically based on the state and role.
    Implements Asymmetric Modeling:
    - Fixed Roles (PM, Supervisor, Reporter) use optimized tiers.
    - Coding Roles respect the UI Theme (Quality/Balanced/Economy) or manual selection.
    """
    theme = state.get("theme", "manual")
    provider = state.get("provider", "openrouter")
    model = state.get("model", "google/gemini-2.0-flash")
    temperature = state.get("temperature", 0.7)

    # 1. Determine the target grade based on role and theme
    target_grade = None
    
    if role in FIXED_ROLES:
        # Fixed roles use optimized tiers
        target_grade = FIXED_ROLES[role]
    elif role in CODING_ROLES:
        # Coding roles respect the theme if it's not manual
        if theme in THEME_MAPPING:
            target_grade = theme
    else:
        # Default fallback for unknown roles or no role
        if theme in THEME_MAPPING:
            target_grade = theme

    # 2. Apply Mapping if a grade was determined
    if target_grade:
        mapping = THEME_MAPPING[target_grade]
        provider = mapping["provider"]
        model = mapping["model"]

    # Debug log to verify model assignment (Optional)
    # print(f"--- [LLM Assignment] Role: {role} | Theme: {theme} -> Model: {model} ---")

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
