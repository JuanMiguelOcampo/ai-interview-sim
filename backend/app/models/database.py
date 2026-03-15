from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime

# 1. Setup the SQLite Database connection
SQLALCHEMY_DATABASE_URL = "sqlite:///./interview_sim.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 2. Define the Base class that all models inherit from
Base = declarative_base()

# 3. Define the User Table
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, unique=True, index=True, nullable=False) 
    email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to sessions
    sessions = relationship("InterviewSession", back_populates="owner")

# 4. Define the Interview Session Table
class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to the user
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Interview details
    question_id = Column(Integer)
    question_text = Column(String)
    user_response = Column(String)
    
    # Scores and feedback
    clarity_score = Column(Integer)
    star_method_score = Column(Integer)
    impact_score = Column(Integer)
    overall_score = Column(Integer)
    feedback = Column(String)
    improvement_tip = Column(String)
    follow_up_question = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship back to User
    owner = relationship("User", back_populates="sessions")
    # Relationship to follow-up exchanges (conversation thread)
    follow_ups = relationship(
        "FollowUpExchange",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="FollowUpExchange.turn_number",
    )


# 5. Define the Follow-Up Exchange Table (multi-turn conversation)
class FollowUpExchange(Base):
    __tablename__ = "follow_up_exchanges"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer,
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    turn_number = Column(Integer, nullable=False)       # 1, 2, 3...
    ai_question = Column(String, nullable=False)        # The follow-up question asked
    user_response = Column(String, nullable=False)      # The user's answer
    feedback = Column(String)                           # AI feedback for this turn
    score = Column(Integer, nullable=True)              # Score (only set when is_final=True)
    is_final = Column(Boolean, default=False)           # True = conversation complete
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship back to parent session
    session = relationship("InterviewSession", back_populates="follow_ups")