import character1 from "../app/(with-layout)/farm/characters/character-1.json";
import character2 from "../app/(with-layout)/farm/characters/character-2.json";
import character3 from "../app/(with-layout)/farm/characters/character-1.json";
import character4 from "../app/(with-layout)/farm/characters/character-2.json";
import character5 from "../app/(with-layout)/farm/characters/character-1.json";
import character6 from "../app/(with-layout)/farm/characters/character-2.json";
import character7 from "../app/(with-layout)/farm/characters/character-1.json";
import character8 from "../app/(with-layout)/farm/characters/character-2.json";
import character9 from "../app/(with-layout)/farm/characters/character-1.json";

const CHARACTER_ANIMATIONS = {
  1: character1,
  2: character2,
  3: character3,
  4: character4,
  5: character5,
  6: character6,
  7: character7,
  8: character8,
  9: character9,
} as const;

export const getCharacterAnimation = (id: number) => {
  return (
    CHARACTER_ANIMATIONS[id as keyof typeof CHARACTER_ANIMATIONS] ||
    CHARACTER_ANIMATIONS[1]
  );
};
