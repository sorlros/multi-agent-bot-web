import os
from langchain_core.tools import tool
from dotenv import load_dotenv

load_dotenv()

# The target project workspace to operate on. 
TARGET_WORKSPACE_PATH = os.getenv("TARGET_WORKSPACE_PATH", "/Users/choi/Desktop/workspace/NovelAIne")

# Ensure we always deal with canonical absolute paths
WORKSPACE_ROOT = os.path.abspath(TARGET_WORKSPACE_PATH)

def set_workspace_root(workspace_name: str):
    global WORKSPACE_ROOT
    # Extract /.../workspace/
    base_dir = os.path.dirname(os.path.abspath(TARGET_WORKSPACE_PATH))
    WORKSPACE_ROOT = os.path.join(base_dir, workspace_name)
    print(f"[ORCHESTRATOR] Workspace dynamically bound to: {WORKSPACE_ROOT}")

@tool
def read_file(relative_path: str) -> str:
    """Read a file from the user's workspace."""
    # Robust path handling: strip workspace root if agent accidentally includes it
    clean_path = relative_path
    if clean_path.startswith(WORKSPACE_ROOT):
        clean_path = os.path.relpath(clean_path, WORKSPACE_ROOT)
    
    target_path = os.path.abspath(os.path.join(WORKSPACE_ROOT, clean_path))
    # Security: ensure target_path is within WORKSPACE_ROOT
    if not target_path.startswith(WORKSPACE_ROOT):
        return f"Error: Path '{relative_path}' is outside the workspace."
        
    if not os.path.exists(target_path):
        return f"Error: File '{relative_path}' not found."
    try:
        with open(target_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

@tool
def write_file(relative_path: str, content: str) -> str:
    """Write or overwrite a file in the user's workspace."""
    # Robust path handling
    clean_path = relative_path
    if clean_path.startswith(WORKSPACE_ROOT):
        clean_path = os.path.relpath(clean_path, WORKSPACE_ROOT)
        
    target_path = os.path.abspath(os.path.join(WORKSPACE_ROOT, clean_path))
    # Security: ensure target_path is within WORKSPACE_ROOT
    if not target_path.startswith(WORKSPACE_ROOT):
        return f"Error: Path '{relative_path}' is outside the workspace."
        
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    try:
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Successfully wrote to '{relative_path}'"
    except Exception as e:
        return f"Error writing file: {str(e)}"
@tool
def list_files(relative_path: str = ".") -> str:
    """List files and directories in the user's workspace."""
    # Robust path handling
    clean_path = relative_path
    if clean_path.startswith(WORKSPACE_ROOT):
        clean_path = os.path.relpath(clean_path, WORKSPACE_ROOT)
        
    target_path = os.path.abspath(os.path.join(WORKSPACE_ROOT, clean_path))
    if not target_path.startswith(WORKSPACE_ROOT):
        return f"Error: Path '{relative_path}' is outside the workspace."
        
    if not os.path.exists(target_path):
        return f"Error: Path '{relative_path}' not found."
    
    try:
        files = []
        for root, dirs, filenames in os.walk(target_path):
            # Ignore hidden dirs and typical heavy folders
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '__pycache__', 'venv', 'dist', 'build']]
            
            rel_root = os.path.relpath(root, WORKSPACE_ROOT)
            if rel_root == ".":
                rel_root = ""
                
            for f in filenames:
                if not f.startswith('.'):
                    files.append(os.path.join(rel_root, f))
        
        if not files:
            return "The workspace is empty."
        return "\n".join(files[:100]) # Limit to first 100 files for context safety
    except Exception as e:
        return f"Error listing files: {str(e)}"
