import React from "react";
import Lottie from "lottie-react";
import * as styles from "../styles.css";
import { getCharacterAnimation } from "../../../../utils/characterLoader";

interface CharacterProps {
  characterId: number;
  dataBall: string;
  characterIndex: number;
}

const Character: React.FC<CharacterProps> = ({
  characterId,
  dataBall,
  characterIndex,
}) => {
  const animationData = getCharacterAnimation(characterId);

  // characterIndex에 따른 초기 회전각 설정(-90도에서 90도 사이)
  const initialRotation = ((characterIndex * 23) % 181) - 90;
  return (
    <div
      className={styles.character}
      data-ball={dataBall}
      style={{
        transform: `rotate(${initialRotation}deg)`,
      }}
    >
      <div className={styles.lottieContainer}>
        <Lottie animationData={animationData} loop={true} autoplay={true} />
      </div>
    </div>
  );
};

export default Character;
