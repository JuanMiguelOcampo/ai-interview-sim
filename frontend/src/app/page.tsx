"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

// ──────────────────────────────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────────────────────────────

interface Evaluation {
    clarity_score: number;
    star_method_score: number;
    impact_score: number;
    overall_score: number;
    feedback: string;
    improvement_tip: string;
    follow_up_question: string;
    session_id: number;
}

interface FollowUpTurn {
    ai_question: string;
    user_response: string;
    feedback: string;
    score: number | null;
    is_final: boolean;
    turn_number: number;
}

// ──────────────────────────────────────────────────────────────
// Constants & Tracks
// ──────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const INTERVIEW_TRACKS = {
    "Behavioral": [
        "Tell me about a time you had to manage conflicting priorities on a technical project.",
        "Describe a situation where you had to learn a new technology or tool quickly.",
        "Tell me about a time you disagreed with a team member. How did you resolve it?",
        "Describe your most challenging technical project. What made it difficult?",
        "Tell me about a time you failed or made a significant mistake. What did you learn?"
    ],
    "Computer Engineering": [
        "Walk me through how you would design a system that integrates a microcontroller, like an Arduino, with an FPGA.",
        "Describe a time you had to troubleshoot a complex timing issue in VHDL or Verilog. What was your approach?",
        "Explain the process of handling hardware interrupts on a microprocessor architecture like the 8086.",
        "Tell me about a time you had to optimize assembly code for a system with strict memory or performance constraints."
    ],
    "Technopreneurship & Product": [
        "Pitch a technical solution for a real-world logistics problem, such as a real-time fleet management system. How do you assess its market feasibility?",
        "Tell me about a time you had to define the scope, timeline, and Gantt chart for a new software product.",
        "If you were leading a team to build an AI-powered educational tool, how would you prioritize which features to build first for the prototype?"
    ],
    "Data & AI": [
        "Describe your process for building a custom dataset from scratch, such as capturing specific visual frames or micro-expressions.",
        "How do you ensure data quality and handle edge cases when training a machine learning model on a small dataset?"
    ]
};

type TrackName = keyof typeof INTERVIEW_TRACKS;
const TRACK_NAMES = Object.keys(INTERVIEW_TRACKS) as TrackName[];
const MAX_FOLLOW_UP_TURNS = 3;

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

function ScoreCard({ title, score }: { title: string; score: number }) {
    const getColor = (s: number) => {
        if (s >= 80) return "text-emerald-600 border-emerald-100 bg-emerald-50/50";
        if (s >= 60) return "text-amber-600 border-amber-100 bg-amber-50/50";
        return "text-rose-600 border-rose-100 bg-rose-50/50";
    };

    return (
        <div className={`p-4 rounded-2xl border backdrop-blur-sm transition-all hover:scale-105 flex flex-col items-center justify-center ${getColor(score)}`}>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1 opacity-70">{title}</span>
            <span className="text-2xl font-black">{score}<span className="text-sm opacity-40">/100</span></span>
        </div>
    );
}

/** Shimmer placeholder shown during AI analysis loading */
function ScoreCardSkeleton() {
    return (
        <div className="p-4 rounded-2xl border border-slate-700/30 bg-slate-800/40 flex flex-col items-center justify-center gap-2 animate-pulse">
            <div className="h-2 w-14 rounded-full bg-slate-700/60" />
            <div className="h-7 w-10 rounded bg-slate-700/60" />
        </div>
    );
}

/** Full loading shimmer shown in place of the Performance Report */
function AnalysisLoadingSkeleton() {
    return (
        <div className="bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-2xl overflow-hidden relative animate-pulse">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
            {/* Title */}
            <div className="h-8 w-52 bg-slate-700/60 rounded-xl mb-10" />
            {/* Score grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {[...Array(4)].map((_, i) => <ScoreCardSkeleton key={i} />)}
            </div>
            {/* Feedback lines */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <div className="h-2.5 w-20 bg-slate-700/60 rounded" />
                    <div className="h-3 w-full bg-slate-700/40 rounded" />
                    <div className="h-3 w-5/6 bg-slate-700/40 rounded" />
                    <div className="h-3 w-4/6 bg-slate-700/40 rounded" />
                </div>
                <div className="space-y-3">
                    <div className="h-2.5 w-24 bg-slate-700/60 rounded" />
                    <div className="h-3 w-full bg-slate-700/40 rounded" />
                    <div className="h-3 w-3/4 bg-slate-700/40 rounded" />
                </div>
            </div>
        </div>
    );
}

function ConversationThread({ turns }: { turns: FollowUpTurn[] }) {
    if (turns.length === 0) return null;

    return (
        <div className="mt-8 space-y-4">
            <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-violet-400 rounded-full animate-pulse" />
                Conversation Thread
            </h4>
            {turns.map((turn) => (
                <div key={turn.turn_number} className="relative pl-6 border-l-2 border-slate-700/50">
                    <div className="absolute left-[-7px] top-0 h-3 w-3 rounded-full bg-indigo-500 border-2 border-slate-900" />

                    <div className="mb-3">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            Follow-Up #{turn.turn_number}
                        </span>
                        <p className="text-white text-sm font-medium italic mt-1">"{turn.ai_question}"</p>
                    </div>

                    <div className="bg-slate-800/60 rounded-xl p-4 mb-3 border border-slate-700/50">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Your Answer</span>
                        <p className="text-slate-300 text-sm mt-1">{turn.user_response}</p>
                    </div>

                    <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Feedback</span>
                        <div className="text-slate-300 prose prose-invert text-sm mt-1 leading-relaxed">
                            <ReactMarkdown>{turn.feedback}</ReactMarkdown>
                        </div>
                        {turn.is_final && turn.score !== null && (
                            <div className="mt-3 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Final Score</span>
                                <span className="text-emerald-400 font-black text-lg">{turn.score}/100</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

/** "Copy Feedback" clipboard button — shows ✓ for 2s after copying */
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for browsers without clipboard API
            const el = document.createElement("textarea");
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <button
            onClick={handleCopy}
            title="Copy AI feedback to clipboard"
            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all px-3 py-1.5 rounded-lg border ${copied
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                : "text-slate-500 border-slate-700/50 bg-slate-800/40 hover:text-slate-300 hover:border-slate-600"
                }`}
        >
            {copied ? "✓ Copied!" : "⎘ Copy Feedback"}
        </button>
    );
}

// ──────────────────────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────────────────────

export default function InterviewSimulator() {
    const { getToken, userId } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Derive initial question & track — supports ?q= from the Retake button on history page
    const retakeQuestion = searchParams.get("q");

    let initialTrack: TrackName = "Behavioral";
    let initialIndex = 0;

    if (retakeQuestion) {
        for (const track of TRACK_NAMES) {
            const index = INTERVIEW_TRACKS[track].indexOf(retakeQuestion);
            if (index !== -1) {
                initialTrack = track;
                initialIndex = index;
                break;
            }
        }
    }

    const [response, setResponse] = useState("");
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const [activeTrack, setActiveTrack] = useState<TrackName>(initialTrack);
    const [questionIndex, setQuestionIndex] = useState(initialIndex);
    const currentQuestion = INTERVIEW_TRACKS[activeTrack][questionIndex];

    // Follow-up conversation state
    const [followUpMode, setFollowUpMode] = useState(false);
    const [followUpQuestion, setFollowUpQuestion] = useState("");
    const [followUpResponse, setFollowUpResponse] = useState("");
    const [followUpHistory, setFollowUpHistory] = useState<FollowUpTurn[]>([]);
    const [followUpLoading, setFollowUpLoading] = useState(false);
    const [conversationFinalized, setConversationFinalized] = useState(false);
    const followUpInputRef = useRef<HTMLTextAreaElement>(null);

    // If the page is opened with a ?q= param, reset it from the URL cleanly
    useEffect(() => {
        if (retakeQuestion) {
            router.replace("/", { scroll: false });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.onresult = (event: any) => {
                    let text = "";
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) text += event.results[i][0].transcript + " ";
                    }
                    if (text) {
                        if (followUpMode) setFollowUpResponse((prev) => prev + text);
                        else setResponse((prev) => prev + text);
                    }
                };
                recognitionRef.current.onend = () => setIsListening(false);
            }
        }
    }, [followUpMode]);

    const toggleListening = () => {
        if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
        else { recognitionRef.current?.start(); setIsListening(true); }
    };

    const resetConversationState = useCallback(() => {
        setFollowUpMode(false);
        setFollowUpQuestion("");
        setFollowUpResponse("");
        setFollowUpHistory([]);
        setConversationFinalized(false);
    }, []);

    const handleShuffle = () => {
        setQuestionIndex((prev) => (prev + 1) % INTERVIEW_TRACKS[activeTrack].length);
        setResponse("");
        setEvaluation(null);
        setError("");
        resetConversationState();
    };

    // ── Initial Evaluation Submit ─────────────────────────────
    const handleSubmit = async () => {
        if (isListening) toggleListening();

        if (!userId) {
            setError("Authentication required. Please sign in to analyze your response.");
            return;
        }
        if (response.trim().length < 20) {
            setError("Response too short. Aim for at least 20 characters.");
            return;
        }

        setLoading(true);
        setError("");
        setEvaluation(null);
        resetConversationState();

        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/api/v1/evaluate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    question_id: questionIndex + 1,
                    question_text: currentQuestion,
                    user_response: response,
                }),
            });

            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const data = await res.json();
            setEvaluation(data);
        } catch {
            setError("Server connection failed. Make sure your backend is running.");
        } finally {
            setLoading(false);
        }
    };

    // ── Follow-Up Conversation Submit ─────────────────────────
    const handleFollowUpSubmit = async () => {
        if (isListening) toggleListening();
        if (!evaluation) return;

        if (followUpResponse.trim().length < 5) {
            setError("Follow-up response too short. Please elaborate.");
            return;
        }

        setFollowUpLoading(true);
        setError("");

        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/api/v1/evaluate/follow-up`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    session_id: evaluation.session_id,
                    follow_up_question: followUpQuestion,
                    user_response: followUpResponse,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error((errData as any).detail || `Server returned ${res.status}`);
            }

            const data = await res.json();

            const newTurn: FollowUpTurn = {
                ai_question: followUpQuestion,
                user_response: followUpResponse,
                feedback: data.feedback,
                score: data.score,
                is_final: data.is_final,
                turn_number: data.turn_number,
            };

            setFollowUpHistory((prev) => [...prev, newTurn]);
            setFollowUpResponse("");

            if (data.is_final) {
                setConversationFinalized(true);
                setFollowUpMode(false);
                setFollowUpQuestion("");
            } else {
                setFollowUpQuestion(data.next_question);
            }
        } catch (err: any) {
            setError(err.message || "Failed to submit follow-up. Please try again.");
        } finally {
            setFollowUpLoading(false);
        }
    };

    const handleStartFollowUp = () => {
        if (!evaluation) return;
        setFollowUpMode(true);
        setFollowUpQuestion(evaluation.follow_up_question);
        setFollowUpResponse("");
        setTimeout(() => followUpInputRef.current?.focus(), 100);
    };

    const turnsRemaining = MAX_FOLLOW_UP_TURNS - followUpHistory.length;

    // Build the text to copy — main feedback + improvement tip
    const copyText = evaluation
        ? `AI Feedback:\n${evaluation.feedback}\n\nStrategy Tip:\n${evaluation.improvement_tip}`
        : "";

    return (
        <div className="relative min-h-screen bg-[#F8FAFC] overflow-hidden selection:bg-indigo-100">
            {/* Soft Ambient Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none" />

            <main className="relative z-10 max-w-4xl mx-auto px-6 py-16">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                    <div className="text-center md:text-left">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">
                            Prep<span className="text-indigo-600">AI</span>
                        </h1>
                        <p className="text-slate-500 font-medium">Elevate your interview game with intelligent feedback.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/history"
                            className="group flex items-center gap-2 bg-white text-slate-600 font-bold px-6 py-3 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all active:scale-95"
                        >
                            <span className="text-indigo-500 group-hover:rotate-12 transition-transform">📊</span>
                            History
                        </Link>

                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl shadow-sm hover:bg-indigo-500 transition-all active:scale-95">
                                    Sign In
                                </button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm">
                                <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-10 h-10" } }} />
                            </div>
                        </SignedIn>
                    </div>
                </header>

                {/* Question Card */}
                <section className="bg-white/80 backdrop-blur-md border border-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 mb-8 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active Challenge</span>
                        </div>

                        {/* Track Selector Dropdown */}
                        <select
                            value={activeTrack}
                            onChange={(e) => {
                                setActiveTrack(e.target.value as TrackName);
                                setQuestionIndex(0);
                                setResponse("");
                                setEvaluation(null);
                                resetConversationState();
                            }}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            {TRACK_NAMES.map(track => (
                                <option key={track} value={track}>{track} Track</option>
                            ))}
                        </select>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 leading-snug mb-6">{currentQuestion}</h2>
                    <button
                        onClick={handleShuffle}
                        className="text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest"
                    >
                        Shuffle Question →
                    </button>
                </section>

                {/* Initial Response Input */}
                {!followUpMode && (
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
                                aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${isListening
                                    ? "bg-rose-500 text-white shadow-lg shadow-rose-200"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                    }`}
                            >
                                <span className={isListening ? "animate-spin" : ""}>
                                    {isListening ? "●" : "🎤"}
                                </span>
                                {isListening ? "Recording Voice..." : "Voice Input"}
                            </button>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {response.length} characters
                            </span>
                        </div>
                    </section>
                )}

                {/* Action Row */}
                {!followUpMode && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !response}
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-5 rounded-[20px] shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0"
                        >
                            {loading ? "Analyzing..." : (!userId ? "Sign in to Analyze" : "Get AI Analysis")}
                        </button>
                        {error && <p className="text-rose-500 font-bold text-sm bg-rose-50 px-4 py-2 rounded-lg">⚠️ {error}</p>}
                    </div>
                )}

                {/* ── AI Analysis Loading Shimmer ── */}
                {loading && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <AnalysisLoadingSkeleton />
                    </div>
                )}

                {/* ── Performance Report + Conversational Loop ── */}
                {!loading && evaluation && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Report header with clipboard button */}
                            <div className="flex items-center justify-between mb-10">
                                <h2 className="text-white text-3xl font-black flex items-center gap-3">
                                    <span className="text-indigo-400 italic">#</span> Performance Report
                                </h2>
                                <CopyButton text={copyText} />
                            </div>

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

                            {/* Conversation thread (previous turns) */}
                            <ConversationThread turns={followUpHistory} />

                            {/* Follow-Up Section */}
                            <div className="mt-12 pt-8 border-t border-slate-800">
                                {conversationFinalized ? (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[24px] text-center">
                                        <div className="text-emerald-400 text-4xl mb-3">✓</div>
                                        <h4 className="text-emerald-400 font-black text-lg mb-2">Deep-Dive Complete</h4>
                                        <p className="text-slate-400 text-sm mb-6">
                                            You&apos;ve completed {followUpHistory.length} follow-up round{followUpHistory.length !== 1 ? "s" : ""}. Ready for the next challenge?
                                        </p>
                                        <button
                                            onClick={handleShuffle}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 py-3 rounded-xl transition-all active:scale-95"
                                        >
                                            Next Question →
                                        </button>
                                    </div>
                                ) : followUpMode ? (
                                    <div className="space-y-4">
                                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-[24px]">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                                                    Follow-Up #{followUpHistory.length + 1}
                                                </h4>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                    {turnsRemaining} turn{turnsRemaining !== 1 ? "s" : ""} remaining
                                                </span>
                                            </div>
                                            <p className="text-white text-lg font-medium italic mb-6">"{followUpQuestion}"</p>

                                            <div className="relative">
                                                <textarea
                                                    ref={followUpInputRef}
                                                    className="w-full h-32 p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-200 text-sm outline-none resize-none placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                                    placeholder="Answer the follow-up question..."
                                                    value={followUpResponse}
                                                    onChange={(e) => setFollowUpResponse(e.target.value)}
                                                />
                                                <div className="flex justify-between items-center mt-3">
                                                    <button
                                                        onClick={toggleListening}
                                                        aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${isListening
                                                            ? "bg-rose-500 text-white"
                                                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                                                            }`}
                                                    >
                                                        <span className={isListening ? "animate-spin" : ""}>
                                                            {isListening ? "●" : "🎤"}
                                                        </span>
                                                        {isListening ? "Recording..." : "Voice"}
                                                    </button>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => { setFollowUpMode(false); setFollowUpResponse(""); }}
                                                            className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors px-4 py-2"
                                                        >
                                                            Skip
                                                        </button>
                                                        <button
                                                            onClick={handleFollowUpSubmit}
                                                            disabled={followUpLoading || followUpResponse.trim().length < 5}
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm"
                                                        >
                                                            {followUpLoading ? "Evaluating..." : "Submit Answer"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {error && (
                                            <p className="text-rose-400 font-bold text-sm bg-rose-500/10 px-4 py-2 rounded-lg">
                                                ⚠️ {error}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-[24px]">
                                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3">
                                            Deep-Dive Question
                                        </h4>
                                        <p className="text-white text-lg font-medium italic mb-6">
                                            "{evaluation.follow_up_question}"
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleStartFollowUp}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-xl transition-all active:scale-95 text-sm shadow-lg shadow-indigo-500/20"
                                            >
                                                🎯 Answer Follow-Up
                                            </button>
                                            <button
                                                onClick={handleShuffle}
                                                className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors px-4 py-3"
                                            >
                                                Skip to Next Question →
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}