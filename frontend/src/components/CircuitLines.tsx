import { motion, useReducedMotion } from "framer-motion";

interface CircuitLinesProps {
  variant?: "hero" | "section";
  className?: string;
}

const CIRCUIT_TRACKS = [
  { left: "8%", delay: 0, duration: 5.5, color: "#A3FF12", hasNode: true, nodeTop: "28%" },
  { left: "21%", delay: 1.4, duration: 6.4, color: "#34D399", hasNode: false, nodeTop: "50%" },
  { left: "36%", delay: 0.7, duration: 5.8, color: "#A3FF12", hasNode: true, nodeTop: "64%" },
  { left: "50%", delay: 2.1, duration: 7.2, color: "#34D399", hasNode: true, nodeTop: "22%" },
  { left: "65%", delay: 0.4, duration: 6.0, color: "#A3FF12", hasNode: false, nodeTop: "42%" },
  { left: "79%", delay: 1.9, duration: 5.4, color: "#34D399", hasNode: true, nodeTop: "58%" },
  { left: "92%", delay: 1.1, duration: 6.8, color: "#A3FF12", hasNode: true, nodeTop: "34%" },
];

const PARTICLES = [
  { left: "14%", top: "18%", size: 3, duration: 7.5, delay: 0.2 },
  { left: "28%", top: "74%", size: 2, duration: 6.5, delay: 1.1 },
  { left: "44%", top: "24%", size: 3, duration: 8.2, delay: 0.6 },
  { left: "58%", top: "82%", size: 2.5, duration: 7.0, delay: 1.7 },
  { left: "73%", top: "30%", size: 2, duration: 6.8, delay: 0.9 },
  { left: "86%", top: "68%", size: 3, duration: 7.8, delay: 1.4 },
];

/** Animated FITTR-inspired vertical circuit traces and subtle floating particles. */
export function CircuitLines({
  variant = "hero",
  className = "",
}: CircuitLinesProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Vertical circuit lines */}
      {CIRCUIT_TRACKS.map((track, idx) => (
        <div
          key={track.left}
          style={{ left: track.left }}
          className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent"
        >
          {/* Optional subtle junction diamond/dot on circuit line */}
          {track.hasNode && (
            <span
              style={{ top: track.nodeTop }}
              className="absolute -left-[3px] h-[7px] w-[7px] rotate-45 border border-[#34D399]/35 bg-[#0A0A0A]"
            />
          )}

          {/* Traveling light pulse along the vertical line */}
          {!prefersReduced && (
            <motion.span
              initial={{ top: "-18%", opacity: 0 }}
              animate={{
                top: ["0%", "105%"],
                opacity: [0, idx % 2 === 0 ? 0.75 : 0.55, 0],
              }}
              transition={{
                duration: track.duration,
                delay: track.delay,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                background: `linear-gradient(to bottom, transparent, ${track.color}, transparent)`,
              }}
              className="absolute -left-[0.5px] h-24 w-[2px] rounded-full blur-[0.5px]"
            />
          )}
        </div>
      ))}

      {/* Subtle horizontal circuit connectors on hero */}
      {variant === "hero" && (
        <>
          <div className="absolute top-[28%] right-[64%] left-[8%] hidden h-px bg-gradient-to-r from-[#A3FF12]/20 via-white/[0.06] to-transparent lg:block" />
          <div className="absolute top-[58%] right-[8%] left-[79%] hidden h-px bg-gradient-to-l from-[#34D399]/25 via-white/[0.06] to-transparent lg:block" />
        </>
      )}

      {/* Subtle drifting particles */}
      {!prefersReduced &&
        PARTICLES.map((p, idx) => (
          <motion.span
            key={`${p.left}-${p.top}`}
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [0, -18, 0],
              opacity: [0.15, 0.55, 0.15],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute rounded-full ${
              idx % 2 === 0 ? "bg-[#A3FF12]" : "bg-[#34D399]"
            }`}
          />
        ))}
    </div>
  );
}
