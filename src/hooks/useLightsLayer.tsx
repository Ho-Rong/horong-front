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
      if (p.count <= 1) {
        const tpl = document.createElement("template");
        tpl.innerHTML = customStreetLightSvg.trim();
        const svgEl = tpl.content.firstElementChild as Element;

        return new AdvancedMarkerElement({
          position: { lat: p.latitude, lng: p.longitude },
          title: "가로등",
          content: svgEl,
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
