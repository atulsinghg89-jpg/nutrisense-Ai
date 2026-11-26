import { Info } from "lucide-react";
import { DOSHA_DISCLAIMER_TEXT } from "../../data/doshas";

interface DoshaDisclaimerProps {
  compact?: boolean;
}

/** Educational cultural-context disclaimer keeping Ayurvedic principles distinct from medical diagnosis. */
export function DoshaDisclaimer({ compact = false }: DoshaDisclaimerProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0A0A0A]/90 ${
        compact ? "px-4 py-3" : "p-4 sm:p-5"
      } text-xs leading-relaxed text-[#A1A1AA]`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" />
      <p>{DOSHA_DISCLAIMER_TEXT}</p>
    </div>
  );
}
