import { style, keyframes } from "@vanilla-extract/css";

export const overlay = style({
  position: "fixed",
  top: 0,
  left: "50%",
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: "393px",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1001,
});

export const bounce = keyframes({
  "0%, 20%, 53%, 80%, 100%": {
    transform: "translateY(0)",
  },
  "40%, 43%": {
    transform: "translateY(-10px)",
  },
  "70%": {
    transform: "translateY(-5px)",
  },
  "90%": {
    transform: "translateY(-3px)",
  },
});

export const successText = style({
  color: "var(--vapor-color-white)",
  animation: `${bounce} 2s infinite ease-in-out`,
});
