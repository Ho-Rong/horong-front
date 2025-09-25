"use client";
import * as styles from "./ReportModal.css";
import { useState, useRef, useEffect } from "react";
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
  currentLocation?: ReportData["location"] | null;
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
  latitude: 37.665,
  longitude: 16.978,
  address: "서울특별시 중구 을지로 100번길",
};

export const ReportModal = ({
  isOpen,
  onClose,
  onReport,
  currentLocation,
}: ReportModalProps) => {
  const [description, setDescription] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen || showSuccess) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.overflow = "hidden";
      document.body.style.width = "100%";

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.overflow = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, showSuccess]);

  // 수정된 API 호출 함수
  const submitReport = async (reportData: ReportData) => {
    const formData = new FormData();

    // 이미지 파일들을 file1, file2, file3으로 전송
    reportData.images.forEach((file, index) => {
      const fieldName = `file${index + 1}`;
      formData.append(fieldName, file);
      console.log(`전송할 파일 ${index + 1}:`, file.name, file.type, file.size);
    });

    // 텍스트 필드 추가 (API 문서에 맞게 'text'로 전송)
    formData.append("text", reportData.description);

    const queryParams = new URLSearchParams({
      reporter: "불땡이", // TODO: 실제 사용자 이름으로 변경
      latitude: reportData.location.latitude.toString(),
      longitude: reportData.location.longitude.toString(),
      reportType: "ADD",
    });

    console.log(
      "전송 URL:",
      `https://horong.goorm.training/api/report?${queryParams}`
    );
    console.log("전송 데이터 - 텍스트:", reportData.description);
    console.log("전송 데이터 - 위치:", reportData.location);
    console.log("전송 데이터 - 이미지 수:", reportData.images.length);

    // FormData 내용 확인 (디버깅용)
    console.log("FormData 내용:");
    for (const pair of formData.entries()) {
      if (pair[1] instanceof File) {
        console.log(`${pair[0]}: File(${pair[1].name}, ${pair[1].size} bytes)`);
      } else {
        console.log(`${pair[0]}: ${pair[1]}`);
      }
    }

    try {
      const response = await fetch(
        `https://horong.goorm.training/api/report?${queryParams}`,
        {
          method: "POST",
          body: formData,
          // Content-Type 헤더를 명시적으로 설정하지 않음 (브라우저가 자동으로 multipart/form-data로 설정)
        }
      );

      console.log("응답 상태:", response.status);
      console.log("응답 헤더:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API 에러 응답:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const result = await response.json();
      console.log("신고 성공:", result);
      return result;
    } catch (error) {
      console.error("신고 실패:", error);
      throw error;
    }
  };

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

  // 실제 API와 연동된 등록 함수
  const handleReport = async () => {
    const locationToUse = currentLocation || MOCK_LOCATION;

    const reportData: ReportData = {
      description,
      images: selectedImages,
      location: currentLocation || MOCK_LOCATION,
    };

    try {
      // 실제 API 호출
      await submitReport(reportData);

      // 기존 onReport도 호출 (상위 컴포넌트에서 처리할 수 있도록)
      onReport(reportData);

      setShowSuccess(true);
    } catch (error) {
      console.error("신고 실패:", error);
      // 사용자에게 에러 알림
      alert("신고 중 오류가 발생했습니다. 다시 시도해주세요.");
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
    console.log("File change event triggered");
    const files = Array.from(event.target.files || []);
    console.log("Selected files:", files.length);

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    console.log("Image files:", imageFiles.length);

    if (imageFiles.length > 0) {
      const availableSlots = 3 - selectedImages.length;
      const filesToAdd = imageFiles.slice(0, availableSlots);

      setSelectedImages((prev) => {
        const newImages = [...prev, ...filesToAdd];
        console.log("New images array length:", newImages.length);
        return newImages;
      });
    }

    // 파일 입력 초기화
    if (event.target) {
      event.target.value = "";
    }
  };

  // 테스트용 함수
  const handleTestClick = async () => {
    const createDummyFile = (): Promise<File> => {
      return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.fillStyle = "red";
          ctx.fillRect(0, 0, 50, 50);
          ctx.fillStyle = "blue";
          ctx.fillRect(50, 50, 50, 50);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            const testFile = new File([blob], "test.png", {
              type: "image/png",
            });
            resolve(testFile);
          }
        }, "image/png");
      });
    };

    try {
      const testFile = await createDummyFile();

      const testData = {
        description: "테스트 신고입니다",
        images: [testFile],
        location: {
          latitude: 33.2541,
          longitude: 126.5597,
          address: "제주 서귀포시",
        },
      };

      await submitReport(testData);
      console.log("테스트 완료!");
      alert("테스트 성공!");
    } catch (error) {
      console.error("테스트 실패:", error);
      alert("테스트 실패: " + error);
    }
  };

  // 마우스 드래그 이벤트 핸들러들
  const handleMouseDown = (e: React.MouseEvent) => {
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
    const walk = (x - startX) * 2;
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
                  key={`file-input-${selectedImages.length}`}
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
                    userSelect: "none",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    transition: "none",
                  }}
                >
                  {selectedImages.map((file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${index}`}
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
                          objectFit: "cover",
                          objectPosition: "center",
                          pointerEvents: "none",
                        }}
                        draggable={false}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log(
                            `Removing image at index: ${index}`,
                            selectedImages.length
                          );
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
                          zIndex: 100,
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
                        console.log("Add button clicked");
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
