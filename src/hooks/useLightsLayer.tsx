// hooks/useLightsLayer.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getClusterSizeByCount } from "@/utils/cluster-size";
import { createCssGlowCluster } from "@/components/Map/css-glow-cluster";
import {
  fetchLights,
  mapZoomToLevel,
  type LightPoint,
  type ZoomLevel,
} from "@/hooks/lights-api";

type Mode = "server-clustered";

export interface UseLightsLayerOptions {
  cooldownMs?: number;
  initialEnabled?: boolean;
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

  // 현재 붙여둔 마커(지우지 말고 detach/attach만)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  // 마지막 서버 데이터 캐시(토글 복귀용)
  const cacheRef = useRef<LightPoint[] | null>(null);

  const inflightRef = useRef<AbortController | null>(null);
  const genRef = useRef(0); // 요청 세대 (stale 응답 무시용)

  const debounceTimerRef = useRef<number | null>(null);
  const lastQueryRef = useRef<{
    lat: number;
    lng: number;
    level: ZoomLevel;
    ts: number;
  } | null>(null);

  // viewport 스냅샷 키(너무 잦은 재요청 방지용으로 소수점 절삭)
  const viewportKey = useMemo(() => {
    if (!map) return "none";
    const z = map.getZoom() ?? 0;
    const c = map.getCenter();
    const lat = c?.lat ? Number(c.lat().toFixed(3)) : 0;
    const lng = c?.lng ? Number(c.lng().toFixed(3)) : 0;
    return `${z}:${lat},${lng}`;
  }, [map?.getZoom?.(), map?.getCenter?.()?.lat(), map?.getCenter?.()?.lng()]);

  /** 단일/클러스터 DOM 마커 생성 */
  const buildMarkersFromServer = async (points: LightPoint[]) => {
    const { AdvancedMarkerElement } = (await google.maps.importLibrary(
      "marker"
    )) as google.maps.MarkerLibrary;

    const customStreetLightSvg = `
    <svg width="47" height="47" viewBox="0 0 47 47" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_f_31066_3169)">
    <circle cx="23.4595" cy="23.4588" r="19" transform="rotate(-1.40282 23.4595 23.4588)" fill="url(#paint0_radial_31066_3169)"/>
    </g>
    <circle cx="23" cy="23.0007" r="15.4722" transform="rotate(-1.40282 23 23.0007)" fill="url(#paint1_radial_31066_3169)" stroke="#FEFBA8" stroke-width="0.3"/>
    <path d="M22.5245 15.4635C22.6741 15.0029 23.3259 15.0029 23.4755 15.4635L24.9084 19.8734C24.9753 20.0794 25.1673 20.2188 25.3839 20.2188H30.0207C30.505 20.2188 30.7064 20.8387 30.3146 21.1234L26.5633 23.8488C26.3881 23.9761 26.3148 24.2018 26.3817 24.4078L27.8145 28.8176C27.9642 29.2783 27.437 29.6613 27.0451 29.3766L23.2939 26.6512C23.1186 26.5239 22.8814 26.5239 22.7061 26.6512L18.9549 29.3766C18.563 29.6613 18.0358 29.2783 18.1855 28.8176L19.6183 24.4078C19.6852 24.2018 19.6119 23.9761 19.4367 23.8488L15.6854 21.1234C15.2936 20.8387 15.495 20.2188 15.9793 20.2188H20.6161C20.8327 20.2188 21.0247 20.0794 21.0916 19.8734L22.5245 15.4635Z" fill="url(#paint2_radial_31066_3169)"/>
    <defs>
    <filter id="filter0_f_31066_3169" x="0.459473" y="0.458984" width="46" height="46" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feFlood flood-opacity="0" result="BackgroundImageFix"/>
    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_31066_3169"/>
    </filter>
    <radialGradient id="paint0_radial_31066_3169" cx="0" cy="0" r="1" gradientTransform="matrix(18.8653 19 -19.0083 18.8736 23.5942 23.4588)" gradientUnits="userSpaceOnUse">
    <stop stop-color="#FEFBA8" stop-opacity="0.7"/>
    <stop offset="0.192308" stop-color="#FFF962" stop-opacity="0.1"/>
    <stop offset="0.399038" stop-color="#FFF84B" stop-opacity="0.2"/>
    <stop offset="0.658654" stop-color="#FFF95D" stop-opacity="0.4"/>
    <stop offset="1" stop-color="#FEFBA8"/>
    </radialGradient>
    <radialGradient id="paint1_radial_31066_3169" cx="0" cy="0" r="1" gradientTransform="matrix(15.5114 15.6222 -15.6291 15.5183 23.1108 23.0007)" gradientUnits="userSpaceOnUse">
    <stop stop-color="#FEFBA8" stop-opacity="0.7"/>
    <stop offset="0.192308" stop-color="#FFF962" stop-opacity="0.1"/>
    <stop offset="0.399038" stop-color="#FFF84B" stop-opacity="0.2"/>
    <stop offset="0.658654" stop-color="#FFF95D" stop-opacity="0.4"/>
    <stop offset="1" stop-color="#FEFBA8"/>
    </radialGradient>
    <radialGradient id="paint2_radial_31066_3169" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(23 22.4706) rotate(90) scale(6.88235)">
    <stop stop-color="#FEFBA8"/>
    <stop offset="1" stop-color="#FFF64A"/>
    </radialGradient>
    </defs>
    </svg>
    `;

    const zoom = map?.getZoom() ?? 10;
    const level = mapZoomToLevel(zoom);

    return points.map((p) => {
      // 단일
      if (p.count <= 1) {
        const tpl = document.createElement("template");
        tpl.innerHTML = customStreetLightSvg;
        const svgEl = tpl.content.firstElementChild as Element;
        svgEl.classList.add("point");


        const container = document.createElement("div")
          container.style.width = "47 !important"
          container.style.height = "47 !important"
          container.classList.add("container")

          container.append(svgEl)

        return new AdvancedMarkerElement({
          position: { lat: p.latitude, lng: p.longitude },
          title: "가로등",
          content: container,
          zIndex: 2000,
        });
      }

      // 서버-클러스터(표시만): count로 크기 결정
      const size = getClusterSizeByCount(p.count, level);
      const seed =
        Math.abs(
          ((p.latitude * 1e4) | 0) ^ ((p.longitude * 1e4) | 0) ^ p.count
        ) >>> 0;
      const content = createCssGlowCluster(size, { seed, blend: "screen" });

      return new AdvancedMarkerElement({
        position: { lat: p.latitude, lng: p.longitude },
        content,
        zIndex: 1000 + Math.min(p.count, 999),
      });
    });
  };

  /** 현재 상태/쿨다운/이동량/줌 변화 고려하여 fetch */
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

      // 데이터가 전혀 부착돼 있지 않다면(토글 직후) 무조건 요청
      const hasAttached = markersRef.current.some((m) => m.map != null);

      needFetch =
        (!hasAttached && enabledRef.current) ||
        ((levelChanged || movedEnough) && cooledDown);
    }

    if (!needFetch) return;

    // 이전 요청 중단
    inflightRef.current?.abort();
    const ac = new AbortController();
    inflightRef.current = ac;
    const myGen = ++genRef.current;

    try {
      const points = await fetchLights({
        latitude: lat,
        longitude: lng,
        zoomLevel: level,
        signal: ac.signal,
      });

      cacheRef.current = points; // 캐시 저장

      const markers = await buildMarkersFromServer(points);

      // 기존 마커는 완전히 교체
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = markers;

      if (!enabledRef.current || myGen !== genRef.current) return;

      markersRef.current.forEach((m) => (m.map = map));
      lastQueryRef.current = { lat, lng, level, ts: now };
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.warn("[lights] fetch failed:", e);
    }
  };

  const trigger = (immediate = false, force = false) => {
    if (!map || !enabledRef.current) return;
    if (immediate) return void runFetch(force);
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(() => runFetch(force), 220);
  };

  // 지도 이벤트 바인딩
  useEffect(() => {
    if (!map) return;

    const idleL = map.addListener("idle", () => trigger(false));
    // 초기 ON이면 즉시 최초 로드
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

  // on/off 토글 처리 (데이터는 지우지 않음)
  useEffect(() => {
    if (!map) return;

    if (!enabled) {
      // detach만 (빠른 복귀)
      inflightRef.current?.abort();
      ++genRef.current;
      markersRef.current.forEach((m) => (m.map = null));
      return;
    }

    // 켜질 때: 캐시가 있으면 즉시 복구, 없으면 강제 fetch
    if (cacheRef.current && markersRef.current.length > 0) {
      markersRef.current.forEach((m) => (m.map = map));
      // 최신화가 필요하면 쿨다운 무시하고 한 번 더
      trigger(true, true);
    } else if (cacheRef.current && markersRef.current.length === 0) {
      // 캐시→마커 재생성 후 부착
      (async () => {
        const markers = await buildMarkersFromServer(cacheRef.current!);
        markersRef.current = markers;
        markersRef.current.forEach((m) => (m.map = map));
        trigger(true); // 최신화는 일반 호출
      })();
    } else {
      // 캐시 없음 → 강제 최초 로드
      trigger(true, true);
    }
  }, [enabled, map]);

  return {
    enabled,
    show: () => setEnabled(true),
    hide: () => setEnabled(false),
    toggle: () => setEnabled((v) => !v),
    reload: (opts?: { force?: boolean }) => trigger(true, !!opts?.force),
    triggerReload: () => trigger(true),
    mode: "server-clustered" as Mode,
  };
}
