# PrepAI: Intelligent Behavioral Interview Simulator

**PrepAI** is a full-stack AI-powered platform designed to help engineers master behavioral interviews. It goes beyond simple feedback by simulating a real hiring manager through dynamic follow-up questions and voice-to-text integration.

## 🚀 Core Features

- **AI-Driven Evaluation:** Uses Google Gemini to grade responses based on the **STAR Method**, Clarity, and Impact.
- **Voice-to-Text Integration:** Practice naturally by speaking your answers using the Web Speech API.
- **Dynamic Follow-Up Questions:** The AI acts as a manager, asking probing questions based specifically on the details of your story.
- **Performance Dashboard:** Track your progress with a persistent history of every attempt and score.
- **Premium UI/UX:** A modern, glassmorphic interface built with Next.js and Tailwind CSS.
- **PDF Export:** Generate and download professional performance reports of your best answers.

## 🛠️ Tech Stack

**Frontend:**
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (Glassmorphism & Dark Mode components)
- **State Management:** React Hooks (useRef, useEffect, useState)
- **Tools:** jsPDF & html2canvas (Report Generation), React Markdown

**Backend:**
- **API Framework:** FastAPI (Python 3.10+)
- **AI Integration:** Google Generative AI (Gemini 3 Flash)
- **Database:** SQLite with SQLAlchemy ORM
- **Validation:** Pydantic Models

## 🏁 Getting Started

### 1. Clone the Repository
```bash
git clone
cd prep-ai

### 2. Backend Setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Create a .env file and add: GEMINI_API_KEY=your_key_here
uvicorn app.main:app --reload


### 3. Frontend Setup
cd frontend
npm install
npm run dev

Open http://localhost:3000 to start practicing.