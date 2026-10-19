"use client";

import * as React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { springSheet } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/use-mounted";

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotionSafe();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dimming scrim — fades the background back without blocking flow */}
          <motion.div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
          {/* The surface materializes: blur + scale together, mirrored on exit */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.94, y: 8 }
            }
            animate={
              reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.94, y: 8 }
            }
            transition={reduceMotion ? { duration: 0.2 } : springSheet}
            className={cn(
              "relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl",
              className
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
