"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

// Match the database response structure
interface Attempt {
    id: number;
    created_at: string;
    user_response: string;
    overall_score: number;
    ai_feedback: {
        clarity_score: number;
        star_method_score: number;
        impact_score: number;
        feedback: string;
        improvement_tip: string;
        follow_up_question?: string; // Optional for backwards compatibility with older DB entries
    };
}

export default function HistoryDashboard() {
    const [history, setHistory] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/v1/history");
                if (!res.ok) throw new Error("Failed to fetch history from the backend.");

                const data = await res.json();
                setHistory(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
                <p className="text-xl font-semibold text-slate-500 animate-pulse">Loading your interview history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
                <p className="text-red-500 font-medium bg-red-50 p-4 rounded-xl border border-red-200">⚠️ {error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 font-sans">
            <main className="max-w-5xl mx-auto px-6">

                {/* Header Section */}
                <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Interview History</h1>
                        <p className="text-lg text-slate-500">Review your past attempts and track your progress.</p>
                    </div>
                    <Link href="/" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold transition-colors flex items-center gap-2">
                        ← Back to Simulator
                    </Link>
                </header>

                {/* Empty State */}
                {history.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
                        <p className="text-xl text-slate-500 font-medium">No attempts found yet. Time to start practicing!</p>
                    </div>
                ) : (
                    /* History Feed */
                    <div className="space-y-6">
                        {history.map((attempt) => (
                            <div key={attempt.id} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">

                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attempt #{attempt.id}</span>
                                        <p className="text-sm text-slate-500 mt-1 font-medium">
                                            {new Date(attempt.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`px-5 py-2 rounded-xl font-bold text-lg border ${attempt.overall_score >= 4 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        attempt.overall_score === 3 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                        Score: {attempt.overall_score}/5
                                    </div>
                                </div>

                                {/* Response Snippet (Now fully visible!) */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Your Answer</h3>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-slate-700 italic whitespace-pre-wrap">"{attempt.user_response}"</p>
                                    </div>
                                </div>

                                {/* Feedback Blocks */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">📝 AI Feedback</h4>
                                        <div className="text-sm text-slate-700 prose prose-sm max-w-none">
                                            <ReactMarkdown>{attempt.ai_feedback.feedback}</ReactMarkdown>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">💡 Top Tip</h4>
                                        <div className="text-sm text-blue-900 prose prose-sm max-w-none">
                                            <ReactMarkdown>{attempt.ai_feedback.improvement_tip}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Follow-Up Question */}
                                {attempt.ai_feedback.follow_up_question && attempt.ai_feedback.follow_up_question !== "N/A" && (
                                    <div className="mt-4 bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm">
                                        <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            🎤 Manager's Follow-Up Question
                                        </h4>
                                        <p className="text-sm text-indigo-900 leading-relaxed font-medium italic">
                                            "{attempt.ai_feedback.follow_up_question}"
                                        </p>
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