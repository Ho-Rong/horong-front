// components/SpeedDial/SpeedDial.tsx
"use client";

import * as React from "react";
import * as s from "./SpeedDial.css";

type SpeedDialAction = {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
};

export function SpeedDial({
  actions,
  style,
}: {
  actions: SpeedDialAction[];
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const PlaceholderIcon = (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <rect
        x="3"
        y="3"
        width="20"
        height="20"
        rx="2"
        stroke="#111"
        fill="none"
        strokeWidth="2"
      />
      <path d="M5 21L21 5M5 5l16 16" stroke="#111" strokeWidth="2" />
    </svg>
  );

  const delayKey = (idx: number) =>
    (["d0", "d1", "d2", "d3"] as const)[Math.min(idx, 3)];

  return (
    <div className={s.root} style={style}>
      {/* 펼쳐지는 액션들 */}
      <div className={s.actionsWrap({ open })} aria-hidden={!open}>
        {actions.map((a, idx) => (
          <button
            key={a.id}
            onClick={() => {
              a.onClick?.();
              setOpen(false);
            }}
            title={a.label}
            aria-label={a.label ?? a.id}
            className={s.actionBtn({ open, delay: delayKey(idx) })}
          >
            {a.icon ?? PlaceholderIcon}
          </button>
        ))}
      </div>

      {/* 메인 FAB */}
      <button
        aria-expanded={open}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        onClick={() => setOpen((v) => !v)}
        className={s.fab}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
          {open ? (
            <path d="M6 6L20 20M6 20L20 6" stroke="#111" strokeWidth="2" />
          ) : (
            <>
              <path d="M4 13H22" stroke="#111" strokeWidth="2" />
              <path d="M13 4V22" stroke="#111" strokeWidth="2" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
