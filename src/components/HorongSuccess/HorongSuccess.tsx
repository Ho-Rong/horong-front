import React from "react";
import { overlay, successText } from "./HorongSuccess.css";
import { Button, Flex, Text } from "@vapor-ui/core";
import Lottie from "lottie-react";
import HorongAnimation from "./HorongSuccess.json";
import { useRouter } from "next/navigation";

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
      <Flex flexDirection="column" gap="$200">
        <Text className={successText}>
          어두운 길 신고 완료! <br></br>새로운 호롱이가 찾아왔어요
        </Text>
        <Lottie
          animationData={HorongAnimation}
          loop={true}
          autoplay={true}
          style={{ width: "190px", height: "190px" }}
        />

        <Text
          style={{
            color: "var(--vapor-color-white)",
          }}
        >
          호롱이 등쟝
        </Text>
        <Flex>
          <Button onClick={onClose}>뒤로가기</Button>
          <Button onClick={handleGoToFarm}>바로 보러가기</Button>
        </Flex>
      </Flex>
    </div>
  );
};
