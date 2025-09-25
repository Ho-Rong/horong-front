import smallLamp from "./small.json";
import mediumLamp from "./medium.json";
import largeLamp from "./large.json";
import farm from "./farm.json";

export const lampAnimations = {
  small: smallLamp,
  medium: mediumLamp,
  large: largeLamp,
  farm: farm,
} as const;
export type LampSize = keyof typeof lampAnimations;
