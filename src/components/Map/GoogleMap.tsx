"use client";

import { useEffect, useRef, useState } from "react";
import { SpeedDial } from "../SpeedDial/SpeedDial";

type Place = { lat: number; lng: number; name: string };

export default function GoogleMapJejuFollow() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const myMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  const watchIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // 제주도 전체 목데이터
  const mockPlaces: Place[] = [
    { lat: 33.3617, lng: 126.5292, name: "한라산" },
    { lat: 33.3062, lng: 126.3173, name: "중문 관광단지" },
    { lat: 33.4996, lng: 126.5312, name: "제주시청" },
    { lat: 33.2465, lng: 126.5658, name: "서귀포시청" },
    { lat: 33.5563, lng: 126.7958, name: "성산일출봉" },
    { lat: 33.239, lng: 126.5446, name: "천지연 폭포" },
    { lat: 33.2522, lng: 126.4089, name: "용머리 해안" },
  ];

  // 현재 위치 기반 마커들
  const nearbyPlaces: Place[] = [
    { lat: 0, lng: 0, name: "주변 포인트1" },
    { lat: 0, lng: 0, name: "주변 포인트2" },
  ];

  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setReady(width > 0 && height > 0);
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // 지도 초기화 (제주도 전체 보기)
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
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
        colorScheme: google.maps.ColorScheme.LIGHT,
        disableDefaultUI: true,
        gestureHandling: "greedy",
      });
      mapRef.current = map;

      // 제주도 대략 경계
      const sw = new google.maps.LatLng(33.05, 126.14);
      const ne = new google.maps.LatLng(33.62, 126.98);
      const bounds = new google.maps.LatLngBounds(sw, ne);
      map.fitBounds(bounds);

      const desiredZoom = 9; // 10~12 사이 취향대로
      google.maps.event.addListenerOnce(map, "idle", () => {
        const z = map.getZoom() ?? desiredZoom;
        if (z < desiredZoom) map.setZoom(desiredZoom); // ← 작으면 키운다
      });

      // 제주도 전체 마커 렌더
      mockPlaces.forEach((p) => {
        new AdvancedMarkerElement({
          map,
          position: { lat: p.lat, lng: p.lng },
          title: p.name,
        });
      });
    })();
  }, [ready]);

  // 버튼 누르면 현재 위치 따라가기 + 주변 목데이터 찍기
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
      return dot;
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const here = { lat: p.coords.latitude, lng: p.coords.longitude };

          // 현재 위치 마커
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

          // 지도 이동
          mapRef.current!.moveCamera({
            center: here,
            zoom: 19, // 17~19 권장
            tilt: 10, // 0~67.5 (최대)
            //heading: 20, // 0~360
          });

          mapRef.current!.setTilt(67.5);
          mapRef.current!.setHeading(45);

          // 현재 위치 주변 목데이터 마커 찍기
          const nearMock: Place[] = nearbyPlaces.map((n, i) => ({
            ...n,
            lat: here.lat + (Math.random() - 0.5) * 0.01, // 근처 랜덤 좌표
            lng: here.lng + (Math.random() - 0.5) * 0.01,
            name: `주변 포인트 ${i + 1}`,
          }));

          nearMock.forEach((p) => {
            new AdvancedMarkerElement({
              map: mapRef.current!,
              position: { lat: p.lat, lng: p.lng },
              title: p.name,
            });
          });

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
        onClick={() => console.log("Top Right")}
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

      {/* 하단 컨트롤 바: SpeedDial + 버튼2개 (한 줄) */}
      <div
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: "max(50px, env(safe-area-inset-bottom, 0px) + 12px)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 9999, // 맵 위로
          pointerEvents: "none", // 바깥 영역은 클릭 통과
        }}
      >
        {/* SpeedDial: 자신의 영역만 클릭 가능하게 */}
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

        {/* 버튼 1 */}
        <button
          onClick={startFollow}
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
          위치
        </button>

        {/* 버튼 2 (예시) */}
        <button
          onClick={() => console.log("둘러보기")}
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
