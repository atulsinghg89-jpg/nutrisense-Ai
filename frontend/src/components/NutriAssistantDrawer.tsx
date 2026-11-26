import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { askNutriAssistant } from "../lib/api";
import type {
  AppView,
  ChatMessage,
  DailyMacroTargets,
  DashboardSummary,
  ScanSession,
} from "../types/nutrition";
import { EASE_PREMIUM } from "./MotionPrimitives";

interface NutriAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (view: AppView) => void;
  todaySummary: DashboardSummary;
  dailyTargets: DailyMacroTargets;
  scanSession: ScanSession | null;
}

const EXAMPLE_QUESTIONS = [
  "What should I eat for breakfast?",
  "How can I increase protein on a ₹100 Indian budget?",
  "Suggest a light healthy Indian dinner.",
  "Explain my daily nutrition progress.",
];

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function renderFormattedReply(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    const formatted = parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });

    if (trimmed.startsWith("### ")) {
      return (
        <p key={i} className="mt-2 font-display text-sm font-bold text-[#B6FF38]">
          {trimmed.slice(4)}
        </p>
      );
    }
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      return (
        <div key={i} className="flex items-start gap-2 pl-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#34D399]" />
          <span>{formatted.slice(0)}</span>
        </div>
      );
    }
    return <p key={i}>{formatted}</p>;
  });
}

export function NutriAssistantDrawer({
  open,
  onClose,
  onNavigate,
  todaySummary,
  dailyTargets,
  scanSession,
}: NutriAssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Nutri AI. Ask me about Indian breakfast ideas, high-protein vegetarian swaps, budget nutrition, or your logged nutrition today.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  const speechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (open) {
      scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function toggleVoiceInput() {
    if (!speechSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechCtor) return;

    const rec = new SpeechCtor();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-label="Nutri AI Coach"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: EASE_PREMIUM }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-[#080B09] shadow-2xl"
          >
            {/* Header with Animated AI Orb Indicator */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#101713] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#B6FF38]/40 bg-[#B6FF38]/15 text-[#B6FF38]">
                  <motion.span
                    animate={{ scale: [1, 1.35, 1], opacity: [0.45, 0, 0.45] }}
                    transition={{ duration: 2.6, repeat: Infinity }}
                    className="absolute inset-0 rounded-xl border border-[#B6FF38]/50"
                  />
                  <Sparkles className="relative h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Nutri AI Coach
                  </h2>
                  <p className="text-[11px] text-[#34D399]">
                    Gemini Nutrition Companion • Real Context Synced
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
                  className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Nutri AI Coach"
                  className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Live Context + Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-[#141B16]/70 px-5 py-2 font-mono text-[11px] text-[#A3ADA6]">
              <span>
                Today: {Math.round(todaySummary.total_calories)} / {dailyTargets.calories} kcal
              </span>
              {onNavigate && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate("scanner");
                    }}
                    className="text-[#B6FF38] hover:underline"
                  >
                    Scan Meal
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate("budget");
                    }}
                    className="text-[#34D399] hover:underline"
                  >
                    Budget Plans
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] space-y-1 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? "bg-[#B6FF38] font-medium text-[#080B09]"
                          : "border border-white/10 bg-[#141B16] text-zinc-200"
                      }`}
                    >
                      {isUser ? msg.content : renderFormattedReply(msg.content)}
                      {msg.modelUsed && (
                        <p className="pt-1.5 font-mono text-[10px] text-zinc-500">
                          via {msg.modelUsed}
                        </p>
                      )}
                    </div>
                    {isUser && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#19221C] text-white">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2.5 text-xs text-[#34D399]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Nutri AI is analyzing your context...</span>
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

            {/* Suggested Prompt Cards */}
            <div className="border-t border-white/[0.06] bg-[#101713] px-5 pt-3 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={loading}
                    onClick={() => void sendQuestion(q)}
                    className="rounded-full border border-white/10 bg-[#141B16] px-3 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-[#B6FF38]/50 hover:text-[#B6FF38] disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form + Voice Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendQuestion(input);
              }}
              className="border-t border-white/10 bg-[#141B16] p-4"
            >
              <div className="flex items-center gap-2">
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    aria-label={listening ? "Stop voice input" : "Start voice input"}
                    title={listening ? "Listening..." : "Speak question"}
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                      listening
                        ? "border-[#B6FF38] bg-[#B6FF38]/20 text-[#B6FF38]"
                        : "border-white/10 bg-[#080B09] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {listening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                )}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about Indian meals, protein, or macros..."
                  className="flex-1 rounded-xl border border-white/10 bg-[#080B09] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#B6FF38]/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B6FF38] text-[#080B09] transition hover:bg-[#c8ff66] disabled:opacity-40"
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
