import { style, globalStyle } from "@vanilla-extract/css";

globalStyle("*", {
  margin: 0,
  padding: 0,
  boxSizing: "border-box",
});

globalStyle("body", {
  fontFamily: "Arial, sans-serif",
});

export const container = style({
  position: "relative",
  width: "100%",
  height: "100vh",
  overflow: "hidden",
  backgroundImage: "url('/farm-background.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
});

export const ground = style({
  position: "absolute",
  bottom: 0,
  width: "100%",
  height: "5px",
  background: "rgba(255, 255, 255, 0.3)",
});

export const lottieContainer = style({
  width: "100%",
  height: "100%",
  pointerEvents: "none",
});

export const character = style({
  position: "absolute",
  width: "150px",
  height: "150px",
  cursor: "grab",
  userSelect: "none",
  transition: "transform 0.1s ease",

  ":active": {
    cursor: "grabbing",
    transform: "scale(1.1)",
  },

  "@media": {
    "(hover: none) and (pointer: coarse)": {
      cursor: "default",
    },
  },
});
