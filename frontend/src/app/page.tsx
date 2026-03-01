"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

// Matches the backend Pydantic Response Model
interface Evaluation {
    clarity_score: number;
    star_method_score: number;
    impact_score: number;
    overall_score: number;
    feedback: string;
    improvement_tip: string;
    follow_up_question: string;
}

const QUESTION_BANK = [
    "Tell me about a time you had to manage conflicting priorities on a technical project.",
    "Describe a situation where you had to learn a new technology or tool quickly.",
    "Tell me about a time you disagreed with a team member. How did you resolve it?",
    "Describe your most challenging technical project. What made it difficult?",
    "Tell me about a time you failed or made a significant mistake. What did you learn?"
];

function ScoreCard({ title, score }: { title: string; score: number }) {
    const getColor = (s: number) => {
        if (s >= 4) return "text-emerald-600 border-emerald-100 bg-emerald-50/50";
        if (s === 3) return "text-amber-600 border-amber-100 bg-amber-50/50";
        return "text-rose-600 border-rose-100 bg-rose-50/50";
    };

    return (
        <div className={`p-4 rounded-2xl border backdrop-blur-sm transition-all hover:scale-105 flex flex-col items-center justify-center ${getColor(score)}`}>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1 opacity-70">{title}</span>
            <span className="text-2xl font-black">{score}<span className="text-sm opacity-40">/5</span></span>
        </div>
    );
}

export default function InterviewSimulator() {
    const [response, setResponse] = useState("");
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const currentQuestion = QUESTION_BANK[questionIndex];

    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.onresult = (event: any) => {
                    let text = "";
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) text += event.results[i][0].transcript + " ";
                    }
                    if (text) setResponse((prev) => prev + text);
                };
                recognitionRef.current.onend = () => setIsListening(false);
            }
        }
    }, []);

    const toggleListening = () => {
        if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
        else { recognitionRef.current?.start(); setIsListening(true); }
    };

    const handleShuffle = () => {
        setQuestionIndex((prev) => (prev + 1) % QUESTION_BANK.length);
        setResponse(""); setEvaluation(null); setError("");
    };

    const handleSubmit = async () => {
        if (isListening) toggleListening();
        if (response.trim().length < 20) {
            setError("Response too short. Aim for at least 20 characters.");
            return;
        }
        setLoading(true); setError(""); setEvaluation(null);
        try {
            const res = await fetch("http://localhost:8000/api/v1/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: 1, question_id: questionIndex + 1, question_text: currentQuestion, user_response: response }),
            });
            const data = await res.json();
            setEvaluation(data);
        } catch (err: any) { setError("Server connection failed."); }
        finally { setLoading(false); }
    };

    return (
        <div className="relative min-h-screen bg-[#F8FAFC] overflow-hidden selection:bg-indigo-100">
            {/* Soft Ambient Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none" />

            <main className="relative z-10 max-w-4xl mx-auto px-6 py-16">

                {/* Modern Header */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                    <div className="text-center md:text-left">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">
                            Prep<span className="text-indigo-600">AI</span>
                        </h1>
                        <p className="text-slate-500 font-medium">Elevate your interview game with intelligent feedback.</p>
                    </div>
                    <Link href="/history" className="group flex items-center gap-2 bg-white text-slate-600 font-bold px-6 py-3 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all active:scale-95">
                        <span className="text-indigo-500 group-hover:rotate-12 transition-transform">📊</span>
                        History Dashboard
                    </Link>
                </header>

                {/* Question Card */}
                <section className="bg-white/80 backdrop-blur-md border border-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 mb-8 relative">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active Challenge</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 leading-snug mb-6">{currentQuestion}</h2>
                    <button onClick={handleShuffle} className="text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest">
                        Shuffle Question →
                    </button>
                </section>

                {/* Text Area Container */}
                <section className="group relative bg-white border-2 border-slate-100 rounded-[32px] p-2 focus-within:border-indigo-400 focus-within:ring-8 focus-within:ring-indigo-50 transition-all mb-8 shadow-sm">
                    <textarea
                        className="w-full h-56 p-6 bg-transparent text-slate-700 text-lg outline-none resize-none placeholder:text-slate-300"
                        placeholder="Share your story using the STAR method..."
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                    />
                    <div className="flex justify-between items-center p-4 border-t border-slate-50 bg-slate-50/50 rounded-b-[24px]">
                        <button
                            onClick={toggleListening}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${isListening ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                }`}
                        >
                            <span className={isListening ? "animate-spin" : ""}>{isListening ? "●" : "🎤"}</span>
                            {isListening ? "Recording Voice..." : "Voice Input"}
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {response.length} characters
                        </span>
                    </div>
                </section>

                {/* Action Row */}
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !response}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-5 rounded-[20px] shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0"
                    >
                        {loading ? "Analyzing Strategy..." : "Get AI Analysis"}
                    </button>
                    {error && <p className="text-rose-500 font-bold text-sm bg-rose-50 px-4 py-2 rounded-lg">⚠️ {error}</p>}
                </div>

                {/* Feedback Panel */}
                {evaluation && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

                            <h2 className="text-white text-3xl font-black mb-10 flex items-center gap-3">
                                <span className="text-indigo-400 italic">#</span> Performance Report
                            </h2>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                                <ScoreCard title="Overall" score={evaluation.overall_score} />
                                <ScoreCard title="Clarity" score={evaluation.clarity_score} />
                                <ScoreCard title="STAR" score={evaluation.star_method_score} />
                                <ScoreCard title="Impact" score={evaluation.impact_score} />
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">The Feedback</h4>
                                    <div className="text-slate-300 prose prose-invert text-sm leading-relaxed">
                                        <ReactMarkdown>{evaluation.feedback}</ReactMarkdown>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Strategy Tip</h4>
                                    <div className="text-slate-300 prose prose-invert text-sm leading-relaxed">
                                        <ReactMarkdown>{evaluation.improvement_tip}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>

                            {/* Probing Follow-up */}
                            <div className="mt-12 pt-8 border-t border-slate-800">
                                <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-[24px]">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3">Deep-Dive Question</h4>
                                    <p className="text-white text-lg font-medium italic">"{evaluation.follow_up_question}"</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}