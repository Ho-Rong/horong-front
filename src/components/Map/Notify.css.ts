import { style } from "@vanilla-extract/css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: "4px",
  zIndex: 6,
});

export const button = style({
  width: "90px",
  height: "90px",
  cursor: "pointer",
});
