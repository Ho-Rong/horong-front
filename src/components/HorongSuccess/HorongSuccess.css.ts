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
  textAlign: "center",
  color: "var(--vapor-color-white)",
  animation: `${bounce} 2s infinite ease-in-out`,
});

export const text1 = style({
  fontFamily: "var(--vapor-typography-fontFamily-sans)",
  fontSize: "var(--vapor-typography-fontSize-100)",
  fontStyle: "normal",
  fontWeight: 500,
  lineHeight: "var(--vapor-typography-lineHeight-100)",
  letterSpacing: "var(--vapor-typography-letterSpacing-100)",
});

export const text2 = style({
  fontFamily: "var(--vapor-typography-fontFamily-sans)",
  fontSize: "var(--vapor-typography-fontSize-400)",
  fontStyle: "normal",
  fontWeight: 700,
  lineHeight: "var(--vapor-typography-lineHeight-400)",
  letterSpacing: "var(--vapor-typography-letterSpacing-300)",
});

export const text = style({
  fontFamily: "var(--vapor-typography-fontFamily-sans)",
  fontSize: "var(--vapor-typography-fontSize-300)",
  fontStyle: "normal",
  fontWeight: 500,
  lineHeight: "var(--vapor-typography-lineHeight-300)",
  letterSpacing: "var(--vapor-typography-letterSpacing-200)",
});

export const registraion = style({
  width: "168px",
  height: "var(--vapor-size-dimension-600)",
  padding: "0 var(--vapor-size-space-300)",
  justifyContent: "center",
  alignItems: "center",
  gap: "var(--vapor-size-space-100)",
  flexShrink: 0,
  borderRadius: "var(--vapor-size-borderRadius-300)",
  background: "var(--vapor-color-violet-700)",
  fontSize: "16px",
});

export const close = style({
  width: "168px",
  height: "var(--vapor-size-dimension-600)",
  padding: "0 var(--vapor-size-space-300)",
  justifyContent: "center",
  alignItems: "center",
  gap: "var(--vapor-size-space-100)",
  flexShrink: 0,
  fontSize: "16px",
  borderRadius: "var(--vapor-size-borderRadius-300)",
  background: "#232323",
});
