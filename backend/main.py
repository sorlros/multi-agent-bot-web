from fastapi import FastAPI
from dotenv import load_dotenv
from app.api.orchestration import router as orchestration_router
from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import JSONResponse
import traceback

load_dotenv()

app = FastAPI(title="Orbit Agent API", version="1.0.0")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"Global Exception: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"success": False, "detail": str(exc), "traceback": traceback.format_exc()},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "https://multi-agent-bot-web.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Orbit Agent Server is running", "version": "1.0.0"}

app.include_router(orchestration_router, prefix="/api")
