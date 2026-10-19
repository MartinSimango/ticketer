// Apple-style spring presets (WWDC "Designing Fluid Interfaces").
// Motion's { bounce, duration } maps closely to Apple's { damping, response }.

// Default UI: critically damped, no overshoot. Graceful, non-distracting.
export const springDefault = {
  type: "spring",
  bounce: 0,
  duration: 0.4,
} as const;

// Snappier critically-damped spring for small, frequent interactions.
export const springSnappy = {
  type: "spring",
  bounce: 0,
  duration: 0.3,
} as const;

// Momentum interaction (flick / drag release): slight bounce, only because
// the gesture itself carried momentum.
export const springMomentum = {
  type: "spring",
  bounce: 0.2,
  duration: 0.4,
} as const;

// Sheet / drawer / dialog: a touch of bounce as the material arrives.
export const springSheet = {
  type: "spring",
  bounce: 0.12,
  duration: 0.35,
} as const;

// Press feedback — instant, on pointer-down.
export const pressTransition = { duration: 0.1, ease: "easeOut" } as const;
