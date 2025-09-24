"use client";
import {
  overlay,
  modal,
  imageContainer,
  imagePreview,
  previewImage,
  deleteButton,
  fileName,
  scrollContainer,
} from "./report-modal.css";
import { useState } from "react";
import React from "react";
import { Box, Button, Textarea, Flex } from "@vapor-ui/core";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReport: (data: ReportData) => void;
}

interface ReportData {
  description: string;
  images: File[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

// 목 데이터
const MOCK_LOCATION = {
  latitude: 37.5665,
  longitude: 126.978,
  address: "서울특별시 중구 을지로 100번길",
};

export const ReportModal = ({
  isOpen,
  onClose,
  onReport,
}: ReportModalProps) => {
  const [description, setDescription] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(files);
  };

  const removeImage = (indexToRemove: number) => {
    setSelectedImages(
      selectedImages.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleReport = () => {
    const reportData: ReportData = {
      description,
      images: selectedImages,
      location: MOCK_LOCATION,
    };

    onReport(reportData);
    handleClose();
  };

  const handleClose = () => {
    setDescription("");
    setSelectedImages([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={overlay}>
      <div className={modal}>
        <h2>신고하기</h2>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
        />

        {selectedImages.length > 0 && (
          <Flex gap="$200" className={scrollContainer}>
            {selectedImages.map((file, index) => (
              <div key={index} className={imageContainer}>
                <div className={imagePreview}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className={previewImage}
                  />
                </div>
                <button
                  onClick={() => removeImage(index)}
                  className={deleteButton}
                >
                  ×
                </button>
                <div className={fileName}>{file.name}</div>
              </div>
            ))}
          </Flex>
        )}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          width="100%"
        >
          <Textarea placeholder="여러 줄 텍스트를 입력하세요..." />
        </Box>

        {/* 버튼 */}
        <div>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleReport}>신고</Button>
        </div>
      </div>
    </div>
  );
};
