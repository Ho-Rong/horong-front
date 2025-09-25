"use client";

import { useEffect, useRef, useState } from "react";
import { SpeedDial } from "../SpeedDial/SpeedDial";
import {
  MarkerClusterer,
  SuperClusterAlgorithm,
  type Cluster,
  type Renderer,
} from "@googlemaps/markerclusterer";
import { Icon } from "../Icon/Icon";
import { renderToStaticMarkup } from "react-dom/server";

type Place = { lat: number; lng: number; name: string };

export default function GoogleMapJejuFollow({ mapId }: { mapId: string }) {
  console.log("mapId", mapId);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const myMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  const initializedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // 🔸 제주도 내 랜덤 목데이터(초기 테스트용: 80개)
  const mockPlaces: Place[] = randomJejuPoints(80);

  // 현재 위치 기반 테스트용
  const nearbyPlaces: Place[] = [
    { lat: 0, lng: 0, name: "주변 포인트1" },
    { lat: 0, lng: 0, name: "주변 포인트2" },
  ];

  // ---- 유틸: 랜덤 제주 포인트 ----
  function randomJejuPoints(count: number): Place[] {
    const pts: Place[] = [];
    for (let i = 0; i < count; i++) {
      const lat = 33.1 + Math.random() * 0.5; // 대략 범위
      const lng = 126.2 + Math.random() * 0.7;
      pts.push({ lat, lng, name: `포인트 ${i + 1}` });
    }
    return pts;
  }

  // ---- 클러스터 원 생성 (숫자 없음, 그라데이션) ----
  function createClusterCircle(count: number, zoom = 10) {
    const base = mapSqrt(count, 1, 200, 36, 220); // √스케일
    const zoomFactor = 1 - Math.max(0, zoom - 12) * 0.06;
    const px = Math.round(
      Math.max(28, Math.min(260, base * Math.max(0.7, zoomFactor)))
    );

    const el = document.createElement("div");
    el.style.width = `${px}px`;
    el.style.height = `${px}px`;
    el.style.borderRadius = "50%";
    el.style.transform = "translate(-50%, -50%)";
    el.style.border = "0.5px solid var(--color-lemon-050, #FEFBA8)";
    el.style.background =
      "var(--light-maker-large, radial-gradient(70.49% 70.46% at 50.35% 50%, rgba(254, 251, 168, 0.70) 0%, rgba(255, 249, 98, 0.10) 19.23%, rgba(255, 248, 75, 0.20) 39.9%, rgba(255, 249, 93, 0.40) 65.87%, var(--color-lemon-050, #FEFBA8) 100%))";
    el.style.boxShadow = "0 0 40px rgba(255, 247, 133, 0.35)";
    return el;
  }
  function mapSqrt(
    v: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
  ) {
    const t =
      (Math.sqrt(v) - Math.sqrt(inMin)) / (Math.sqrt(inMax) - Math.sqrt(inMin));
    return outMin + Math.max(0, Math.min(1, t)) * (outMax - outMin);
  }

  // ---- 캔버스 준비 ----
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setReady(width > 0 && height > 0);
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // ---- 지도 초기화 + 클러스터러 ----
  useEffect(() => {
    if (!ready || initializedRef.current || !canvasRef.current) return;
    initializedRef.current = true;

    (async () => {
      const { Map } = (await google.maps.importLibrary(
        "maps"
      )) as google.maps.MapsLibrary;
      const { AdvancedMarkerElement } = (await google.maps.importLibrary(
        "marker"
      )) as google.maps.MarkerLibrary;

      const map = new Map(canvasRef.current!, {
        center: { lat: 33.38, lng: 126.55 },
        zoom: 18,
        mapId: mapId,
        colorScheme: google.maps.ColorScheme.LIGHT,
        disableDefaultUI: true,
        gestureHandling: "greedy",
      });
      mapRef.current = map;

      // 제주 경계 맞추기
      const sw = new google.maps.LatLng(33.05, 126.14);
      const ne = new google.maps.LatLng(33.62, 126.98);
      const bounds = new google.maps.LatLngBounds(sw, ne);
      map.fitBounds(bounds);

      const desiredZoom = 9;
      google.maps.event.addListenerOnce(map, "idle", () => {
        const z = map.getZoom() ?? desiredZoom;
        if (z < desiredZoom) map.setZoom(desiredZoom);
      });

      // ✅ 개별 마커는 'map'에 직접 붙이지 말고 clusterer에만 넘긴다!
      const baseMarkers = mockPlaces.map((p) => {
        const html = renderToStaticMarkup(
          <Icon name="streetLight" size={20} color="#FFD60A" />
        );
        const container = document.createElement("div");
        container.innerHTML = html;

        return new google.maps.marker.AdvancedMarkerElement({
          position: { lat: p.lat, lng: p.lng },
          title: p.name,
          content: container.firstChild as HTMLElement,
        });
      });
      // 원하는 임계값 (원하는대로 조절 가능)
      const CLUSTER_MAX_ZOOM = 10; // ← 이 줌을 넘어가면 개별 마커가 풀려서 보임
      const CLUSTER_RADIUS_PX = 130; // 클러스터링 반경(픽셀). 숫자 키우면 더 뭉침

      // 커스텀 렌더러 그대로 사용 (count 원 그리기)
      const renderer: Renderer = {
        render: ({ count, position }: Cluster) => {
          const zoom = map.getZoom() ?? 10;
          const circle = createClusterCircle(count, zoom);
          const am = new google.maps.marker.AdvancedMarkerElement({
            position,
            content: circle,
            zIndex: 1000 + Math.min(count, 999),
          });
          circle.onclick = () => {
            map.panTo(position);
            map.setZoom(Math.min((map.getZoom() ?? 10) + 2, 21));
          };
          return am;
        },
      };

      // ✅ ‘minPoints: 1’이라 초기엔 단일 포인트도 전부 “클러스터 원”으로만 보임
      clustererRef.current = new MarkerClusterer({
        map,
        markers: baseMarkers,
        renderer,
        algorithm: new SuperClusterAlgorithm({
          minPoints: 1, // 단일 포인트도 클러스터 처리
          maxZoom: CLUSTER_MAX_ZOOM, // 이 줌 이후엔 개별 마커로 풀림
          radius: CLUSTER_RADIUS_PX,
        }),
      });
    })();
  }, [ready]);

  // ---- 현재 위치 따라가기 + 주변 포인트는 clusterer에 추가 ----
  const startFollow = async () => {
    if (!mapRef.current) return;

    const { AdvancedMarkerElement } = (await google.maps.importLibrary(
      "marker"
    )) as google.maps.MarkerLibrary;

    const makeDot = () => {
      const dot = document.createElement("div");
      dot.style.width = "14px";
      dot.style.height = "14px";
      dot.style.borderRadius = "50%";
      dot.style.background = "#3B82F6";
      dot.style.border = "2px solid white";
      dot.style.transform = "translate(-50%, -50%)";
      return dot;
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const here = { lat: p.coords.latitude, lng: p.coords.longitude };

          // 현재 위치 마커는 map에 직접 붙여도 OK (사용자 위치용이니 클러스터 제외)
          if (!myMarkerRef.current) {
            myMarkerRef.current = new AdvancedMarkerElement({
              map: mapRef.current!,
              position: here,
              title: "현재 위치",
              content: makeDot(),
            });
          } else {
            myMarkerRef.current.position = here;
          }

          mapRef.current!.moveCamera({ center: here, zoom: 19, tilt: 10 });
          mapRef.current!.setTilt(67.5);
          mapRef.current!.setHeading(45);

          // 주변 포인트는 clusterer에만 추가!
          const nearMock: Place[] = nearbyPlaces.map((n, i) => ({
            ...n,
            lat: here.lat + (Math.random() - 0.5) * 0.01,
            lng: here.lng + (Math.random() - 0.5) * 0.01,
            name: `주변 포인트 ${i + 1}`,
          }));
          const newMarkers = nearMock.map(
            (p2) =>
              new google.maps.marker.AdvancedMarkerElement({
                position: { lat: p2.lat, lng: p2.lng },
                title: p2.name,
              })
          );
          clustererRef.current?.addMarkers(newMarkers);

          setIsFollowing(true);
        },
        (err) => console.warn("현재 위치 가져오기 실패:", err),
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div
      ref={wrapperRef}
      style={{ width: "100%", height: "100vh", position: "relative" }}
    >
      <div
        ref={canvasRef}
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
      />

      {/* 우측 상단 버튼 */}
      <button
        onClick={() => console.log("농장으로 가기")}
        style={{
          position: "absolute",
          right: 15,
          top: 25,
          padding: "10px 12px",
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          color: "#111827",
          background: "#fff",
          cursor: "pointer",
          zIndex: 9999,
        }}
      >
        옵션
      </button>

      {/* 하단 컨트롤 바 */}
      <div
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: "max(50px, env(safe-area-inset-bottom, 0px) + 12px)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <SpeedDial
            actions={[
              {
                id: "filter",
                label: "필터",
                onClick: () => console.log("필터"),
              },
              {
                id: "layers",
                label: "레이어",
                onClick: () => console.log("레이어"),
              },
              {
                id: "nearby",
                label: "주변",
                onClick: () => console.log("주변"),
              },
            ]}
          />
        </div>

        <button
          onClick={() => console.log("신고하기 모달")}
          style={{
            pointerEvents: "auto",
            padding: "10px 12px",
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "none",
            color: "#111827",
            background: "#fff",
            cursor: "pointer",
            marginLeft: 135,
          }}
        >
          신고
        </button>

        <button
          onClick={startFollow}
          style={{
            pointerEvents: "auto",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fff",
            cursor: "pointer",
            marginLeft: 70,
          }}
        />
      </div>
    </div>
  );
}
