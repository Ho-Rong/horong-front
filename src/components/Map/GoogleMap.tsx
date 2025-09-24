"use client";

import { useEffect, useRef, useState } from "react";

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

      const map = new Map(canvasRef.current!, {
        center: { lat: 33.38, lng: 126.55 },
        zoom: 10,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
        colorScheme: google.maps.ColorScheme.LIGHT,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        tilt: 0,
        heading: 0,
      });
      mapRef.current = map;

      const sw = new google.maps.LatLng(33.05, 126.14);
      const ne = new google.maps.LatLng(33.62, 126.98);
      const bounds = new google.maps.LatLngBounds(sw, ne);
      map.fitBounds(bounds, { top: 24, right: 24, bottom: 24, left: 24 });
    })();
  }, [ready]);

  const startFollow = async () => {
    if (!mapRef.current) return;

    const { AdvancedMarkerElement } = (await google.maps.importLibrary(
      "marker"
    )) as google.maps.MarkerLibrary;

    const makeDot = () => {
      const wrap = document.createElement("div");
      wrap.style.position = "relative";
      wrap.style.width = "22px";
      wrap.style.height = "22px";

      const style = document.createElement("style");
      style.textContent = `
        @keyframes pulse {
          0% { box-shadow:0 0 0 0 rgba(59,130,246,.6) }
          70% { box-shadow:0 0 0 12px rgba(59,130,246,0) }
          100% { box-shadow:0 0 0 0 rgba(59,130,246,0) }
        }`;
      const ring = document.createElement("div");
      Object.assign(ring.style, {
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%)",
        width: "12px",
        height: "12px",
        borderRadius: "9999px",
        animation: "pulse 1.6s infinite",
      } as CSSStyleDeclaration);
      const dot = document.createElement("div");
      Object.assign(dot.style, {
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%)",
        width: "12px",
        height: "12px",
        borderRadius: "9999px",
        background: "#3B82F6",
        border: "2px solid #fff",
      } as CSSStyleDeclaration);
      wrap.append(style, ring, dot);
      return wrap;
    };

    // 권한 요청 + 현재 위치로 이동
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const here = { lat: p.coords.latitude, lng: p.coords.longitude };

          // 마커 생성/업데이트
          if (!myMarkerRef.current) {
            myMarkerRef.current = new AdvancedMarkerElement({
              map: mapRef.current!,
              position: here,
              title: "현재 위치",
              content: makeDot(),
            });
            console.log("[marker] 최초 생성:", here);
          } else {
            myMarkerRef.current.position = here;
            console.log("[marker] 최초 업데이트:", here);
          }
          // 카메라: 현재 위치로 이동 + 줌20 + tilt 45 (+ heading 있으면 반영)
          const heading =
            typeof p.coords.heading === "number" ? p.coords.heading : undefined;

          if ("moveCamera" in mapRef.current!) {
            mapRef.current!.moveCamera({
              center: here,
              zoom: 20,
              tilt: 45,
              heading: 10,
            });
          } else {
            mapRef.current!.setZoom(20);
            mapRef.current!.panTo(here);

            if ("setTilt" in mapRef.current!) mapRef.current!.setTilt(45);

            if ("setHeading" in mapRef.current! && heading != null)
              mapRef.current!.setHeading(heading);
          }

          setIsFollowing(true);

          // 이후 계속 따라가기
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          watchIdRef.current = navigator.geolocation.watchPosition(
            (wp) => {
              const pos = { lat: wp.coords.latitude, lng: wp.coords.longitude };

              if (myMarkerRef.current) {
                myMarkerRef.current.position = pos;
                console.log(
                  "[marker] 위치 갱신:",
                  pos,
                  "accuracy:",
                  wp.coords.accuracy
                );
              }

              const heading2 =
                typeof wp.coords.heading === "number"
                  ? wp.coords.heading
                  : undefined;
              if ("moveCamera" in mapRef.current!) {
                mapRef.current!.moveCamera({
                  center: pos,
                  zoom: 20,
                  tilt: 45,
                  heading: heading2,
                });
              } else {
                mapRef.current!.setZoom(20);
                mapRef.current!.panTo(pos);

                if ("setTilt" in mapRef.current!) mapRef.current!.setTilt(45);

                if ("setHeading" in mapRef.current! && heading2 != null)
                  mapRef.current!.setHeading(heading2);
              }
            },
            (err) => console.warn("watchPosition 실패:", err?.message),
            { enableHighAccuracy: true, maximumAge: 3000 }
          );
        },
        (err) => {
          console.warn("현재 위치 권한/가져오기 실패:", err?.message);
          // 실패 시에는 그냥 제주 전체 보기 유지
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  // 언마운트 시 watcher 해제
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{ width: "100%", height: "100vh", position: "relative" }}
    >
      <div
        ref={canvasRef}
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
      />

      {!isFollowing && (
        <button
          onClick={startFollow}
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: "none",
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
          }}
          aria-label="현재 위치로 이동"
          title="현재 위치로 이동"
        >
          현재 위치
        </button>
      )}
    </div>
  );
}
