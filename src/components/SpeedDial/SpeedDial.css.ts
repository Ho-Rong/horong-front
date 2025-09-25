import { recipe } from "@vanilla-extract/recipes";
import { style } from "@vanilla-extract/css";

export const root = style({
  position: "absolute",
  left: 44,
  bottom: 27,
  zIndex: 6,
});

export const actionsWrap = recipe({
  base: {
    position: "absolute",
    left: 0,
    bottom: 64,
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

export const actionBtn = recipe({
  base: {
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

export const fabIconSwap = style({
  position: "relative",
  width: 24,
  height: 24,
  lineHeight: 0,
});

/** FAB 개별 아이콘 레이어(겹쳐놓고 상태로 토글) */
export const fabIcon = recipe({
  base: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    transition: "opacity 180ms ease, transform 220ms cubic-bezier(.2,.8,.2,1)",
    willChange: "opacity, transform",
  },
  variants: {
    kind: {
      plus: {},
      close: {},
    },
    open: {
      false: {},
      true: {},
    },
  },
  compoundVariants: [
    // Plus 아이콘: 열릴 때 사라지면서 살짝 회전/축소
    {
      variants: { kind: "plus", open: false },
      style: { opacity: 1, transform: "rotate(0deg) scale(1)" },
    },
    {
      variants: { kind: "plus", open: true },
      style: { opacity: 0, transform: "rotate(90deg) scale(0.85)" },
    },

    // Close 아이콘: 닫힐 때 사라지고, 열릴 때 나타나며 반대 회전
    {
      variants: { kind: "close", open: false },
      style: { opacity: 0, transform: "rotate(-90deg) scale(0.85)" },
    },
    {
      variants: { kind: "close", open: true },
      style: { opacity: 1, transform: "rotate(0deg) scale(1)" },
    },
  ],
  defaultVariants: {
    open: false,
  },
});
