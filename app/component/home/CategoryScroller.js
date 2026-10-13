"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Marketplace jaisa category row: circles + side arrows.
   Server page se children (Link items) pass hote hain. */
export default function CategoryScroller({ children }) {
  const ref = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [check]);

  const go = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <div className="lx-catrow">
      {canPrev && (
        <button type="button" className="lx-arrow lx-arrow-l" onClick={() => go(-1)} aria-label="Previous categories">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      )}

      <div className="lx-cat-grid" ref={ref} onScroll={check}>
        {children}
      </div>

      {canNext && (
        <button type="button" className="lx-arrow lx-arrow-r" onClick={() => go(1)} aria-label="More categories">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}