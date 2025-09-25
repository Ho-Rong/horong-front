export type ClusterSize = "small" | "medium" | "large";

// 예시 기준(원하는 값으로 조정)
export function getClusterSizeByCount(count: number): ClusterSize {
  if (count >= 20) return "large";
  if (count >= 5) return "medium";
  return "small";
}

// 각 사이즈별 픽셀 박스 (Lottie 컨테이너 크기)
export const CLUSTER_PIXELS: Record<ClusterSize, number> = {
  small: 30,
  medium: 60,
  large: 100,
};
