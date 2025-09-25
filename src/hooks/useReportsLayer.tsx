// hooks/useReportsLayer.ts
"use client";

import { useEffect, useRef, useState } from "react";
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
  // 요청한 CSS 변수 우선 적용
  core.style.background =
    "var(--cctv-style, radial-gradient(70.49% 70.46% at 50.35% 50%, rgba(164,201,255,0.00) 0%, var(--vapor-color-blue-200) 100%))";
  core.style.boxShadow = `0 0 ${Math.round(px * 0.45)}px ${Math.round(
    px * 0.18
  )}px rgba(105,162,245,0.35)`;

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

  // 배경 그라데이션
  const badge = document.createElement("div");
  badge.style.position = "absolute";
  badge.style.inset = "0";
  badge.style.borderRadius = "8px";
  badge.style.background =
    "var(--cctv2, linear-gradient(157deg, rgba(164,201,255,0.60) 28.84%, rgba(105,162,245,0.60) 84.95%))";
  badge.style.boxShadow = "0 4px 16px rgba(105,162,245,0.35)";
  wrap.appendChild(badge);

  // 아이콘 삽입
  const iconMarkup = renderToStaticMarkup(
    <Icon
      name="square"
      width={side}
      height={side}
      style={{ fill: "transparent", stroke: "none" }}
    />
  );
  const holder = document.createElement("div");
  holder.innerHTML = iconMarkup;
  const svg = holder.querySelector("svg") as SVGElement | null;
  if (svg) {
    // ✅ 테두리 강제 제거
    svg.setAttribute("stroke", "none");
    svg.setAttribute("fill", "transparent");
    svg.style.display = "block";
    svg.style.overflow = "visible";

    svg
      .querySelectorAll("path, rect, polygon, polyline, line")
      .forEach((el) => {
        el.setAttribute("stroke", "none");
        el.setAttribute("stroke-width", "0");
      });

    wrap.appendChild(svg);
  }

  // 라벨
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
  const inflightRef = useRef<AbortController | null>(null);
  const genRef = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);
  const lastQueryRef = useRef<{
    lat: number;
    lng: number;
    level: ZoomLevel;
    ts: number;
  } | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

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

  const runFetch = () => {
    if (!map || !enabledRef.current) return;
    const center = map.getCenter();
    if (!center) return;

    const zoom = map.getZoom() ?? 10;
    const lat = center.lat();
    const lng = center.lng();
    const level = mapZoomToLevel(zoom);
    const now = Date.now();

    const last = lastQueryRef.current;
    let needFetch = !last;
    if (last) {
      const moved = haversineMeters(
        { lat: last.lat, lng: last.lng },
        { lat, lng }
      );
      const movedEnough = moved > moveThresholdMeters(zoom);
      const levelChanged = last.level !== level;
      const cooledDown = now - last.ts > cooldownMs;
      needFetch = (levelChanged || movedEnough) && cooledDown;
    }
    if (!needFetch) return;

    inflightRef.current?.abort();
    const ac = new AbortController();
    inflightRef.current = ac;
    const myGen = ++genRef.current;

    fetchReports({
      latitude: lat,
      longitude: lng,
      zoomLevel: level,
      signal: ac.signal,
    })
      .then(buildMarkers)
      .then((markers) => {
        if (!enabledRef.current || myGen !== genRef.current) return;
        markersRef.current.forEach((m) => (m.map = null));
        markersRef.current = [];
        markers.forEach((m) => {
          m.map = map!;
          markersRef.current.push(m);
        });
        lastQueryRef.current = { lat, lng, level, ts: now };
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        console.warn("[reports] fetch failed:", e);
      });
  };

  const trigger = (immediate = false) => {
    if (!map || !enabledRef.current) return;
    if (immediate) return void runFetch();
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(runFetch, 220);
  };

  useEffect(() => {
    if (!map) return;
    const ls: google.maps.MapsEventListener[] = [];
    ls.push(map.addListener("idle", () => trigger(false)));
    listenersRef.current = ls;

    if (enabledRef.current) trigger(true);

    return () => {
      inflightRef.current?.abort();
      ++genRef.current;
      if (debounceTimerRef.current)
        window.clearTimeout(debounceTimerRef.current);
      listenersRef.current.forEach((l) => l.remove());
      listenersRef.current = [];
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
      lastQueryRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (!enabled) {
      inflightRef.current?.abort();
      ++genRef.current;
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
      return;
    }
    trigger(true);
  }, [enabled, map]);

  return {
    enabled,
    show: () => setEnabled(true),
    hide: () => setEnabled(false),
    toggle: () => setEnabled((v) => !v),
    reload: () => trigger(true),
  };
}
