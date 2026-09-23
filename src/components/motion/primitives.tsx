"use client";

/**
 * Shared animation primitives.
 *
 * These are the ONLY building blocks components should reach for when they
 * need entrance/exit motion. Keeping the vocabulary small (fade, rise,
 * stagger, hover-lift) is what keeps "many animations" from turning into
 * "many animation styles" — every screen ends up moving the same way, just
 * with different content.
 *
 * Durations sit in the ~150–450ms band and share one easing curve
 * (`EASE`), and every primitive here respects `prefers-reduced-motion`
 * automatically via Motion's built-in reduced-motion handling combined with
 * the global CSS override in globals.css.
 */

import * as React from "react";
import { motion, type Variants, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

/** Natural, slightly-decelerated curve used everywhere for a "premium" feel. */
export const EASE = [0.2, 0.8, 0.2, 1] as const;

const baseTransition: Transition = { duration: 0.32, ease: EASE };

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: baseTransition },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: baseTransition },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.22, ease: EASE } },
};

/** Page-level entrance: a single, subtle rise+fade for the whole view. */
export function PageTransition({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({
  className,
  delay = 0,
  children,
  as = "div",
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
  as?: "div" | "section";
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial="hidden"
      animate="show"
      variants={fadeInVariants}
      transition={{ ...baseTransition, delay }}
    >
      {children}
    </Comp>
  );
}

export function SlideUp({
  className,
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={slideUpVariants}
      transition={{ ...baseTransition, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Wrap a list of children; each direct child fades/rises in sequence.
 * Use with <StaggerItem> children, or pass `asChild` items directly.
 */
export function StaggerContainer({
  className,
  children,
  stagger = 0.06,
  as = "div",
}: {
  className?: string;
  children: React.ReactNode;
  stagger?: number;
  as?: "div" | "ul" | "section";
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({
  className,
  children,
  as = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "li";
}) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={slideUpVariants}>
      {children}
    </Comp>
  );
}

/**
 * Drop-in replacement for a static <div> card: adds a soft hover lift and
 * press feedback. Purely presentational — doesn't change layout/markup
 * semantics, so it's safe to swap in wherever a Card currently sits.
 */
export const AnimatedCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { disableHover?: boolean }
>(function AnimatedCard({ className, disableHover, children, ...props }, ref) {
  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      whileHover={disableHover ? undefined : { y: -3, transition: { duration: 0.18, ease: EASE } }}
      whileTap={disableHover ? undefined : { scale: 0.99 }}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
});

/** A number/stat that pops gently when its value changes. */
export function AnimatedNumber({
  value,
  className,
}: {
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      key={String(value)}
      className={cn("inline-block", className)}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
    >
      {value}
    </motion.span>
  );
}

/** Row wrapper for tables/lists that should animate in one-by-one. */
export function StaggerRow({
  className,
  index = 0,
  children,
  as = "div",
  style,
}: {
  className?: string;
  index?: number;
  children: React.ReactNode;
  as?: "div" | "tr" | "li";
  style?: React.CSSProperties;
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      style={style}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE, delay: Math.min(index * 0.035, 0.4) }}
    >
      {children}
    </Comp>
  );
}
