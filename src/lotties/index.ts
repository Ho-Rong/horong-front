import smallLamp from "./small.json";
import mediumLamp from "./medium.json";
import largeLamp from "./large.json";

export const lampAnimations = {
  small: smallLamp,
  medium: mediumLamp,
  large: largeLamp,
} as const;
export type LampSize = keyof typeof lampAnimations;
