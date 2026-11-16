"use client";

import React, { useEffect, useRef, useState } from "react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";

interface ClipMaskHeadingProps {
  as?: "h1" | "h2" | "h3" | "div";
  children: React.ReactNode;
  className?: string;
  initialVisible?: boolean;
}

export function ClipMaskHeading({
  as: Tag = "h2",
  children,
  className = "",
  initialVisible = false,
}: ClipMaskHeadingProps) {
  const { motionPaused } = useOmnisStore();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(initialVisible);

  useEffect(() => {
    if (motionPaused || initialVisible) return;

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) {
      const id = window.setTimeout(() => setRevealed(true), 0);
      return () => window.clearTimeout(id);
    }

    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setRevealed(true), 0);
      return () => window.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -24px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [motionPaused, initialVisible]);

  const show = revealed || motionPaused || initialVisible;

  return (
    <Tag
      ref={rootRef as React.Ref<never>}
      data-clip-mask-heading="true"
      className={`omnis-text-mask ${className}`}
    >
      <span
        className="omnis-text-mask-inner"
        style={{
          transform: show ? "translate3d(0, 0, 0)" : "translate3d(0, 102%, 0)",
          opacity: show ? 1 : 0,
        }}
      >
        {children}
      </span>
    </Tag>
  );
}
