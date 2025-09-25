export const BASE_URL = "https://horong.goorm.training";

export type ZoomLevel = "ZOOM_2" | "ZOOM_3" | "ZOOM_4" | "ZOOM_5"; // 가장 넓음  ← API 스펙에 맞춰 ZOOM_6 제거

// 서버 응답 스키마 반영 (count 포함)
export interface LightPoint {
  latitude: number;
  longitude: number;
  count: number;
}

export interface GetLightsParams {
  latitude: number;
  longitude: number;
  zoomLevel: ZoomLevel;
  /** 새 파라미터: API 필수 */
  gridSize?: number; // degree 단위
  signal?: AbortSignal;
}

/** 구글맵 zoom≈(3~21) → 서버 ZOOM_1~5 매핑 (API 스펙에 맞춤) */
export function mapZoomToLevel(zoom: number): ZoomLevel {
  if (zoom >= 20) return "ZOOM_2";
  if (zoom >= 17) return "ZOOM_3";
  if (zoom >= 13) return "ZOOM_4";
  return "ZOOM_5";
}

/** 줌 레벨 → gridSize(도 단위) 매핑 */
export function gridSizeForLevel(level: ZoomLevel): number {
  switch (level) {
    case "ZOOM_2":
      return 999;
    case "ZOOM_3":
      return 999;
    case "ZOOM_4":
      return 500;
    case "ZOOM_5":
      return 10;
  }
}

/** 가로등 좌표 조회 (Swagger 스펙 반영: gridSize 추가) */
export async function fetchLights({
  latitude,
  longitude,
  zoomLevel,
  gridSize, // ⬅️ 추가
  signal,
}: GetLightsParams): Promise<LightPoint[]> {
  const u = new URL("/api/map/lights", BASE_URL);
  u.searchParams.set("latitude", String(latitude));
  u.searchParams.set("longitude", String(longitude));
  u.searchParams.set("zoomLevel", zoomLevel);
  // gridSize가 안 넘어오면 레벨 기반 기본값 사용
  const gs = gridSize ?? gridSizeForLevel(zoomLevel);
  u.searchParams.set("gridSize", String(gs));

  const urlStr = u.toString();

  console.groupCollapsed(
    "%c[lights] GET /api/map/lights",
    "color:#6aa9ff;font-weight:600;"
  );
  console.debug("→ URL:", urlStr);
  console.debug("→ Params:", { latitude, longitude, zoomLevel, gridSize: gs });
  console.time("[lights] fetch latency");
  try {
    const res = await fetch(urlStr, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    console.timeEnd("[lights] fetch latency");
    console.debug("← Status:", res.status, res.statusText);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[lights] !res.ok payload:", text);
      throw new Error(`Lights API ${res.status}: ${text}`);
    }

    const data = (await res.json()) as LightPoint[];
    console.log("응답", data);
    console.debug("← Count:", Array.isArray(data) ? data.length : 0);
    if (Array.isArray(data) && data.length)
      console.debug("← Sample(5):", data.slice(0, 5));
    console.groupEnd();
    return data ?? [];
  } catch (err) {
    console.timeEnd("[lights] fetch latency");
    if ((err as any)?.name === "AbortError")
      console.info("[lights] fetch aborted");
    else console.error("[lights] fetch error:", err);
    console.groupEnd();
    throw err;
  }
}
