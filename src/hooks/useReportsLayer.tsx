// hooks/useReportsLayer.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Icon } from "@/components/Icon/Icon";
import {
  fetchReports,
  mapZoomToLevel,
  type ReportPoint,
  type ZoomLevel,
} from "@/hooks/reports-api";

/** count → 버킷 → 픽셀 사이즈 (CCTV와 동일 감도) */
type Bucket = "sq" | "s1" | "s2" | "s3" | "s4" | "m1" | "m2" | "m3" | "lg";

function bucketByCount(count: number): Bucket {
  if (count <= 1) return "sq";
  if (count >= 400) return "lg";
  if (count >= 300) return "m1";
  if (count >= 200) return "m2";
  if (count >= 100) return "m3";
  if (count >= 70) return "s1";
  if (count >= 50) return "s2";
  if (count >= 30) return "s3";
  return "s4";
}

const BUCKET_PX: Record<Bucket, number> = {
  sq: 40,
  s1: 50,
  s2: 44,
  s3: 38,
  s4: 32,
  m1: 70,
  m2: 64,
  m3: 58,
  lg: 90,
};

/** 🔷 동그라미(파란 glow): 안쪽 투명 → 바깥 파랗게 */
function makeBlueGlowCircle(count: number, px: number) {
  const wrap = document.createElement("div");
  wrap.style.position = "absolute";
  wrap.style.transform = "translate(-50%, -50%)";
  wrap.style.width = `${px}px`;
  wrap.style.height = `${px}px`;
  wrap.style.pointerEvents = "none";
  wrap.style.backgroundColor = "transparent";

  const core = document.createElement("div");
  core.style.position = "absolute";
  core.style.inset = "0";
  core.style.borderRadius = "50%";
  core.style.background =
    "radial-gradient(70.49% 70.46% at 50.35% 50%, rgba(217,141,147,0.20) 0%, #D98D93 100%)";
  core.style.boxShadow = `0 0 ${Math.round(px * 0.45)}px ${Math.round(
    px * 0.18
  )}px rgba(217,141,147,0.35)`;
  (core.style as any).willChange = "transform";

  const label = document.createElement("div");
  label.textContent = String(count);
  label.style.position = "absolute";
  label.style.inset = "0";
  label.style.display = "grid";
  (label.style as any).placeItems = "center";
  label.style.color = "#fff";
  label.style.fontWeight = "700";
  label.style.fontFamily =
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  label.style.userSelect = "none";
  label.style.fontSize = "12px";

  wrap.appendChild(core);
  wrap.appendChild(label);
  return wrap;
}

/** 🟦 사각형 클러스터(Icon square) + 파란 그라데이션 */
function makeSquareIcon(count: number, side = 40) {
  const wrap = document.createElement("div");
  wrap.style.width = `${side}px`;
  wrap.style.height = `${side}px`;
  wrap.style.transform = "translate(-50%, -50%)";
  wrap.style.position = "absolute";
  wrap.style.display = "grid";
  (wrap.style as any).placeItems = "center";
  wrap.style.userSelect = "none";
  wrap.style.pointerEvents = "none";

  const iconMarkup = renderToStaticMarkup(
    <Icon
      name="triangle"
      width={side}
      height={side}
      style={{ fill: "#F86571", stroke: "none" }}
    />
  );
  wrap.innerHTML = iconMarkup;

  const svg = wrap.querySelector("svg") as SVGElement | null;
  if (svg) {
    svg.setAttribute("stroke", "none");
    svg.style.display = "block";
    svg.style.overflow = "visible";
  }
  wrap
    .querySelectorAll("path,polygon,polyline,line,circle,ellipse,rect")
    .forEach((el) => {
      (el as SVGElement).setAttribute("stroke", "none");
      (el as SVGElement).setAttribute("stroke-width", "0");
    });

  const label = document.createElement("div");
  label.textContent = String(count);
  label.style.position = "absolute";
  label.style.inset = "0";
  label.style.display = "grid";
  (label.style as any).placeItems = "center";
  label.style.color = "#fff";
  label.style.fontWeight = "800";
  label.style.fontSize = "14px";
  label.style.fontFamily =
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  label.style.pointerEvents = "none";
  label.style.textShadow = "0 1px 2px rgba(0,0,0,0.35)";
  wrap.appendChild(label);

  return wrap;
}

/* ---------- 훅 ---------- */

export type UseReportsLayerOptions = {
  initialEnabled?: boolean;
  cooldownMs?: number;
};

type LatLng = { lat: number; lng: number };
function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function moveThresholdMeters(zoom: number): number {
  if (zoom >= 20) return 20;
  if (zoom >= 18) return 50;
  if (zoom >= 15) return 100;
  return 300;
}

export function useReportsLayer(
  map: google.maps.Map | null,
  opts: UseReportsLayerOptions = {}
) {
  const cooldownMs = opts.cooldownMs ?? 700;
  const [enabled, setEnabled] = useState<boolean>(opts.initialEnabled ?? false);

  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const cacheRef = useRef<ReportPoint[] | null>(null);

  const inflightRef = useRef<AbortController | null>(null);
  const genRef = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);
  const lastQueryRef = useRef<{
    lat: number;
    lng: number;
    level: ZoomLevel;
    ts: number;
  } | null>(null);

  // 뷰포트 스냅샷 키(너무 잦은 업데이트 방지용 소수점 절삭)
  const viewportKey = useMemo(() => {
    if (!map) return "none";
    const z = map.getZoom() ?? 0;
    const c = map.getCenter();
    const lat = c?.lat ? Number(c.lat().toFixed(3)) : 0;
    const lng = c?.lng ? Number(c.lng().toFixed(3)) : 0;
    return `${z}:${lat},${lng}`;
  }, [map?.getZoom?.(), map?.getCenter?.()?.lat(), map?.getCenter?.()?.lng()]);

  const buildMarkers = async (points: ReportPoint[]) => {
    const { AdvancedMarkerElement } = (await google.maps.importLibrary(
      "marker"
    )) as google.maps.MarkerLibrary;

    return points.map((p) => {
      const b = bucketByCount(p.count);
      const px = BUCKET_PX[b];
      const content =
        b === "sq"
          ? makeSquareIcon(p.count, px)
          : makeBlueGlowCircle(p.count, px);

      return new AdvancedMarkerElement({
        position: { lat: p.latitude, lng: p.longitude },
        content,
        zIndex: 1000 + Math.min(p.count, 999),
      });
    });
  };

  const runFetch = async (force = false) => {
    if (!map || !enabledRef.current) return;

    const center = map.getCenter();
    if (!center) return;

    const zoom = map.getZoom() ?? 10;
    const lat = center.lat();
    const lng = center.lng();
    const level = mapZoomToLevel(zoom);
    const now = Date.now();

    const last = lastQueryRef.current;
    let needFetch = force || !last;

    if (!needFetch && last) {
      const moved = haversineMeters(
        { lat: last.lat, lng: last.lng },
        { lat, lng }
      );
      const movedEnough = moved > moveThresholdMeters(zoom);
      const levelChanged = last.level !== level;
      const cooledDown = now - last.ts > cooldownMs;

      // 토글 직후 부착 마커가 없다면 강제 요청
      const hasAttached = markersRef.current.some((m) => m.map != null);

      needFetch =
        (!hasAttached && enabledRef.current) ||
        ((levelChanged || movedEnough) && cooledDown);
    }
    if (!needFetch) return;

    inflightRef.current?.abort();
    const ac = new AbortController();
    inflightRef.current = ac;
    const myGen = ++genRef.current;

    try {
      const points = await fetchReports({
        latitude: lat,
        longitude: lng,
        zoomLevel: level,
        signal: ac.signal,
      });

      cacheRef.current = points;

      const markers = await buildMarkers(points);

      // 기존 마커 detach 후 교체
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = markers;

      if (!enabledRef.current || myGen !== genRef.current) return;

      markersRef.current.forEach((m) => (m.map = map));
      lastQueryRef.current = { lat, lng, level, ts: now };
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.warn("[reports] fetch failed:", e);
    }
  };

  const trigger = (immediate = false, force = false) => {
    if (!map || !enabledRef.current) return;
    if (immediate) return void runFetch(force);
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(() => runFetch(force), 220);
  };

  // 지도 이벤트
  useEffect(() => {
    if (!map) return;

    const idleL = map.addListener("idle", () => trigger(false));
    // 초기 ON이면 즉시 강제 1회 로드
    if (enabledRef.current) trigger(true, true);

    return () => {
      inflightRef.current?.abort();
      ++genRef.current;

      if (debounceTimerRef.current)
        window.clearTimeout(debounceTimerRef.current);

      idleL.remove?.();

      // 언마운트 시에만 완전 정리
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
      cacheRef.current = null;
      lastQueryRef.current = null;
    };
  }, [map]);

  // on/off 토글 (데이터 보존, detach/attach)
  useEffect(() => {
    if (!map) return;

    if (!enabled) {
      inflightRef.current?.abort();
      ++genRef.current;
      markersRef.current.forEach((m) => (m.map = null)); // detach만
      return;
    }

    // 켜질 때: 캐시가 있으면 즉시 복구, 이후 최신화
    if (cacheRef.current && markersRef.current.length > 0) {
      markersRef.current.forEach((m) => (m.map = map));
      trigger(true, true); // 쿨다운 무시하고 갱신
    } else if (cacheRef.current && markersRef.current.length === 0) {
      (async () => {
        const markers = await buildMarkers(cacheRef.current!);
        markersRef.current = markers;
        markersRef.current.forEach((m) => (m.map = map));
        trigger(true); // 일반 갱신
      })();
    } else {
      // 캐시 없음 → 강제 최초 로드
      trigger(true, true);
    }
  }, [enabled, map, viewportKey]);

  return {
    enabled,
    show: () => setEnabled(true),
    hide: () => setEnabled(false),
    toggle: () => setEnabled((v) => !v),
    reload: (opts?: { force?: boolean }) => trigger(true, !!opts?.force),
  };
}
