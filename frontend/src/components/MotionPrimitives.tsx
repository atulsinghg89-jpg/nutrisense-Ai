import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Variants,
} from "framer-motion";

export const EASE_PREMIUM: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: EASE_PREMIUM },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: EASE_PREMIUM },
  },
};

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Smooth scroll-triggered fade-up reveal respecting reduced-motion settings. */
export function RevealSection({
  children,
  className = "",
  delay = 0,
}: RevealSectionProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, delay, ease: EASE_PREMIUM }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

/** Smoothly interpolates displayed numeric KPIs whenever underlying state updates. */
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  className = "",
}: AnimatedNumberProps) {
  const prefersReduced = useReducedMotion();
  const prevValueRef = useRef<number>(value);
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect(() => {
    if (prefersReduced) {
      prevValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const from = prevValueRef.current;
    const to = Number.isFinite(value) ? value : 0;
    if (Math.abs(from - to) < 0.001) {
      setDisplayValue(to);
      return;
    }

    const controls = animate(from, to, {
      duration: 0.55,
      ease: EASE_PREMIUM,
      onUpdate: (latest) => setDisplayValue(latest),
      onComplete: () => {
        prevValueRef.current = to;
      },
    });

    return () => {
      prevValueRef.current = to;
      controls.stop();
    };
  }, [value, prefersReduced]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toLocaleString();

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  mode?: "words" | "chars";
}

/** Editorial split-text reveal using transform & opacity, honoring reduced motion. */
export function SplitText({
  text,
  className = "",
  delay = 0,
  mode = "words",
}: SplitTextProps) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return <span className={className}>{text}</span>;
  }

  const tokens = mode === "chars" ? Array.from(text) : text.split(" ");

  return (
    <span className={`inline-flex flex-wrap ${className}`}>
      {tokens.map((token, idx) => (
        <span
          key={`${token}-${idx}`}
          className="inline-block overflow-hidden align-bottom"
        >
          <motion.span
            initial={{ y: "105%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{
              duration: 0.48,
              delay: delay + idx * (mode === "chars" ? 0.022 : 0.055),
              ease: EASE_PREMIUM,
            }}
            className="inline-block"
          >
            {token}
            {mode === "words" && idx < tokens.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

interface MagneticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  ariaLabel?: string;
}

/** Subtle magnetic pointer-follow button on desktop hover, clean press feedback everywhere. */
export function MagneticButton({
  children,
  onClick,
  className = "",
  type = "button",
  disabled = false,
  ariaLabel,
}: MagneticButtonProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 260, damping: 18, mass: 0.4 });
  const springY = useSpring(rawY, { stiffness: 260, damping: 18, mass: 0.4 });

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (prefersReduced || disabled) return;
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      return;
    }
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    rawX.set(dx * 0.16);
    rawY.set(dy * 0.22);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={prefersReduced ? undefined : { x: springX, y: springY }}
      whileHover={prefersReduced || disabled ? undefined : { scale: 1.03 }}
      whileTap={prefersReduced || disabled ? undefined : { scale: 0.97 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}
