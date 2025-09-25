"use client";
import * as styles from "./ReportModal.css";
import { useState, useRef } from "react";
import React from "react";
import { UploadIcon } from "../Icon/uploadIcon";
import { CloseIcon } from "../Icon/close";
import { LocationIcon } from "../Icon/Location";
import { MinusIcon } from "../Icon/MinusIcon";

import {
  Box,
  HStack,
  Flex,
  Button,
  Textarea,
  InputGroup,
  Text,
} from "@vapor-ui/core";
import { HorongSuccess } from "../HorongSuccess/HorongSuccess";

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
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 버튼 활성화 조건 체크 (텍스트 입력 + 이미지 1개 이상 첨부)
  const isFormValid =
    description.trim().length > 0 && selectedImages.length > 0;

  // 마우스 드래그를 위한 상태
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleUploadAreaClick = () => {
    if (fileInputRef.current) {
      // 기존 파일 선택 초기화
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleReport = () => {
    const reportData: ReportData = {
      description,
      images: selectedImages,
      location: MOCK_LOCATION,
    };

    try {
      onReport(reportData);
      setShowSuccess(true);
    } catch (error) {
      console.error("신고 실패:", error);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    handleClose();
  };

  const handleClose = () => {
    setDescription("");
    setSelectedImages([]);
    onClose();
  };

  const removeImage = (index: number) => {
    console.log(`Before removal: ${selectedImages.length} images`);
    setSelectedImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index);
      console.log(`After removal: ${newImages.length} images`);
      return newImages;
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File change event triggered"); // 디버그용
    const files = Array.from(event.target.files || []);
    console.log("Selected files:", files.length); // 디버그용

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    console.log("Image files:", imageFiles.length); // 디버그용

    if (imageFiles.length > 0) {
      const availableSlots = 3 - selectedImages.length;
      const filesToAdd = imageFiles.slice(0, availableSlots);

      setSelectedImages((prev) => {
        const newImages = [...prev, ...filesToAdd];
        console.log("New images array length:", newImages.length); // 디버그용
        return newImages;
      });
    }

    // 파일 입력 초기화
    if (event.target) {
      event.target.value = "";
    }
  };

  // 마우스 드래그 이벤트 핸들러들
  const handleMouseDown = (e: React.MouseEvent) => {
    // 삭제 버튼을 클릭한 경우 드래그 시작하지 않음
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }

    if (!scrollContainerRef.current) return;

    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // 스크롤 속도 조절
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {!showSuccess && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.closeBackground} onClick={handleClose}>
              <CloseIcon />
            </div>
            <div style={{ marginTop: "13px" }}>
              <Text className={styles.title}>빛이 필요한 곳을 알려주세요</Text>
            </div>
            <Flex
              style={{
                gap: "8px",
                alignItems: "center",
                marginBottom: "6px",
                marginTop: "12px",
              }}
            >
              <Text className={styles.label}>사진</Text>
              <Text className={styles.error}>
                사진은 최대 3장까지 첨부 가능합니다!
              </Text>
            </Flex>

            {selectedImages.length === 0 ? (
              <div style={{ transition: "none" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  key={`file-input-${selectedImages.length}`} // key 추가로 강제 리렌더링
                />
                <div
                  className={styles.uploadArea}
                  onClick={handleUploadAreaClick}
                  style={{ transition: "none", animation: "none" }}
                >
                  <div className={styles.uploadContent}>
                    <div className={styles.iconBackground}>
                      <UploadIcon />
                    </div>
                    <div className={styles.uploadText}>
                      이미지를 첨부해주세요
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <div
                  ref={scrollContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    display: "flex",
                    gap: "12px",
                    overflowX: "auto",
                    padding: "8px 0",
                    marginBottom: "16px",
                    cursor: isDragging ? "grabbing" : "grab",
                    userSelect: "none", // 텍스트 선택 방지
                    // 스크롤바 숨기기
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    // 애니메이션 제거
                    transition: "none",
                  }}
                >
                  {selectedImages.map((file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${index}`} // 더 고유한 key
                      style={{
                        position: "relative",
                        flexShrink: 0,
                        width: "120px",
                        height: "116px",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover", // 박스를 가득 채우면서 비율 유지
                          objectPosition: "center", // 이미지 중앙 정렬
                          pointerEvents: "none", // 이미지 드래그 방지
                        }}
                        draggable={false}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation(); // 드래그 이벤트 전파 방지
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log(
                            `Removing image at index: ${index}`,
                            selectedImages.length
                          ); // 디버그용
                          removeImage(index);
                        }}
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          fontWeight: "bold",
                          zIndex: 100, // z-index를 더 높게
                        }}
                      >
                        <MinusIcon></MinusIcon>
                      </button>
                    </div>
                  ))}

                  {selectedImages.length < 3 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Add button clicked"); // 디버그용
                        if (!isDragging) {
                          handleUploadAreaClick();
                        }
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "120px",
                        height: "116px",
                        border: "2px dashed #ccc",
                        borderRadius: "8px",
                        backgroundColor: "#f9f9f9",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontSize: "24px", color: "#999" }}>+</div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          marginTop: "4px",
                        }}
                      >
                        추가
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            <Flex
              style={{ alignItems: "center", gap: "6px", marginBottom: "25px" }}
            >
              <LocationIcon />
              <Text className={styles.nowLocation}>
                제주 서귀포시 성산읍 일주동로 4316 303
              </Text>
            </Flex>

            <Text className={styles.label}>신고사항</Text>
            <InputGroup.Root>
              <Textarea
                className={styles.textarea}
                placeholder="어떤 문제가 있는지 자세히 알려주세요."
                maxLength={200}
                rows={4}
                value={description} // 추가: value 연결
                onChange={(e) => setDescription(e.target.value)} // 추가: onChange 연결
              />
              <InputGroup.Counter />
            </InputGroup.Root>

            <Button
              className={styles.button}
              stretch
              onClick={handleReport}
              disabled={!isFormValid}
              style={{
                backgroundColor: !isFormValid ? "#838383" : undefined,
                cursor: !isFormValid ? "not-allowed" : undefined,
              }}
            >
              등록하기
            </Button>
          </div>
        </div>
      )}
      <HorongSuccess isOpen={showSuccess} onClose={handleSuccessClose} />
    </>
  );
};
