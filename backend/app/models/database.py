from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone
from app.core.config import settings

# Setup the connection to the database
engine = create_engine(
    settings.DATABASE_URL, 
    # This argument is specifically required for SQLite to prevent thread errors in FastAPI
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Define our database table schema
class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    question_id = Column(Integer, index=True)
    user_response = Column(Text)
    ai_feedback = Column(JSON)  # We store the structured Gemini output directly as JSON
    overall_score = Column(Integer)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# Create the tables automatically (For a production app, you would use Alembic for migrations instead)
Base.metadata.create_all(bind=engine)

# Dependency to get a database session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()