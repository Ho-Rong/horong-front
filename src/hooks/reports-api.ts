// hooks/reports-api.ts
export const BASE_URL = "https://horong.goorm.training";

export type ZoomLevel =
  | "ZOOM_1"
  | "ZOOM_2"
  | "ZOOM_3"
  | "ZOOM_4"
  | "ZOOM_5"
  | "ZOOM_6";

export interface ReportPoint {
  latitude: number;
  longitude: number;
  count: number;
}

export interface GetReportsParams {
  latitude: number;
  longitude: number;
  zoomLevel: ZoomLevel;
  signal?: AbortSignal;
}

/** 구글맵 zoom ≈ (3~21) → 서버 ZOOM_1~6 */
export function mapZoomToLevel(zoom: number): ZoomLevel {
  if (zoom >= 17) return "ZOOM_1";
  if (zoom >= 15) return "ZOOM_2";
  if (zoom >= 13) return "ZOOM_3";
  if (zoom >= 11) return "ZOOM_4";
  if (zoom >= 9) return "ZOOM_5";
  return "ZOOM_6";
}

/** 줌레벨 → gridSize (서버 요구 파라미터) */
export function gridSizeForLevel(level: ZoomLevel): number {
  switch (level) {
    case "ZOOM_1":
      return 0.0005; // 가장 세밀
    case "ZOOM_2":
      return 0.001;
    case "ZOOM_3":
      return 0.0025;
    case "ZOOM_4":
      return 0.005;
    case "ZOOM_5":
      return 0.01;
    case "ZOOM_6":
      return 0.02; // 가장 넓음
  }
}

/** 신고 좌표 조회 (Swagger 스펙 반영) */
export async function fetchReports({
  latitude,
  longitude,
  zoomLevel,
  signal,
}: GetReportsParams): Promise<ReportPoint[]> {
  const u = new URL("/api/map/reports", BASE_URL);
  u.searchParams.set("latitude", String(latitude));
  u.searchParams.set("longitude", String(longitude));
  u.searchParams.set("zoomLevel", zoomLevel);
  u.searchParams.set("gridSize", String(gridSizeForLevel(zoomLevel)));

  const urlStr = u.toString();

  console.groupCollapsed(
    "%c[reports] GET /api/map/reports",
    "color:#69A2F5;font-weight:600;"
  );
  console.debug("→ URL:", urlStr);
  console.debug("→ Params:", {
    latitude,
    longitude,
    zoomLevel,
    gridSize: gridSizeForLevel(zoomLevel),
  });

  const t0 = performance.now();
  try {
    const res = await fetch(urlStr, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    const ms = Math.round(performance.now() - t0);
    console.debug("← Status:", res.status, res.statusText, `(${ms} ms)`);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[reports] !res.ok payload:", text);
      throw new Error(`Reports API ${res.status}: ${text}`);
    }

    const data = (await res.json()) as ReportPoint[];
    console.debug("← Count:", Array.isArray(data) ? data.length : 0);
    if (Array.isArray(data) && data.length)
      console.debug("← Sample(5):", data.slice(0, 5));
    console.groupEnd();
    return data ?? [];
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    if ((err as any)?.name === "AbortError")
      console.info("[reports] fetch aborted", `(${ms} ms)`);
    else console.error("[reports] fetch error:", err, `(${ms} ms)`);
    console.groupEnd();
    throw err;
  }
}
