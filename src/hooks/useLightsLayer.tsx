// hooks/useLightsLayer.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getClusterSizeByCount } from "@/utils/cluster-size"; // (count:number)=>"small"|"medium"|"large"
import { createCssGlowCluster } from "@/components/Map/css-glow-cluster"; // (size, opts?)=>HTMLElement
import { Icon } from "@/components/Icon/Icon";
import {
  fetchLights,
  mapZoomToLevel,
  type LightPoint,
  type ZoomLevel,
} from "@/hooks/lights-api";

type Mode = "server-clustered"; // 의미상 표시용

export interface UseLightsLayerOptions {
  cooldownMs?: number;
  initialEnabled?: boolean;
}

export function useLightsLayer(
  map: google.maps.Map | null,
  opts: UseLightsLayerOptions = {}
) {
  const cooldownMs = opts.cooldownMs ?? 700;
  const [enabled, setEnabled] = useState<boolean>(opts.initialEnabled ?? true);

  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // 현재 지도에 붙어 있는 마커들
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const inflightRef = useRef<AbortController | null>(null);
  const genRef = useRef(0); // 요청 세대 토큰

  const debounceTimerRef = useRef<number | null>(null);
  const lastQueryRef = useRef<{
    lat: number;
    lng: number;
    level: ZoomLevel;
    ts: number;
  } | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  /** 개별/클러스터 마커 생성 */
  const buildMarkersFromServer = async (points: LightPoint[]) => {
    const { AdvancedMarkerElement } = (await google.maps.importLibrary(
      "marker"
    )) as google.maps.MarkerLibrary;
    const svgHtml = renderToStaticMarkup(
      <Icon name="streetLight" width={50} height={50} />
    );
    const zoom = map?.getZoom() ?? 10;
    const level = mapZoomToLevel(zoom);

    return points.map((p) => {
      if (p.count <= 1) {
        // 개별 마커
        const el = document.createElement("div");
        el.innerHTML = svgHtml;
        return new AdvancedMarkerElement({
          position: { lat: p.latitude, lng: p.longitude },
          title: "가로등",
          content: el.firstChild as HTMLElement,
          zIndex: 2000,
        });
      }
      // 클러스터 (count>1): 크기는 count로 결정
      const size = getClusterSizeByCount(p.count, level);
      const seed = Math.abs(
        ((p.latitude * 1e4) | 0) ^ ((p.longitude * 1e4) | 0) ^ p.count
      );
      const content = createCssGlowCluster(size, { seed, blend: "screen" });

      return new AdvancedMarkerElement({
        position: { lat: p.latitude, lng: p.longitude },
        content,
        zIndex: 1000 + Math.min(p.count, 999),
      });
    });
  };

  /** 이동/줌 변화에 따른 요청 실행 */
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

    // 이전 요청 kill + 세대 증가
    inflightRef.current?.abort();
    const ac = new AbortController();
    inflightRef.current = ac;
    const myGen = ++genRef.current;

    fetchLights({
      latitude: lat,
      longitude: lng,
      zoomLevel: level,
      signal: ac.signal,
    })
      .then(buildMarkersFromServer)
      .then((markers) => {
        if (!enabledRef.current || myGen !== genRef.current) return;

        // 기존 제거
        markersRef.current.forEach((m) => (m.map = null));
        markersRef.current = [];

        // 신규 부착
        markers.forEach((m) => {
          m.map = map!;
          markersRef.current.push(m);
        });

        lastQueryRef.current = { lat, lng, level, ts: now };
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        console.warn("[lights] fetch failed:", e);
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

    // 지도 이벤트: idle(중심/줌 변경 완료) 때 디바운스 요청
    const ls: google.maps.MapsEventListener[] = [];
    ls.push(map.addListener("idle", () => trigger(false)));
    listenersRef.current = ls;

    // 초기 ON이면 즉시 1회
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

  // on/off 토글 처리
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
    triggerReload: () => trigger(true),
    mode: "server-clustered" as Mode,
  };
}

type LatLng = { lat: number; lng: number };

/** 하버사인 거리(m) */
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

/** 줌별 이동 임계값(m) */
function moveThresholdMeters(zoom: number): number {
  if (zoom >= 20) return 20;
  if (zoom >= 18) return 50;
  if (zoom >= 15) return 100;
  return 300;
}
