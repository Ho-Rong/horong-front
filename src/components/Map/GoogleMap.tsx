"use client";

import { useEffect, useRef, useState } from "react";
import { SpeedDial } from "../SpeedDial/SpeedDial";
import { Icon } from "../Icon/Icon";
import { renderToStaticMarkup } from "react-dom/server";
import { HStack, IconButton, VStack, Text } from "@vapor-ui/core";
import { useLightsLayer } from "@/hooks/useLightsLayer";
import { useCctvLayer } from "@/hooks/useCctvLayer";
import Lottie from "lottie-react";
import farmAnim from "@/lotties/farm.json";
import { useModal } from "@/hooks/useModal";
import { useReportsLayer } from "@/hooks/useReportsLayer";
import { ReportModal } from "../modals/ReportModal";

const SLIGHT_ZOOM_IN = 0.4;
const FOLLOW_ZOOM = 19;

interface ReportData {
  description: string;
  images: File[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export default function GoogleMapJejuFollow({ mapId }: { mapId: string }) {
  const { isOpen, open, close } = useModal();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const myMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  const watchIdRef = useRef<number | null>(null);
  const firstFixRef = useRef(true);
  const initializedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const handleReport = (data: ReportData) => {
    // 여기서 실제 API 호출
    // await reportAPI.submit(data);

    alert("신고가 접수되었습니다.");
  };

  const cctv = useCctvLayer(map, {
    initialEnabled: false,
    cooldownMs: 700,
  });

  const report = useReportsLayer(map, {
    initialEnabled: false,
    cooldownMs: 700,
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setReady(width > 0 && height > 0);
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!ready || initializedRef.current || !canvasRef.current) return;
    initializedRef.current = true;

    (async () => {
      const { Map } = (await google.maps.importLibrary(
        "maps"
      )) as google.maps.MapsLibrary;
      const map = new Map(canvasRef.current!, {
        center: { lat: 33.38, lng: 126.55 },
        zoom: 18,
        mapId,
        colorScheme: google.maps.ColorScheme.LIGHT,
        disableDefaultUI: true,
        gestureHandling: "greedy",
      });
      setMap(map); // ✅ 훅에 전달될 state 업데이트

      // 제주 경계 맞추기
      const sw = new google.maps.LatLng(33.05, 126.14);
      const ne = new google.maps.LatLng(33.62, 126.98);
      const bounds = new google.maps.LatLngBounds(sw, ne);
      map.fitBounds(bounds);

      // fit 이후 살짝 확대
      google.maps.event.addListenerOnce(map, "idle", () => {
        const current = map.getZoom() ?? 9;
        const target = Math.min(10 - 0.2, current + SLIGHT_ZOOM_IN);
        map.setZoom(target);
      });
    })();

    return () => {
      try {
        if (myMarkerRef.current) {
          myMarkerRef.current.map = null;
          myMarkerRef.current = null;
        }
        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setMap(null);
      } catch {}
    };
  }, [ready, mapId]);

  // ✅ 가로등 레이어 훅: 줌 20 이상이면 개별 마커, 그 외엔 클러스터
  const lights = useLightsLayer(map, {
    initialEnabled: true,
    cooldownMs: 700,
  });

  // 현재 위치 따라가기
  // 현재 위치 따라가기
  const startFollow = async () => {
    if (!map) return;
    const { AdvancedMarkerElement } = (await google.maps.importLibrary(
      "marker"
    )) as google.maps.MarkerLibrary;

    const svgHtml = renderToStaticMarkup(
      <Icon name="horong" width={40} height={40} />
    );

    const makeIcon = () => {
      const el = document.createElement("div");
      el.innerHTML = svgHtml;
      // innerHTML은 루트가 <svg>라서 childNodes[0]에 svg가 들어감
      return el.firstChild as HTMLElement;
    };

    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    firstFixRef.current = true;

    if (!("geolocation" in navigator)) {
      console.warn("Geolocation을 지원하지 않는 브라우저입니다.");
      return;
    }

    const onPos: PositionCallback = (p) => {
      const here = { lat: p.coords.latitude, lng: p.coords.longitude };
      if (!myMarkerRef.current) {
        myMarkerRef.current = new AdvancedMarkerElement({
          map,
          position: here,
          title: "현재 위치",
          content: makeIcon(),
          zIndex: 3000, // 다른 마커보다 위에 보이도록
        });
      } else {
        myMarkerRef.current.position = here;
      }

      if (firstFixRef.current) {
        map.moveCamera({ center: here, zoom: FOLLOW_ZOOM, tilt: 67.5 });
        map.setHeading(45);
        firstFixRef.current = false;
      } else {
        map.moveCamera({ center: here });
      }
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
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
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
        variant="ghost"
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
        }}
        aria-label="농장"
      >
        <Lottie
          animationData={farmAnim}
          loop
          autoplay
          style={{ width: 32, height: 32, pointerEvents: "none" }} // 버튼 클릭 방해 X
        />
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
                onClick: () => {
                  cctv.hide();
                  report.hide();
                  lights.show();
                },
              },
              {
                id: "cctv",
                label: "CCTV",
                onClick: () => {
                  lights.hide();
                  report.hide();
                  cctv.show();
                },
              },
              {
                id: "notice",
                label: "신고",
                onClick: () => {
                  lights.hide();
                  cctv.hide();
                  report.show();
                },
              },
            ]}
          />
        </div>

        <HStack gap={"$600"} alignItems={"center"}>
          <VStack marginLeft="100px" textAlign={"center"} gap={"$050"}>
            <button
              onClick={open}
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
      <ReportModal isOpen={isOpen} onClose={close} onReport={handleReport} />
    </div>
  );
}
