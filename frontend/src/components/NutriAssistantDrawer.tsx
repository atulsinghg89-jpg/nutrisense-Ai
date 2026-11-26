import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { askNutriAssistant } from "../lib/api";
import type {
  ChatMessage,
  DailyMacroTargets,
  DashboardSummary,
  ScanSession,
} from "../types/nutrition";
import { EASE_PREMIUM } from "./MotionPrimitives";

interface NutriAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  todaySummary: DashboardSummary;
  dailyTargets: DailyMacroTargets;
  scanSession: ScanSession | null;
}

const EXAMPLE_QUESTIONS = [
  "What should I eat for breakfast?",
  "How can I increase protein?",
  "Suggest a healthy dinner.",
  "Explain my daily nutrition.",
];

export function NutriAssistantDrawer({
  open,
  onClose,
  todaySummary,
  dailyTargets,
  scanSession,
}: NutriAssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Nutri AI. Ask me about meal ideas, protein targets, Indian home-cooked balanced plates, or your logged nutrition today.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function sendQuestion(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const recentMeals = scanSession?.items.map((i) => i.name).slice(0, 5) ?? [];
      const res = await askNutriAssistant({
        message: trimmed,
        history: nextHistory
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content })),
        nutrition_context: {
          today_calories: todaySummary.total_calories,
          today_protein: todaySummary.total_protein,
          today_carbs: todaySummary.total_carbs,
          today_fats: todaySummary.total_fats,
          target_calories: dailyTargets.calories,
          target_protein: dailyTargets.protein,
          target_carbs: dailyTargets.carbs,
          target_fats: dailyTargets.fats,
          recent_meals: recentMeals,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-ai`,
          role: "assistant",
          content: res.reply,
          timestamp: new Date().toISOString(),
          modelUsed: res.model_used,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach Nutri AI backend right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
          />

          {/* Slide-over Assistant Panel */}
          <motion.aside
            role="dialog"
            aria-label="Nutri AI Assistant"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: EASE_PREMIUM }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/[0.1] bg-[#0A0A0A] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#121212] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#A3FF12]/35 bg-[#A3FF12]/15 text-[#A3FF12]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Nutri AI Assistant
                  </h2>
                  <p className="text-[11px] text-[#34D399]">
                    Gemini Nutrition Companion • Real Macro Context
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMessages((prev) => prev.slice(0, 1));
                    setError(null);
                  }}
                  title="Clear chat"
                  className="rounded-lg border border-white/[0.08] p-2 text-zinc-400 transition hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Nutri AI Assistant"
                  className="rounded-lg border border-white/[0.08] p-2 text-zinc-400 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Live Context Pill */}
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#121212]/60 px-5 py-2 font-mono text-[11px] text-[#A1A1AA]">
              <span>
                Today: {Math.round(todaySummary.total_calories)} / {dailyTargets.calories} kcal
              </span>
              <span className="text-[#34D399]">
                P {todaySummary.total_protein.toFixed(0)}g / {dailyTargets.protein}g
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-[#A3FF12] font-medium text-[#0A0A0A]"
                          : "border border-white/[0.08] bg-[#121212] text-zinc-200"
                      }`}
                    >
                      {msg.content}
                      {msg.modelUsed && (
                        <p className="mt-2 font-mono text-[10px] text-zinc-500">
                          via {msg.modelUsed}
                        </p>
                      )}
                    </div>
                    {isUser && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#171717] text-white">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2.5 text-xs text-[#34D399]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Nutri AI is thinking...</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}
              <div ref={scrollEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="border-t border-white/[0.06] bg-[#121212]/60 px-5 pt-3 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={loading}
                    onClick={() => void sendQuestion(q)}
                    className="rounded-full border border-white/10 bg-[#171717] px-3 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-[#A3FF12]/50 hover:text-[#A3FF12] disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendQuestion(input);
              }}
              className="border-t border-white/[0.08] bg-[#121212] p-4"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about meals, protein, or calories..."
                  className="flex-1 rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#A3FF12]/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#A3FF12] text-[#0A0A0A] transition hover:bg-[#b5ff3b] disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-zinc-500">
                Educational guidance only — not medical advice.
              </p>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
