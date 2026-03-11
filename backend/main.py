from fastapi import FastAPI
from dotenv import load_dotenv
from app.api.orchestration import router as orchestration_router
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="Orbit Agent API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Orbit Agent Server is running", "version": "0.1.0"}

app.include_router(orchestration_router, prefix="/api")
