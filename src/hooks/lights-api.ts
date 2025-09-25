// hooks/lights-api.ts
export const BASE_URL = "https://horong.goorm.training";

export type ZoomLevel =
  | "ZOOM_1" // 가장 세밀
  | "ZOOM_2"
  | "ZOOM_3"
  | "ZOOM_4"
  | "ZOOM_5"
  | "ZOOM_6"; // 가장 넓음

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
  signal?: AbortSignal;
}

/** 구글맵 zoom≈(3~21) → 서버 ZOOM_1~6 매핑 */
export function mapZoomToLevel(zoom: number): ZoomLevel {
  // 서버 enum (radius/precision) 기준 6단계로 압축 매핑
  if (zoom >= 20) return "ZOOM_1";
  if (zoom >= 15) return "ZOOM_2";
  if (zoom >= 13) return "ZOOM_3";
  if (zoom >= 11) return "ZOOM_4";
  if (zoom >= 9) return "ZOOM_5";
  return "ZOOM_6";
}

/** 가로등 좌표 조회 (Swagger 스펙 반영) */
export async function fetchLights({
  latitude,
  longitude,
  zoomLevel,
  signal,
}: GetLightsParams): Promise<LightPoint[]> {
  const u = new URL("/api/map/lights", BASE_URL);
  u.searchParams.set("latitude", String(latitude));
  u.searchParams.set("longitude", String(longitude));
  u.searchParams.set("zoomLevel", zoomLevel);

  const urlStr = u.toString();

  console.groupCollapsed(
    "%c[lights] GET /api/map/lights",
    "color:#6aa9ff;font-weight:600;"
  );
  console.debug("→ URL:", urlStr);
  console.debug("→ Params:", { latitude, longitude, zoomLevel });
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
