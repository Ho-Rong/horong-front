import { style, globalStyle } from "@vanilla-extract/css";

export const baseIcon = style({
  display: "inline-block",
  verticalAlign: "middle",
});

export const currentColorStroke = style({});

// 자식 요소(*, path, circle 등)에 currentColor stroke 적용
globalStyle(`${currentColorStroke} *`, {
  stroke: "currentColor",
});
