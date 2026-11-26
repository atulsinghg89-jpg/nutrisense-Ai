import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useReducedMotion, type Variants } from "framer-motion";

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
