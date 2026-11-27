import type { YogaPoseKey } from "../../data/womensWellnessData";

export function BotanicalCornerBloom({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 180"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      fill="none"
    >
      <path
        d="M150 20C125 32 110 56 112 84C140 82 162 60 150 20Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path
        d="M95 16C78 38 78 68 96 86C116 68 118 38 95 16Z"
        fill="currentColor"
        fillOpacity="0.22"
      />
      <path
        d="M42 42C56 64 80 76 106 72C96 46 72 34 42 42Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M160 88C136 92 118 110 118 134C142 132 160 114 160 88Z"
        fill="#6b8f71"
        fillOpacity="0.2"
      />
      <circle cx="104" cy="78" r="7" fill="#c96a7e" fillOpacity="0.35" />
    </svg>
  );
}

export function PetalDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-1" aria-hidden="true">
      <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#e5bac6]" />
      <svg viewBox="0 0 36 20" className="h-4 w-7 text-[#c96a7e]" fill="none">
        <path
          d="M18 18C18 10 11 4 4 6C7 13 13 18 18 18Z"
          fill="currentColor"
          fillOpacity="0.35"
        />
        <path
          d="M18 18C18 10 25 4 32 6C29 13 23 18 18 18Z"
          fill="currentColor"
          fillOpacity="0.35"
        />
        <path
          d="M18 17C14 10 14 4 18 1C22 4 22 10 18 17Z"
          fill="currentColor"
          fillOpacity="0.55"
        />
      </svg>
      <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#e5bac6]" />
    </div>
  );
}

/**
 * Clean minimal vector art illustrations for the 6 Period Yoga & Gentle Movement cards.
 */
export function YogaPoseIllustration({ poseKey }: { poseKey: YogaPoseKey }) {
  return (
    <div className="flex h-24 w-full items-center justify-center rounded-2xl border border-[#f0dce2] bg-gradient-to-br from-[#fff5f7] via-[#f9f3fc] to-[#f4f8f4] p-2">
      <svg viewBox="0 0 180 86" className="h-full w-auto" fill="none" aria-hidden="true">
        {/* Soft Mat Base */}
        <rect x="18" y="68" width="144" height="6" rx="3" fill="#e8c8d2" />

        {poseKey === "childs_pose" && (
          <g stroke="#8e3b56" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Folded legs & rounded relaxed torso */}
            <path d="M50 67 H80 C84 55 72 48 60 54 C50 58 48 64 50 67 Z" fill="#f7dde5" fillOpacity="0.65" />
            <path d="M62 50 C82 38 112 42 128 60" />
            <path d="M128 60 H152" />
            <circle cx="127" cy="60" r="8" fill="#f7dde5" />
            {/* Cushion */}
            <ellipse cx="95" cy="61" rx="18" ry="6" fill="#d9e7dc" stroke="#5b7f65" strokeWidth="2" />
          </g>
        )}

        {poseKey === "cat_cow" && (
          <g stroke="#8e3b56" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Kneeling tabletop with gentle arched spine */}
            <path d="M62 67 V48" />
            <path d="M62 48 C78 28 106 28 122 46" />
            <path d="M122 46 V67" />
            <circle cx="132" cy="41" r="8" fill="#f7dde5" />
            <path d="M84 24 Q92 17 100 24" stroke="#5b7f65" strokeWidth="2.2" />
          </g>
        )}

        {poseKey === "knee_to_chest" && (
          <g stroke="#8e3b56" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Lying on back with knees softly hugged toward chest */}
            <path d="M46 65 H108" />
            <circle cx="38" cy="59" r="8" fill="#f7dde5" />
            <path d="M108 65 L122 42 L95 36" />
            <path d="M72 60 C82 46 92 42 108 42" />
          </g>
        )}

        {poseKey === "seated_breathing" && (
          <g stroke="#8e3b56" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Cross-legged upright meditation + calm breath waves */}
            <ellipse cx="90" cy="64" rx="26" ry="5" fill="#d9e7dc" stroke="#5b7f65" strokeWidth="2" />
            <path d="M90 58 V30" />
            <path d="M90 36 C78 42 74 52 84 55" />
            <path d="M90 36 C102 42 106 52 96 55" />
            <circle cx="90" cy="21" r="8" fill="#f7dde5" />
            <path d="M52 24 C57 20 62 20 66 24" stroke="#5b7f65" strokeWidth="2" />
            <path d="M114 24 C118 20 123 20 128 24" stroke="#5b7f65" strokeWidth="2" />
          </g>
        )}

        {poseKey === "supported_relaxation" && (
          <g stroke="#8e3b56" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Bolster supported recline */}
            <path d="M44 65 L86 48 L128 65" />
            <circle cx="52" cy="48" r="8" fill="#f7dde5" />
            <ellipse cx="64" cy="59" rx="20" ry="6" fill="#e9dff4" stroke="#7d6498" strokeWidth="2" />
            <ellipse cx="122" cy="62" rx="14" ry="5" fill="#d9e7dc" stroke="#5b7f65" strokeWidth="2" />
          </g>
        )}

        {poseKey === "gentle_walk" && (
          <g stroke="#8e3b56" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Gentle unhurried walking silhouette */}
            <circle cx="90" cy="18" r="7.5" fill="#f7dde5" />
            <path d="M90 26 V48" />
            <path d="M90 48 L75 67" />
            <path d="M90 48 L106 67" />
            <path d="M90 32 L78 44" />
            <path d="M90 32 L103 44" />
          </g>
        )}
      </svg>
    </div>
  );
}
