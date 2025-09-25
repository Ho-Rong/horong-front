// components/SpeedDial/speedDial.css.ts
import { recipe } from "@vanilla-extract/recipes";
import { style } from "@vanilla-extract/css";

/** 스피드다이얼 루트: 원하는 자리로 옮기려면 left/bottom만 바꿔줘 */
export const root = style({
  position: "absolute",
  left: 12,
  bottom: 12,
  zIndex: 5,
});

/** 펼쳐지는 액션 래퍼 */
export const actionsWrap = recipe({
  base: {
    position: "absolute",
    left: 0,
    bottom: 64, // FAB(56) + 여백
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  variants: {
    open: {
      false: { pointerEvents: "none" },
      true: { pointerEvents: "auto" },
    },
  },
});

/** 액션 버튼 (개별 아이템) */
export const actionBtn = recipe({
  base: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.12), 0 12px 24px rgba(0,0,0,0.08)",
    display: "grid",
    placeItems: "center",
    transition: "transform 220ms cubic-bezier(.2,.8,.2,1), opacity 220ms",
  },
  variants: {
    open: {
      false: { transform: "translateY(12px)", opacity: 0 },
      true: { transform: "translateY(0)", opacity: 1 },
    },
    delay: {
      d0: { transitionDelay: "0ms" },
      d1: { transitionDelay: "35ms" },
      d2: { transitionDelay: "70ms" },
      d3: { transitionDelay: "105ms" },
    },
  },
  defaultVariants: {
    open: false,
    delay: "d0",
  },
});

/** 메인 FAB */
export const fab = style({
  width: 56,
  height: 56,
  borderRadius: "50%",
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 2px 6px rgba(0,0,0,0.12), 0 12px 24px rgba(0,0,0,0.08)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
});
