import { style, globalStyle } from "@vanilla-extract/css";

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

export const modal = style({
  backgroundColor: "white",
  padding: "20px",
  margin: "10px",
  borderRadius: "8px",
  width: "500px",
  maxHeight: "80vh",
  overflowY: "auto",
});

export const imageContainer = style({
  position: "relative",
  flexShrink: 0,
});

export const imagePreview = style({
  width: "96px",
  height: "96px",
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  overflow: "hidden",
});

export const previewImage = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const deleteButton = style({
  position: "absolute",
  top: "-8px",
  right: "-8px",
  width: "24px",
  height: "24px",
  backgroundColor: "#ef4444",
  color: "white",
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
  ":hover": {
    backgroundColor: "#dc2626",
  },
});

export const fileName = style({
  fontSize: "12px",
  color: "#6b7280",
  marginTop: "4px",
  width: "96px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "center",
});

export const scrollContainer = style({
  overflowX: "auto",
  paddingBottom: "8px",
  scrollbarWidth: "thin",
  scrollbarColor: "#cbd5e1 #f1f5f9",
});

globalStyle(`${scrollContainer}::-webkit-scrollbar`, {
  height: "6px",
});
globalStyle(`${scrollContainer}::-webkit-scrollbar-track`, {
  background: "#f1f5f9",
  borderRadius: "3px",
});
globalStyle(`${scrollContainer}::-webkit-scrollbar-thumb`, {
  background: "#cbd5e1",
  borderRadius: "3px",
});
globalStyle(`${scrollContainer}::-webkit-scrollbar-thumb:hover`, {
  background: "#94a3b8",
});
