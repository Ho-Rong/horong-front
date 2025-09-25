// hooks/useCctvLayer.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Icon } from "@/components/Icon/Icon";
import {
  fetchCams,
  mapZoomToLevel,
  type CamPoint,
  type ZoomLevel,
} from "@/hooks/cams-api";

/** count → 버킷 → 픽셀 크기 테이블 (원하는 감도로 조정 가능) */
type Bucket = "tri" | "s1" | "s2" | "s3" | "s4" | "m1" | "m2" | "m3" | "lg";

function bucketByCount(count: number): Bucket {
  if (count <= 1) return "tri";
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
  tri: 40,
  s1: 50,
  s2: 44,
  s3: 38,
  s4: 32,
  m1: 70,
  m2: 64,
  m3: 58,
  lg: 90,
};

/* ---------- UI 팩토리 ---------- */

function makeTriangleIcon(count: number, side = 40) {
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
      // 최상위 SVG에 기본 의도 전달
      style={{ fill: "#F86571", stroke: "none" }}
    />
  );
  wrap.innerHTML = iconMarkup;

  // ✅ 어떤 글로벌/내부 스타일에도 불구하고 테두리 제거
  const svg = wrap.querySelector("svg") as SVGElement | null;
  if (svg) {
    svg.setAttribute("stroke", "none");
    svg.style.display = "block"; // 여백/라인 보정
    svg.style.overflow = "visible";
  }
  wrap
    .querySelectorAll("path,polygon,polyline,line,circle,ellipse,rect")
    .forEach((el) => {
      el.setAttribute("stroke", "none");
      // 혹시 stroke-width가 남아 있으면 0으로
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
/** 그라데이션 원: 코어 + 라벨 (심플 CSS glow) */
function makeGlowCircle(count: number, px: number) {
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

/* ---------- 훅 ---------- */

export type UseCctvLayerOptions = {
  initialEnabled?: boolean; // 기본: 꺼짐
  cooldownMs?: number; // 기본: 700ms
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

export function useCctvLayer(
  map: google.maps.Map | null,
  opts: UseCctvLayerOptions = {}
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

  const buildMarkers = async (points: CamPoint[]) => {
    const { AdvancedMarkerElement } = (await google.maps.importLibrary(
      "marker"
    )) as google.maps.MarkerLibrary;

    return points.map((p) => {
      const b = bucketByCount(p.count);
      const px = BUCKET_PX[b];

      const content =
        b === "tri"
          ? makeTriangleIcon(p.count, px)
          : makeGlowCircle(p.count, px);

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

    fetchCams({
      latitude: lat,
      longitude: lng,
      zoomLevel: level,
      signal: ac.signal,
    })
      .then(buildMarkers)
      .then((markers) => {
        if (!enabledRef.current || myGen !== genRef.current) return;

        // 교체
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
        console.warn("[cctv] fetch failed:", e);
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
