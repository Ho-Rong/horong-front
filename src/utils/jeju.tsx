// utils/jeju.ts
export type LatLngLike = { latitude: number; longitude: number };

// 제주 본섬 실제 해안선 좌표 (단순화 버전)
const JEJU_POLY: Array<{ lat: number; lng: number }> = [
  { lat: 33.552166, lng: 126.142822 },
  { lat: 33.489759, lng: 126.1586 },
  { lat: 33.430771, lng: 126.215515 },
  { lat: 33.361268, lng: 126.241608 },
  { lat: 33.321493, lng: 126.298523 },
  { lat: 33.280422, lng: 126.338348 },
  { lat: 33.246556, lng: 126.408386 },
  { lat: 33.218451, lng: 126.478424 },
  { lat: 33.204398, lng: 126.545029 },
  { lat: 33.224788, lng: 126.615067 },
  { lat: 33.262537, lng: 126.682358 },
  { lat: 33.298531, lng: 126.73008 },
  { lat: 33.348338, lng: 126.780548 },
  { lat: 33.407059, lng: 126.820374 },
  { lat: 33.463188, lng: 126.855736 },
  { lat: 33.515178, lng: 126.879425 },
  { lat: 33.550435, lng: 126.912384 },
  { lat: 33.581945, lng: 126.977615 },
  { lat: 33.553736, lng: 127.019501 },
  { lat: 33.496451, lng: 127.023621 },
  { lat: 33.43739, lng: 126.995468 },
  { lat: 33.380065, lng: 126.948776 },
  { lat: 33.326617, lng: 126.889038 },
  { lat: 33.289395, lng: 126.81794 },
  { lat: 33.249501, lng: 126.749916 },
  { lat: 33.215918, lng: 126.677818 },
  { lat: 33.191562, lng: 126.603317 },
  { lat: 33.181078, lng: 126.5271 },
  { lat: 33.190418, lng: 126.445732 },
  { lat: 33.211955, lng: 126.369858 },
  { lat: 33.249215, lng: 126.2957 },
  { lat: 33.301686, lng: 126.240082 },
  { lat: 33.364306, lng: 126.20369 },
  { lat: 33.431158, lng: 126.178284 },
  { lat: 33.490308, lng: 126.146698 },
  { lat: 33.545252, lng: 126.127472 },
  { lat: 33.586608, lng: 126.142822 },
];

// 바운딩 박스 (빠른 선필터용)
export const JEJU_BBOX = {
  minLat: 33.17,
  maxLat: 33.6,
  minLng: 126.12,
  maxLng: 127.03,
};

export function inJejuBbox(lat: number, lng: number) {
  return (
    lat >= JEJU_BBOX.minLat &&
    lat <= JEJU_BBOX.maxLat &&
    lng >= JEJU_BBOX.minLng &&
    lng <= JEJU_BBOX.maxLng
  );
}

/** 순수 JS point-in-polygon (ray casting) */
export function pointInPolygon(
  lat: number,
  lng: number,
  poly = JEJU_POLY
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng,
      yi = poly[i].lat;
    const xj = poly[j].lng,
      yj = poly[j].lat;

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

/** 리스트에서 제주 본섬(육지) 내부만 남김 */
export function filterToJejuLand<T extends LatLngLike>(arr: T[]): T[] {
  if (!arr?.length) return [];
  const bboxFiltered = arr.filter((d) => inJejuBbox(d.latitude, d.longitude));
  if (!bboxFiltered.length) return [];
  return bboxFiltered.filter((d) => pointInPolygon(d.latitude, d.longitude));
}
