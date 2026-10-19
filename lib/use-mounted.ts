"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

// True only after the component has mounted on the client. The first client
// render returns `false`, matching the server, so it is safe to branch on this
// for anything that would otherwise cause a hydration mismatch.
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// SSR-safe reduced-motion check. Returns `false` on the server and on the first
// client render, then the user's real preference after mount. This avoids the
// hydration mismatch that `useReducedMotion` alone can cause when the OS has
// reduced motion enabled.
export function useReducedMotionSafe() {
  const mounted = useMounted();
  const reduced = useReducedMotion();
  return mounted ? Boolean(reduced) : false;
}
