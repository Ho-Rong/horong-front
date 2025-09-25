import React from "react";
import Lottie from "lottie-react";
import * as styles from "../styles.css";

// Lottie 애니메이션 기본 타입 정의
interface LottieAnimationData {
  v: string; // version
  fr: number; // framerate
  w: number; // width
  h: number; // height
  op: number; // out point
  ip: number; // in point
  nm?: string; // name
  ddd?: number; // 3d flag
  layers: unknown[]; // 복잡한 레이어 구조
  assets: unknown[]; // 에셋 배열
  meta?: {
    // 메타데이터
    g?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown; // 기타 속성들
}

interface CharacterProps {
  animationData: LottieAnimationData;
  dataBall: string;
  characterIndex: number;
}

const Character: React.FC<CharacterProps> = ({
  animationData,
  dataBall,
  characterIndex,
}) => {
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
