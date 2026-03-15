"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

// ──────────────────────────────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────────────────────────────

interface FollowUpExchange {
    turn_number: number;
    ai_question: string;
    user_response: string;
    feedback: string;
    score: number | null;
    is_final: boolean;
}

interface Attempt {
    id: number;
    created_at: string;
    question_text: string;
    user_response: string;
    overall_score: number;
    clarity_score: number;
    star_method_score: number;
    impact_score: number;
    feedback: string;
    improvement_tip: string;
    follow_up_question: string;
    follow_ups: FollowUpExchange[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ──────────────────────────────────────────────────────────────
// Skeleton Card (replaces plain "Loading..." text)
// ──────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-pulse">
            {/* Header row */}
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                <div className="space-y-2 flex-1 mr-4">
                    <div className="flex gap-3">
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                        <div className="h-3 w-16 bg-slate-100 rounded" />
                    </div>
                    <div className="h-5 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3 w-32 bg-slate-100 rounded" />
                </div>
                <div className="h-10 w-24 bg-slate-100 rounded-xl shrink-0" />
            </div>
            {/* "Your Answer" block */}
            <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 mb-6">
                <div className="h-3 w-full bg-slate-200 rounded" />
                <div className="h-3 w-5/6 bg-slate-200 rounded" />
                <div className="h-3 w-3/4 bg-slate-200 rounded" />
            </div>
            {/* Feedback grid */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl border border-slate-200 space-y-2">
                    <div className="h-3 w-16 bg-slate-200 rounded" />
                    <div className="h-3 w-full bg-slate-100 rounded" />
                    <div className="h-3 w-4/5 bg-slate-100 rounded" />
                </div>
                <div className="p-5 rounded-xl border border-blue-100 bg-blue-50 space-y-2">
                    <div className="h-3 w-16 bg-blue-100 rounded" />
                    <div className="h-3 w-full bg-blue-100 rounded" />
                    <div className="h-3 w-3/4 bg-blue-100 rounded" />
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────
// Score badge helper
// ──────────────────────────────────────────────────────────────

function scoreBadgeClass(score: number) {
    if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
}

function followUpScoreClass(score: number) {
    if (score >= 80) return "bg-emerald-100 text-emerald-700";
    if (score >= 60) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
}

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────

export default function HistoryDashboard() {
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const [history, setHistory] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set());

    const toggleThread = (id: number) => {
        setExpandedThreads((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this attempt? This cannot be undone.")) return;

        setDeletingId(id);
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/api/v1/history/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to delete the attempt.");
            setHistory((prev) => prev.filter((item) => item.id !== id));
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        const fetchHistory = async () => {
            if (!isLoaded || !isSignedIn) return;
            try {
                const token = await getToken();
                const res = await fetch(`${API_BASE}/api/v1/history`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Failed to fetch history.");
                const data = await res.json();
                setHistory(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [isLoaded, isSignedIn, getToken]);

    // ── Loading state: skeleton cards ─────────────────────────
    if (!isLoaded || loading) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 font-sans">
                <main className="max-w-5xl mx-auto px-6">
                    <header className="mb-10 border-b border-slate-200 pb-6">
                        <div className="h-10 w-52 bg-slate-200 rounded-xl animate-pulse mb-3" />
                        <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
                    </header>
                    <div className="space-y-6">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                </main>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
                <p className="text-slate-500 font-medium">Please sign in to view your history.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 font-sans">
            <main className="max-w-5xl mx-auto px-6">
                <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                            Interview History
                        </h1>
                        <p className="text-lg text-slate-500">Track your progress and review AI insights.</p>
                    </div>
                    <Link
                        href="/"
                        className="text-blue-600 hover:text-blue-800 hover:underline font-semibold transition-colors flex items-center gap-2"
                    >
                        ← Back to Simulator
                    </Link>
                </header>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
                        ⚠️ {error}
                    </div>
                )}

                {history.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
                        <p className="text-xl text-slate-500 font-medium">No attempts found yet.</p>
                        <Link
                            href="/"
                            className="mt-4 inline-block text-indigo-600 font-bold hover:underline"
                        >
                            Start your first interview →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {history.map((attempt) => (
                            <div
                                key={attempt.id}
                                className={`bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md ${deletingId === attempt.id ? "opacity-50 grayscale" : ""
                                    }`}
                            >
                                {/* ── Card Header ── */}
                                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                                    <div className="flex-grow">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                Attempt #{attempt.id}
                                            </span>

                                            {attempt.follow_ups && attempt.follow_ups.length > 0 && (
                                                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    {attempt.follow_ups.length} follow-up{attempt.follow_ups.length !== 1 ? "s" : ""}
                                                </span>
                                            )}

                                            {/* UX Fix J: Retake This Question button */}
                                            <Link
                                                href={`/?q=${encodeURIComponent(attempt.question_text)}`}
                                                aria-label="Retake this question in the simulator"
                                                className="text-[10px] font-black text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded uppercase hover:bg-indigo-600 hover:text-white transition-all"
                                            >
                                                ↩ Retake
                                            </Link>

                                            <button
                                                onClick={() => handleDelete(attempt.id)}
                                                disabled={deletingId === attempt.id}
                                                aria-label={`Delete attempt #${attempt.id}`}
                                                className="text-[10px] font-black text-rose-500 border border-rose-200 px-2 py-0.5 rounded uppercase hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                                            >
                                                {deletingId === attempt.id ? "Deleting..." : "Delete"}
                                            </button>
                                        </div>
                                        <h2 className="text-lg font-bold text-slate-800">{attempt.question_text}</h2>
                                        <p className="text-sm text-slate-500 font-medium">
                                            {new Date(attempt.created_at).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className={`px-5 py-2 rounded-xl font-bold text-lg border shrink-0 ml-4 ${scoreBadgeClass(attempt.overall_score)}`}>
                                        Score: {attempt.overall_score}%
                                    </div>
                                </div>

                                {/* ── Your Answer ── */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Your Answer
                                    </h3>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-slate-700 italic whitespace-pre-wrap">"{attempt.user_response}"</p>
                                    </div>
                                </div>

                                {/* ── Score breakdown (sub-scores) ── */}
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    {[
                                        { label: "Clarity", score: attempt.clarity_score },
                                        { label: "STAR", score: attempt.star_method_score },
                                        { label: "Impact", score: attempt.impact_score },
                                    ].map(({ label, score }) => (
                                        <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                            <p className={`text-sm font-black ${score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                                                {score}/100
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* ── AI Feedback + Tip ── */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                            📝 AI Feedback
                                        </h4>
                                        <div className="text-sm text-slate-700 prose prose-sm max-w-none">
                                            <ReactMarkdown>{attempt.feedback}</ReactMarkdown>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">
                                            💡 Top Tip
                                        </h4>
                                        <div className="text-sm text-blue-900 prose prose-sm max-w-none">
                                            <ReactMarkdown>{attempt.improvement_tip}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Manager's Follow-Up Question ── */}
                                {attempt.follow_up_question && (
                                    <div className="mt-4 bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm">
                                        <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">
                                            🎤 Manager&apos;s Follow-Up Question
                                        </h4>
                                        <p className="text-sm text-indigo-900 leading-relaxed font-medium italic">
                                            "{attempt.follow_up_question}"
                                        </p>
                                    </div>
                                )}

                                {/* ── Follow-Up Conversation Thread ── */}
                                {attempt.follow_ups && attempt.follow_ups.length > 0 && (
                                    <div className="mt-4">
                                        <button
                                            onClick={() => toggleThread(attempt.id)}
                                            aria-expanded={expandedThreads.has(attempt.id)}
                                            aria-controls={`thread-${attempt.id}`}
                                            className="flex items-center gap-2 text-xs font-black text-violet-600 uppercase tracking-widest hover:text-violet-800 transition-colors py-2"
                                        >
                                            <span className={`transition-transform ${expandedThreads.has(attempt.id) ? "rotate-90" : ""}`}>
                                                ▶
                                            </span>
                                            View Conversation Thread ({attempt.follow_ups.length} round{attempt.follow_ups.length !== 1 ? "s" : ""})
                                        </button>

                                        {expandedThreads.has(attempt.id) && (
                                            <div
                                                id={`thread-${attempt.id}`}
                                                className="mt-3 space-y-3 pl-4 border-l-2 border-violet-200 animate-in fade-in slide-in-from-top-4 duration-300"
                                            >
                                                {attempt.follow_ups.map((fu) => (
                                                    <div key={fu.turn_number} className="relative">
                                                        <div className="absolute left-[-13px] top-2 h-2.5 w-2.5 rounded-full bg-violet-500 border-2 border-white" />

                                                        <div className="bg-violet-50 p-4 rounded-xl border border-violet-100">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">
                                                                    Follow-Up #{fu.turn_number}
                                                                </span>
                                                                {fu.is_final && fu.score !== null && (
                                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${followUpScoreClass(fu.score)}`}>
                                                                        Final: {fu.score}%
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="text-sm text-violet-900 font-medium italic mb-2">
                                                                Q: "{fu.ai_question}"
                                                            </p>

                                                            <div className="bg-white/60 p-3 rounded-lg mb-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    Your Answer
                                                                </span>
                                                                <p className="text-sm text-slate-700 mt-1">{fu.user_response}</p>
                                                            </div>

                                                            <div className="text-sm text-violet-800 prose prose-sm max-w-none">
                                                                <ReactMarkdown>{fu.feedback}</ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}