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
import { getClusterSizeByCount } from "@/utils/cluster-size";
import { createCssGlowCluster } from "./css-glow-cluster";
import { HStack, IconButton, VStack } from "@vapor-ui/core";
import { HomeIcon } from "@vapor-ui/icons";
import { Text } from "@vapor-ui/core";
type Place = { lat: number; lng: number; name: string };

const SLIGHT_ZOOM_IN = 0.4;

export default function GoogleMapJejuFollow({ mapId }: { mapId: string }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const myMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  const initializedRef = useRef(false);

  const watchIdRef = useRef<number | null>(null);
  const firstFixRef = useRef(true);

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

  // ---- 지도 초기화 + Lottie 클러스터러 ----
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
        mapId,
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

      // ✅ fitBounds 이후, idle 시점에 '살짝 확대'
      google.maps.event.addListenerOnce(map, "idle", () => {
        const current = map.getZoom() ?? 9;
        // 클러스터 해제 임계치(10) 바로 아래로 유지
        const target = Math.min(10 - 0.2, current + SLIGHT_ZOOM_IN);
        map.setZoom(target);
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

      const CLUSTER_MAX_ZOOM = 10; // 이 줌을 넘으면 개별 마커로 풀림
      const CLUSTER_RADIUS_PX = 130;

      const renderer: google.maps.marker.Renderer = {
        render: ({
          count,
          position,
        }: {
          count: number;
          position: google.maps.LatLngLiteral;
        }) => {
          const sizeKey = getClusterSizeByCount(count);
          const latQ = Math.round(position.lat * 1e4);
          const lngQ = Math.round(position.lng * 1e4);
          const seed =
            (latQ * 73856093) ^ (lngQ * 19349663) ^ (count * 83492791);

          // 밝은 지도면 blend:"normal"로 바꿔도 됨
          const content = createCssGlowCluster(sizeKey, {
            seed,
            blend: "screen",
          });

          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content,
            zIndex: 1000 + Math.min(count, 999),
          });
        },
      };

      clustererRef.current = new MarkerClusterer({
        map,
        markers: baseMarkers,
        renderer,
        algorithm: new SuperClusterAlgorithm({
          minPoints: 1,
          maxZoom: CLUSTER_MAX_ZOOM,
          radius: CLUSTER_RADIUS_PX,
        }),
      });
    })();

    // (선택) 언마운트/리셋 시 정리
    return () => {
      try {
        if (clustererRef.current) {
          clustererRef.current.clearMarkers();
          clustererRef.current = null;
        }
        if (myMarkerRef.current) {
          (myMarkerRef.current as any).map = null;
          myMarkerRef.current = null;
        }

        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        mapRef.current = null;
      } catch {}
    };
  }, [ready, mapId]);

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

    // 이전 구독이 있으면 정리(재시작 대비)
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    firstFixRef.current = true; // 새 추적 시작 시 초기화

    if (!("geolocation" in navigator)) {
      console.warn("Geolocation을 지원하지 않는 브라우저입니다.");
      return;
    }

    const onPos: PositionCallback = (p) => {
      const here = { lat: p.coords.latitude, lng: p.coords.longitude };

      // 현재 위치 마커 upsert
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

      // 지도 이동: 첫 fix 때는 연출(zoom/tilt/heading), 이후에는 center만
      if (firstFixRef.current) {
        mapRef.current!.moveCamera({ center: here, zoom: 19, tilt: 67.5 });
        mapRef.current!.setHeading(45);

        // 주변 포인트는 첫 fix 시 1회만 추가
        if (nearbyPlaces.length > 0) {
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
        }

        firstFixRef.current = false;
      } else {
        // 빠르고 잦은 갱신에 유리: 줌/틸트 유지 + 센터만 이동
        mapRef.current!.moveCamera({ center: here });
      }

      setIsFollowing(true);
    };

    const onErr: PositionErrorCallback = (err) => {
      console.warn("현재 위치 추적 실패:", err);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10_000,
    });
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

      <div
        style={{
          position: "absolute",
          inset: "0 0 auto 0", // top:0, left/right:0
          height: "20%", // 필요시 24~36%로 조절
          pointerEvents: "none",
          zIndex: 5,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.00) 100%)",
        }}
        aria-hidden
      />
      <div
        style={{
          position: "absolute",
          inset: "auto 0 0 0", // bottom:0, left/right:0
          height: "20%", // 필요시 24~36%로 조절
          pointerEvents: "none",
          zIndex: 5,
          // safe-area 살짝 고려 (보이지 않는 여백이 필요하면 아래처럼 padding을 줄 수도 있어)
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.00) 100%)",
        }}
        aria-hidden
      />

      <IconButton
        variant="ghost" // 투명 + hover 효과
        size="xl"
        onClick={() => console.log("농장으로 가기")}
        style={{
          position: "absolute",
          right: 19,
          top: 29,
          borderRadius: "50%",
          backdropFilter: "blur(8px)",
          background: "rgba(255,255,255,0.2)",
          border: "0.5px solid rgba(255,255,255,0.5)",
          color: "#fff",
          zIndex: 6,
          //marginTop: "9px",
        }}
        aria-label="필터"
      >
        <HomeIcon />
      </IconButton>

      {/* 하단 컨트롤 바 */}
      <div
        style={{
          position: "absolute",
          left: 44,
          width: "100%",

          bottom: "max(60px, env(safe-area-inset-bottom, 0px) + 12px)",
          display: "flex",
          alignItems: "center",
          pointerEvents: "auto",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <SpeedDial
            actions={[
              {
                id: "star",
                label: "가로등",
                onClick: () => console.log("star"),
              },
              { id: "cctv", label: "CCTV", onClick: () => console.log("cctv") },
              {
                id: "notice",
                label: "신고",
                onClick: () => console.log("notice"),
              },
            ]}
          />
        </div>

        <HStack gap={"$600"} alignItems={"center"}>
          <VStack marginLeft="100px" textAlign={"center"} gap={"$050"}>
            <button
              onClick={() => console.log("신고하기 모달")}
              style={{
                width: 90, // IconButton 크기랑 통일
                height: 90,
                cursor: "pointer",
                zIndex: 6,
              }}
            >
              <svg
                width="100"
                height="100"
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g opacity="0.6" filter="url(#filter0_f_31066_13663)">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="url(#paint0_linear_31066_13663)"
                  />
                </g>
                <circle
                  cx="60"
                  cy="60"
                  r="39.5"
                  fill="url(#paint1_linear_31066_13663)"
                  stroke="url(#paint2_linear_31066_13663)"
                />
                <path
                  d="M52.6573 64.1633H50.6982C49.6206 64.1633 48.6982 63.7796 47.9308 63.0122C47.1635 62.2449 46.7798 61.3224 46.7798 60.2449V56.3265C46.7798 55.249 47.1635 54.3265 47.9308 53.5592C48.6982 52.7918 49.6206 52.4082 50.6982 52.4082H58.5349L65.3431 48.2939C65.9961 47.902 66.6573 47.902 67.3267 48.2939C67.9961 48.6857 68.3308 49.2571 68.3308 50.0082V66.5633C68.3308 67.3143 67.9961 67.8857 67.3267 68.2776C66.6573 68.6694 65.9961 68.6694 65.3431 68.2776L58.5349 64.1633H56.5757V70.0408C56.5757 70.5959 56.3879 71.0612 56.0124 71.4367C55.6369 71.8122 55.1716 72 54.6165 72C54.0614 72 53.5961 71.8122 53.2206 71.4367C52.8451 71.0612 52.6573 70.5959 52.6573 70.0408V64.1633ZM70.29 64.849V51.7224C71.1716 52.5061 71.8818 53.4612 72.4206 54.5878C72.9594 55.7143 73.2288 56.9469 73.2288 58.2857C73.2288 59.6245 72.9594 60.8571 72.4206 61.9837C71.8818 63.1102 71.1716 64.0653 70.29 64.849Z"
                  fill="white"
                />
                <defs>
                  <filter
                    id="filter0_f_31066_13663"
                    x="0"
                    y="0"
                    width="120"
                    height="120"
                    filterUnits="userSpaceOnUse"
                    color-interpolation-filters="sRGB"
                  >
                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                    <feBlend
                      mode="normal"
                      in="SourceGraphic"
                      in2="BackgroundImageFix"
                      result="shape"
                    />
                    <feGaussianBlur
                      stdDeviation="5"
                      result="effect1_foregroundBlur_31066_13663"
                    />
                  </filter>
                  <linearGradient
                    id="paint0_linear_31066_13663"
                    x1="20.9998"
                    y1="2.00008"
                    x2="67.3274"
                    y2="138.119"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stop-color="#FBFBFB" />
                    <stop offset="0.374839" stop-color="#D98D93" />
                    <stop offset="0.592469" stop-color="#9262EA" />
                    <stop offset="0.78" stop-color="#4633C3" />
                    <stop offset="1" stop-color="#162A4B" />
                  </linearGradient>
                  <linearGradient
                    id="paint1_linear_31066_13663"
                    x1="19.9994"
                    y1="6.00023"
                    x2="65.8615"
                    y2="122.495"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stop-color="#FBFBFB" />
                    <stop offset="0.25" stop-color="#D98D93" />
                    <stop offset="0.468842" stop-color="#9262EA" />
                    <stop offset="0.78" stop-color="#4633C3" />
                    <stop offset="0.975" stop-color="#162A4B" />
                  </linearGradient>
                  <linearGradient
                    id="paint2_linear_31066_13663"
                    x1="65.8621"
                    y1="20"
                    x2="65.8621"
                    y2="122.495"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stop-color="#FBFBFB" />
                    <stop offset="0.25" stop-color="#D98D93" />
                    <stop offset="0.625" stop-color="#9262EA" />
                    <stop offset="0.78" stop-color="#4633C3" />
                    <stop offset="0.975" stop-color="#162A4B" />
                  </linearGradient>
                </defs>
              </svg>
            </button>
            <Text
              typography="body2"
              style={{ color: "#fff", marginLeft: "5px" }}
            >
              신고하기
            </Text>
          </VStack>

          <IconButton
            variant="ghost" // 투명 + hover 효과
            size="xl"
            onClick={startFollow} // 50x50px 근접
            style={{
              borderRadius: "50%",
              backdropFilter: "blur(8px)",
              background: "rgba(255,255,255,0.2)",
              border: "0.5px solid rgba(255,255,255,0.5)",
              color: "#fff",
              //marginTop: "9px",
              zIndex: 6,
            }}
            aria-label="위치"
          >
            <Icon name="location" width={24} height={24} />
          </IconButton>
        </HStack>
      </div>
    </div>
  );
}
