from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from app.models import database

# Creates the tables in interview_sim.db if they don't exist yet
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="AI Interview Simulator API")

# CRITICAL: Allow your frontend to communicate with your backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows any device on the network
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include our routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def health_check():
    return {"status": "online", "message": "Interview Simulator API is running"}