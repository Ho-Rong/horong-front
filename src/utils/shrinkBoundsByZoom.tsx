export function clampZoomTemporarily(
  map: google.maps.Map,
  zoom: number,
  ms = 260
) {
  const prevMin = (map.get("minZoom") as number | undefined) ?? undefined;
  const prevMax = (map.get("maxZoom") as number | undefined) ?? undefined;

  map.setOptions({ minZoom: zoom, maxZoom: zoom });
  requestAnimationFrame(() => map.moveCamera({ zoom }));

  window.setTimeout(() => {
    map.setOptions({ minZoom: prevMin, maxZoom: prevMax });
  }, ms);
}

const EPS = 1e-3;

export default function slightZoomInOnce(
  map: google.maps.Map,
  delta = 0.4,
  flagRef: React.MutableRefObject<boolean>
) {
  if (flagRef.current) return;
  const z = map.getZoom() ?? 10;
  map.moveCamera({ zoom: z + delta });
  flagRef.current = true;
}

/** 특정 구간 동안 현재 줌을 잠그고, 끝나면 (선택적으로) 살짝 확대 */
export async function lockZoomAround(
  map: google.maps.Map,
  ms: number,
  opts?: { afterDelta?: number }
) {
  const z = map.getZoom() ?? 10;
  clampZoomTemporarily(map, z, ms);
  // 내부에서 fitBounds 같은 게 들어와도, 락 풀린 직후 우리가 다시 미세 확대
  window.setTimeout(() => {
    if (opts?.afterDelta && Math.abs((map.getZoom() ?? 10) - z) < 0.75) {
      // 크게 바뀐 게 없다면만 덧댐
      map.moveCamera({ zoom: (map.getZoom() ?? z) + opts.afterDelta });
    }
  }, ms + 0);
}

export function shrinkBoundsByZoom(
  bounds: google.maps.LatLngBounds,
  zoomDelta: number
) {
  const scale = Math.pow(2, zoomDelta); // 2^0.4 ≈ 1.3195
  const f = 1 / scale; // ≈ 0.758

  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const c = bounds.getCenter();

  const newSw = new google.maps.LatLng(
    c.lat() + (sw.lat() - c.lat()) * f,
    c.lng() + (sw.lng() - c.lng()) * f
  );
  const newNe = new google.maps.LatLng(
    c.lat() + (ne.lat() - c.lat()) * f,
    c.lng() + (ne.lng() - c.lng()) * f
  );

  return new google.maps.LatLngBounds(newSw, newNe);
}
