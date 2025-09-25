import React from "react";
import {
  overlay,
  successText,
  text1,
  text2,
  text,
  registraion,
  close,
} from "./HorongSuccess.css";
import { Button, Flex, Text } from "@vapor-ui/core";
import Lottie from "lottie-react";
import HorongAnimation from "./HorongSuccess.json";
import { useRouter } from "next/navigation";
import { GradientBackground } from "../Icon/GradientBackground";

interface HorongSuccessProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HorongSuccess: React.FC<HorongSuccessProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  if (!isOpen) return null;

  const handleGoToFarm = () => {
    router.push("/farm"); // /farm 페이지로 이동
  };

  return (
    <div className={overlay}>
      <Flex flexDirection="column" gap="$200" alignItems="center">
        <GradientBackground
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: -1,
            pointerEvents: "none",
          }}
        />
        <div className={successText}>
          <div className={text1}>신고 완료!</div>
          <div className={text2}>새로운 호롱이를 만났어요</div>
        </div>
        <Lottie
          animationData={HorongAnimation}
          loop={true}
          autoplay={true}
          style={{ width: "284px", height: "284px" }}
        />

        <div style={{ textAlign: "center", color: "var(--vapor-color-white)" }}>
          <div className={text}>길을 밝혀갈수록</div>
          <div className={text}>다양한 호롱이를 만날 수 있어요</div>
        </div>
        <Flex gap={"$200"} style={{ marginTop: "50px" }}>
          <Button stretch className={close} onClick={onClose}>
            닫기
          </Button>
          <Button className={registraion} stretch onClick={handleGoToFarm}>
            등록하기
          </Button>
        </Flex>
      </Flex>
    </div>
  );
};
