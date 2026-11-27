import { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  fetchEducationProgress,
  fetchGlobalEducation,
  saveEducationProgress,
} from "../../lib/api";
import type {
  FoodEducationProgressEntry,
  FoodEducationTopic,
} from "../../types/nutrition";

interface FoodEducationCenterProps {
  profileId: number | null;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onNotify: (msg: string) => void;
}

export function FoodEducationCenter({
  profileId,
  isAuthenticated,
  onOpenAuth,
  onNotify,
}: FoodEducationCenterProps) {
  const [topics, setTopics] = useState<FoodEducationTopic[]>([]);
  const [progress, setProgress] = useState<Record<string, FoodEducationProgressEntry>>({});
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchGlobalEducation()
      .then((res) => {
        if (!active) return;
        setTopics(res.topics);
        if (res.topics[0]) setSelectedSlug(res.topics[0].slug);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !profileId) {
      setProgress({});
      return;
    }
    let active = true;
    fetchEducationProgress(profileId)
      .then((rows) => {
        if (!active) return;
        const map: Record<string, FoodEducationProgressEntry> = {};
        for (const r of rows) {
          map[r.topic_slug] = r;
        }
        setProgress(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAuthenticated, profileId]);

  const activeTopic =
    topics.find((t) => t.slug === selectedSlug) ?? topics[0];

  const completedCount = Object.values(progress).filter((p) => p.completed).length;

  async function handleSubmitQuiz() {
    if (!activeTopic) return;
    if (quizAnswer === null) return;
    const isCorrect = quizAnswer === activeTopic.correct_index;
    const score = isCorrect ? 1 : 0;

    if (!isAuthenticated || !profileId) {
      onNotify(
        isCorrect
          ? "Correct answer! Sign in anytime to save your learning progress."
          : "Review the highlights above and try again!",
      );
      if (!isAuthenticated) onOpenAuth();
      return;
    }

    setSaving(true);
    try {
      const saved = await saveEducationProgress({
        profile_id: profileId,
        topic_slug: activeTopic.slug,
        completed: true,
        quiz_score: score,
        quiz_total: 1,
      });
      setProgress((prev) => ({ ...prev, [activeTopic.slug]: saved }));
      onNotify(
        isCorrect
          ? `Quiz mastered & saved for "${activeTopic.title}"!`
          : `Saved progress for "${activeTopic.title}". Correct choice highlighted!`,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#A1A1AA]">
        <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
        <span>Loading Smart Food Learning Modules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-3 py-1 text-xs font-semibold text-[#34D399]">
            <BookOpen className="h-3.5 w-3.5" />
            Smart Food Education Center • Holistic Habits &amp; Quizzes
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-3xl">
            Everyday Food Literacy &amp; Balanced Kitchen Habits
          </h2>
          <p className="mt-1.5 text-sm text-[#A1A1AA]">
            Explore 10 interactive modules covering food origins, mindful meals, youth nutrition,
            zero-waste prep, and family dining rhythm.
          </p>
        </div>

        <div className="rounded-2xl border border-[#A3FF12]/30 bg-[#0A0A0A] px-5 py-3.5 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
            Learning Progress
          </p>
          <p className="mt-1 font-mono text-2xl font-extrabold text-[#A3FF12]">
            {completedCount} / {topics.length}
          </p>
          <p className="text-[10px] text-[#A1A1AA]">Topics completed</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Topic Index */}
        <div className="space-y-2 lg:col-span-5">
          {topics.map((topic, idx) => {
            const done = Boolean(progress[topic.slug]?.completed);
            const active = topic.slug === activeTopic?.slug;
            return (
              <button
                key={topic.slug}
                type="button"
                onClick={() => {
                  setSelectedSlug(topic.slug);
                  setQuizAnswer(null);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
                  active
                    ? "border-[#A3FF12] bg-[#171D18]"
                    : "border-white/[0.08] bg-[#121212] hover:border-white/20"
                }`}
              >
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase text-[#34D399]">
                    Lesson {String(idx + 1).padStart(2, "0")} • {topic.tag}
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-white">{topic.title}</p>
                </div>
                {done && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#A3FF12]" />}
              </button>
            );
          })}
        </div>

        {/* Right Interactive Lesson + Daily Tip + Quiz */}
        {activeTopic && (
          <div className="space-y-5 rounded-3xl border border-white/[0.08] bg-[#121212] p-6 lg:col-span-7">
            <div>
              <span className="rounded-full bg-[#34D399]/15 px-3 py-1 text-[11px] font-bold text-[#34D399]">
                {activeTopic.tag}
              </span>
              <h3 className="mt-2 font-display text-2xl font-extrabold text-white">
                {activeTopic.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
                {activeTopic.summary}
              </p>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Practical Principles
              </p>
              {activeTopic.key_points.map((pt) => (
                <div key={pt} className="flex items-start gap-2 text-xs text-zinc-200">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A3FF12]" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            {/* Daily Tip */}
            <div className="rounded-2xl border border-[#A3FF12]/25 bg-[#A3FF12]/8 p-4 text-xs text-zinc-100">
              <p className="flex items-center gap-1.5 font-bold text-[#A3FF12]">
                <Sparkles className="h-4 w-4" />
                Today&apos;s Habit Action Tip
              </p>
              <p className="mt-1 leading-relaxed">{activeTopic.daily_tip}</p>
            </div>

            {/* Interactive Quick Quiz */}
            <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#0B0F0C] p-5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#34D399]">
                <HelpCircle className="h-4 w-4" />
                Quick Knowledge Check
              </p>
              <p className="text-sm font-semibold text-white">{activeTopic.quiz_question}</p>

              <div className="space-y-2">
                {activeTopic.quiz_options.map((opt, idx) => {
                  const selected = quizAnswer === idx;
                  const savedDone = Boolean(progress[activeTopic.slug]?.completed);
                  const isCorrect = idx === activeTopic.correct_index;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setQuizAnswer(idx)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs transition ${
                        selected
                          ? "border-[#A3FF12] bg-[#A3FF12]/15 font-bold text-white"
                          : savedDone && isCorrect
                            ? "border-[#34D399]/60 bg-[#34D399]/10 text-[#34D399]"
                            : "border-white/10 bg-[#121212] text-zinc-300 hover:border-white/25"
                      }`}
                    >
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={quizAnswer === null || saving}
                onClick={handleSubmitQuiz}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Award className="h-3.5 w-3.5" />
                )}
                Submit Answer &amp; Save Progress
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
