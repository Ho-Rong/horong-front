import { style } from "@vanilla-extract/css";

export const overlay = style({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
});

export const modal = style({
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "8px",
  width: "500px",
  maxHeight: "80vh",
  overflowY: "auto",
});
