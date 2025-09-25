import { ZoomLevel } from "@/hooks/lights-api";

export type ClusterSize =
  | "1small"
  | "2small"
  | "3small"
  | "4small"
  | "1medium"
  | "2medium"
  | "3medium"
  | "large"
  | "2large";

// 예시 기준(원하는 값으로 조정)
export function getClusterSizeByCount(
  count: number,
  zoom: ZoomLevel
): ClusterSize {
  if (zoom === "ZOOM_5") {
    if (count >= 5500) return "large";
    if (count >= 4000) return "2medium";
    if (count >= 3000) return "3medium";
    if (count >= 2000) return "1small";
    if (count >= 1000) return "1small";
    return "2small";
  }

  /*  if (zoom === "ZOOM_2") {
    if (count >= 5500) return "large";
    if (count >= 4000) return "2medium";
    if (count >= 3000) return "3medium";
    if (count >= 2000) return "1small";
    if (count >= 1000) return "1small";
    return "2small";
  }

  if (zoom === "ZOOM_3") {
    if (count >= 5500) return "large";
    if (count >= 4000) return "2medium";
    if (count >= 3000) return "3medium";
    if (count >= 2000) return "1small";
    if (count >= 1000) return "1small";
    return "2small";
  }

  if (zoom === "ZOOM_4") {
    if (count >= 5500) return "large";
    if (count >= 4000) return "2medium";
    if (count >= 3000) return "3medium";
    if (count >= 2000) return "1small";
    if (count >= 1000) return "1small";
    return "2small";
  }*/

  // 기본 (세밀 줌)
  if (count >= 400) return "large";
  if (count >= 300) return "1medium";
  if (count >= 200) return "2medium";
  if (count >= 100) return "3medium";
  if (count >= 70) return "1small";
  if (count >= 50) return "2small";
  if (count >= 30) return "3small";
  return "4small";
}
// 각 사이즈별 픽셀 박스 (Lottie 컨테이너 크기)
export const CLUSTER_PIXELS: Record<ClusterSize, number> = {
  "1small": 20,
  "2small": 30,
  "3small": 40,
  "4small": 50,
  "1medium": 60,
  "2medium": 70,
  "3medium": 80,
  large: 100,
  "2large": 90,
};
