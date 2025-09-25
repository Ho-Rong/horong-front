"use client";

import { useModal } from "@/hooks/useModal";
import { Button } from "@vapor-ui/core";
import {ReportModal} from "@/components/modals/ReportModal";

interface ReportData {
  description: string;
  images: File[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export default function Page() {
  const { isOpen, open, close } = useModal();

  const handleReport = (data: ReportData) => {
    // 여기서 실제 API 호출
    // await reportAPI.submit(data);

    alert("신고가 접수되었습니다.");
  };
  return (
    <div>
      {/* 신고 버튼 */}
      <Button onClick={open}>신고하기</Button>
      <ReportModal isOpen={isOpen} onClose={close} onReport={handleReport} />
    </div>
  );
}
