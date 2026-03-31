"use client";

import * as React from "react";
import { cn } from "@/shared/utils";
import { X } from "lucide-react";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function SlidePanel({ open, onClose, children, footer, className }: SlidePanelProps) {
  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        style={{ animation: "panel-overlay-in 0.2s ease-out both" }}
        onClick={onClose}
      />

      {/* Panel — flex column, full height, no overflow here */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full bg-white border-l border-border/60 shadow-elevated flex flex-col",
          "w-full sm:w-[440px] md:w-[480px]",
          className,
        )}
        style={{ animation: "panel-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Close button — sticky within scroll area */}
          <button
            type="button"
            onClick={onClose}
            className="sticky top-0 z-10 flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted/60 transition-colors ml-3 mt-3"
            aria-label="Close panel"
          >
            <X size={16} className="text-muted-foreground" />
          </button>

          <div className="px-6 pb-6 -mt-5">
            {children}
          </div>
        </div>

        {/* Sticky footer — always visible at panel bottom */}
        {footer && (
          <div className="shrink-0 border-t border-border/60 bg-white px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
