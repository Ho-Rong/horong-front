import { style, globalStyle, keyframes } from "@vanilla-extract/css";
const fadeIn = keyframes({
  "0%": { opacity: 0 },
  "100%": { opacity: 1 },
});

const slideIn = keyframes({
  "0%": {
    transform: "scale(0.95) translateY(10px)",
    opacity: 0,
  },
  "100%": {
    transform: "scale(1) translateY(0)",
    opacity: 1,
  },
});

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
  // 더 부드러운 애니메이션
  animation: `${fadeIn} 0.4s ease-out forwards`,
});

export const modal = style({
  position: "relative",
  backgroundColor: "white",
  padding: "20px",
  margin: "24px",
  borderRadius: "8px",
  width: "500px",
  maxHeight: "80vh",
  overflowY: "auto",
  // 더 부드러운 애니메이션
  animation: `${slideIn} 0.4s ease-out forwards`,
});
export const title = style({
  fontFamily: "var(--vapor-typography-fontFamily-sans)",
  fontSize: "var(--vapor-typography-fontSize-200)",
  fontWeight: "var(--vapor-typography-fontWeight-700)",
  lineHeight: "var(--vapor-typography-lineHeight-200)",
  letterSpacing: "var(--vapor-typography-letterSpacing-100)",
});

export const label = style({
  fontFamily: "var(--vapor-typography-fontFamily-sans)",
  fontSize: "14px",
  lineHeight: "22px",
  letterSpacing: "-0.408px",
  fontWeight: 600,
});

export const uploadArea = style({
  display: "flex",
  padding: "31px 0",
  justifyContent: "center",
  alignItems: "center",
  alignSelf: "stretch",
  borderRadius: "10px",
  borderWidth: "1px",
  borderStyle: "dashed",
  borderColor: "var(--vapor-color-gray-200)",
  backgroundColor: "var(--vapor-color-gray-050)",
  cursor: "pointer",
  transition: "all 0.2s ease",
  marginBottom: "16px",
});

export const uploadContent = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "8px",
});

export const uploadIcon = style({
  borderRadius: "var(--vapor-size-borderRadius-300)",
  background: "var(--vapor-color-secondary)",
});

export const uploadText = style({
  color: "var(--vapor-color-foreground-hint)",
  textAlign: "center",
  fontFamily: "var(--vapor-typography-fontFamily-sans)",
  fontSize: "var(--vapor-typography-fontSize-025)",
  fontStyle: "normal",
  fontWeight: 400,
  lineHeight: "var(--vapor-typography-lineHeight-025)",
  letterSpacing: "var(--vapor-typography-letterSpacing-000)",
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

export const button = style({
  marginTop: "18px",
  height: "var(--vapor-size-dimension-500)",
  padding: "0 var(--vapor-size-space-200)",
  borderRadius: "var(--vapor-size-borderRadius-300)",
  background: "var(--vapor-color-violet-600)",

  selectors: {
    "&:disabled": {
      backgroundColor: "var(--vapor-color-gray-200)",
      cursor: "not-allowed",
    },
  },
});

export const textarea = style({
  borderRadius: "8px",
  borderWidth: "1px",
  minHeight: "100px",
  marginTop: "6px",
  outline: "none", // 기본 포커스 outline 제거

  ":focus": {
    borderColor: "#000", // 포커스 시 검은색 테두리
  },

  backgroundColor: "var(--vapor-color-gray-050)",
  color: "var(--vapor-color-foreground-hint)",
  fontFamily: "var(--vapor-typography-fontFamily-sans)",
  fontSize: "12px",
  fontStyle: "normal",
  fontWeight: 400,
  lineHeight: "var(--vapor-typography-lineHeight-025)",
  letterSpacing: "var(--vapor-typography-letterSpacing-000)",
});

export const error = style({
  color: "#252525",
  lineHeight: "22px",

  fontFamily: "var(--vapor-typography-fontFamily-sans)",
  fontSize: "12px",
  fontStyle: "normal",
  fontWeight: 400,

  letterSpacing: "var(--vapor-typography-letterSpacing-000)",
});

export const iconBackground = style({
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  backgroundColor: "#e1e1e1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const closeBackground = style({
  position: "absolute",
  top: "20px",
  right: "20px",
  cursor: "pointer",

  width: "24px",
  height: "24px",
  borderRadius: "50%",
  backgroundColor: "#f7f7f7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const nowLocation = style({
  color: "var(--contrast, #262626)",
  fontFamily: "var(--vapor-typography-fontFamily-sans)",
  fontSize: "14px",
  fontStyle: "normal",
  fontWeight: 500,
  lineHeight: "var(--vapor-typography-lineHeight-025)",
  letterSpacing: "var(--vapor-typography-letterSpacing-000)",
});
