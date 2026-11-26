import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";

interface FloatingFoodIngredientsProps {
  variant?: "hero" | "story";
  scrollProgress?: MotionValue<number>;
}

/**
 * Custom editorial vector botanical & whole-food graphics (avocado, lime slice,
 * mint leaf, berry clusters, nutrient micro-particles).
 * Respects prefers-reduced-motion and GPU-accelerates transforms.
 */
export function FloatingFoodIngredients({
  variant = "hero",
  scrollProgress,
}: FloatingFoodIngredientsProps) {
  const prefersReduced = useReducedMotion();
  const idleProgress = useMotionValue(0);
  const progress = scrollProgress ?? idleProgress;

  const parallaxUp = useTransform(progress, [0, 1], [0, -48]);
  const parallaxDown = useTransform(progress, [0, 1], [0, 42]);
  const parallaxRotate = useTransform(progress, [0, 1], [0, 26]);

  if (variant === "story") {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Top-right drifting citrus wheel SVG */}
        <motion.div
          style={prefersReduced ? undefined : { y: parallaxUp, rotate: parallaxRotate }}
          className="animate-float-3d-slow absolute top-14 right-[6%] hidden h-16 w-16 opacity-65 lg:block"
        >
          <CitrusWheelSvg />
        </motion.div>

        {/* Bottom-left botanical mint leaf cluster */}
        <motion.div
          style={prefersReduced ? undefined : { y: parallaxDown }}
          className="animate-float-3d-reverse absolute bottom-20 left-[4%] hidden h-16 w-16 opacity-60 lg:block"
        >
          <MintLeafSvg />
        </motion.div>

        {/* Mid floating micro-nutrient spores */}
        {!prefersReduced && (
          <>
            <span className="animate-float-3d-slow absolute top-1/3 left-[48%] h-2.5 w-2.5 rounded-full bg-[#A3FF12]/45 blur-[0.5px]" />
            <span className="animate-float-3d-reverse absolute top-2/3 right-[44%] h-2 w-2 rounded-full bg-[#34D399]/50" />
            <span className="animate-float-3d-slow absolute bottom-1/4 left-[28%] h-1.5 w-1.5 rounded-full bg-white/35" />
          </>
        )}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Top-Left Fresh Mint Sprig SVG */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.7, y: 12 }}
        animate={{ opacity: 0.85, scale: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35 }}
        style={prefersReduced ? undefined : { y: parallaxUp }}
        className="animate-float-3d-slow absolute top-8 left-4 z-0 hidden h-14 w-14 sm:block lg:top-10 lg:left-[47%]"
      >
        <MintLeafSvg />
      </motion.div>

      {/* Top-Right Zesty Citrus Lime Wheel SVG */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.75, rotate: -18 }}
        animate={{ opacity: 0.9, scale: 1, rotate: 0 }}
        transition={{ duration: 0.75, delay: 0.42 }}
        style={prefersReduced ? undefined : { rotate: parallaxRotate }}
        className="animate-float-3d-reverse absolute top-6 right-5 z-0 hidden h-16 w-16 md:block lg:top-8 lg:right-8"
      >
        <CitrusWheelSvg />
      </motion.div>

      {/* Bottom-Right Sliced Avocado SVG */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.75, y: 16 }}
        animate={{ opacity: 0.9, scale: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.5 }}
        style={prefersReduced ? undefined : { y: parallaxDown }}
        className="animate-float-3d-slow absolute right-8 bottom-8 z-0 hidden h-16 w-16 lg:block"
      >
        <AvocadoHalfSvg />
      </motion.div>

      {/* Bottom-Left Blueberry & Chia Antioxidant Cluster SVG */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.85, scale: 1 }}
        transition={{ duration: 0.65, delay: 0.55 }}
        className="animate-float-3d-reverse absolute bottom-10 left-8 z-0 hidden h-12 w-12 md:block lg:left-[44%]"
      >
        <BerryClusterSvg />
      </motion.div>

      {/* Ambient Floating Micro-Nutrient Light Particles */}
      {!prefersReduced && (
        <>
          <span className="animate-float-3d-slow absolute top-[24%] left-[44%] h-2.5 w-2.5 rounded-full bg-[#A3FF12]/60 shadow-[0_0_12px_rgba(163,255,18,0.8)]" />
          <span className="animate-float-3d-reverse absolute top-[62%] left-[49%] h-2 w-2 rounded-full bg-[#34D399]/70 shadow-[0_0_10px_rgba(52,211,153,0.75)]" />
          <span className="animate-float-3d-slow absolute right-[18%] bottom-[22%] h-2 w-2 rounded-full bg-[#A3FF12]/55" />
          <span className="animate-float-3d-reverse absolute top-[16%] right-[26%] h-1.5 w-1.5 rounded-full bg-white/45" />
        </>
      )}
    </div>
  );
}

function CitrusWheelSvg() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-full w-full drop-shadow-[0_12px_20px_rgba(163,255,18,0.22)]">
      <defs>
        <radialGradient id="citrusGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D9FF7A" />
          <stop offset="72%" stopColor="#A3FF12" />
          <stop offset="100%" stopColor="#166534" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#citrusGlow)" fillOpacity="0.22" stroke="#A3FF12" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="22" fill="#0B130D" fillOpacity="0.65" stroke="#A3FF12" strokeOpacity="0.65" strokeWidth="1.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="32"
          y1="32"
          x2={32 + 20 * Math.cos((angle * Math.PI) / 180)}
          y2={32 + 20 * Math.sin((angle * Math.PI) / 180)}
          stroke="#A3FF12"
          strokeOpacity="0.55"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
      <circle cx="32" cy="32" r="4" fill="#D9FF7A" />
    </svg>
  );
}

function MintLeafSvg() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-full w-full drop-shadow-[0_12px_18px_rgba(52,211,153,0.25)]">
      <defs>
        <linearGradient id="leafGrad" x1="8" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A3FF12" />
          <stop offset="0.55" stopColor="#34D399" />
          <stop offset="1" stopColor="#065F46" />
        </linearGradient>
      </defs>
      <path
        d="M52 10C30 10 14 22 10 42C22 40 34 33 41 24C37 35 27 45 14 49C18 53 25 55 33 55C48 55 56 41 55 24C55 19 54 14 52 10Z"
        fill="url(#leafGrad)"
        fillOpacity="0.82"
        stroke="#A3FF12"
        strokeOpacity="0.55"
        strokeWidth="1.2"
      />
      <path d="M12 48C23 41 35 30 45 17" stroke="#050706" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AvocadoHalfSvg() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-full w-full drop-shadow-[0_14px_20px_rgba(52,211,153,0.25)]">
      <defs>
        <linearGradient id="avoFlesh" x1="16" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9FF7A" />
          <stop offset="1" stopColor="#65A30D" />
        </linearGradient>
      </defs>
      <path
        d="M32 6C22 6 14 24 14 38C14 50 22 58 32 58C42 58 50 50 50 38C50 24 42 6 32 6Z"
        fill="#14532D"
        stroke="#34D399"
        strokeWidth="2"
      />
      <path
        d="M32 10C24 10 18 26 18 38C18 47.5 24.5 54 32 54C39.5 54 46 47.5 46 38C46 26 40 10 32 10Z"
        fill="url(#avoFlesh)"
        fillOpacity="0.92"
      />
      <circle cx="32" cy="40" r="8.5" fill="#78350F" />
      <circle cx="29.5" cy="37.5" r="2.2" fill="#D97706" fillOpacity="0.55" />
    </svg>
  );
}

function BerryClusterSvg() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-full w-full drop-shadow-[0_8px_14px_rgba(163,255,18,0.2)]">
      <circle cx="24" cy="34" r="10" fill="#1E293B" stroke="#34D399" strokeWidth="1.6" />
      <circle cx="21" cy="31" r="2.5" fill="#34D399" fillOpacity="0.5" />
      <circle cx="40" cy="36" r="9" fill="#0F172A" stroke="#A3FF12" strokeWidth="1.6" />
      <circle cx="38" cy="33" r="2" fill="#A3FF12" fillOpacity="0.55" />
      <circle cx="32" cy="22" r="7.5" fill="#1E293B" stroke="#34D399" strokeWidth="1.4" />
      <path d="M27 14L32 18L37 14" stroke="#A3FF12" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
