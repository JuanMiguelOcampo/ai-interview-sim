# PrepAI: Intelligent Behavioral Interview Simulator

**PrepAI** is a cutting-edge, AI-powered platform designed to help engineers master behavioral interviews. By simulating high-pressure hiring manager interactions through dynamic follow-up questions and voice-to-text integration, PrepAI prepares you for the nuances of modern technical recruitment.

---

## 🚀 Core Features

- **AI-Driven Evaluation:** Leverage Google Gemini to grade your responses based on the **STAR Method**, Clarity, and Impact.
- **Dynamic Follow-Up Loop:** Experience realistic multi-turn conversations. The AI acts as a manager, asking probing follow-up questions based specifically on the details of your story.
- **Voice-to-Text Integration:** Practice naturally by speaking your answers using the integrated Web Speech API.
- **Performance Dashboard:** Track your evolution with a persistent history of every attempt, detailed scores, and conversational threads.
- **Premium UI/UX:** A stunning, responsive glassmorphic interface built with Next.js and Tailwind CSS, optimized for both dark and light modes.
- **PDF Report Generation:** Export professional performance reports to review your progress or share with mentors.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Authentication:** [Clerk](https://clerk.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Glassmorphism & Framer Motion animations)
- **Tools:** `jsPDF`, `html2canvas`, `react-markdown`

### Backend
- **API Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **AI Engine:** [Google Generative AI](https://ai.google.dev/) (Gemini 1.5 Flash)
- **Database:** SQLite with SQLAlchemy ORM
- **Environment:** Pydantic for robust configuration management

---

## 🏁 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/JuanMiguelOcampo/ai-interview-sim.git
cd ai-interview-sim
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Unix/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Create a .env file and add your Gemini API Key:
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env
uvicorn app.main:app --reload
```
*The backend will be available at `http://localhost:8000`*

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Create a .env.local file for Clerk authentication:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
# CLERK_SECRET_KEY=...

npm run dev
```
*The frontend will be available at `http://localhost:3001`*

---

## 📂 Project Structure

```text
ai-interview-sim/
├── backend/            # FastAPI Backend
│   ├── app/            # Source code
│   │   ├── api/        # API Routes
│   │   ├── models/     # Database models & schemas
│   │   └── services/   # AI Logic & Interview handling
│   └── main.py         # Entry point
├── frontend/           # Next.js Frontend
│   ├── src/
│   │   ├── app/        # Pages & Layouts
│   │   └── components/ # UI Components
│   └── package.json
└── README.md           # This file
```

---

## 🧠 How it Works

1. **Scenario Selection:** Choose a behavioral question or let the AI pick one for you.
2. **The Response:** Use voice or text to answer. PrepAI encourages the **STAR method** (Situation, Task, Action, Result).
3. **The Follow-Up:** The AI analyzes your answer in real-time and asks a relevant follow-up question to dig deeper into your experience.
4. **Evaluation:** After the exchange, Gemini provides a comprehensive breakdown of your performance with actionable feedback.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
