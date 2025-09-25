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
import { useRouter } from "next/navigation";
import {
  clampZoomTemporarily,
  lockZoomAround,
  shrinkBoundsByZoom,
} from "@/utils/shrinkBoundsByZoom";
import slightZoomInOnce from "@/utils/shrinkBoundsByZoom";

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
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const myMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  const watchIdRef = useRef<number | null>(null);
  const firstFixRef = useRef(true);
  const initializedRef = useRef(false);

  const didInitialSlightZoomRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  // 구글 API로 주소 가져오기
  const getAddressFromGoogle = async (
    lat: number,
    lng: number
  ): Promise<string> => {
    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    console.log("🌍 [GOOGLE API] 주소 변환 시작");
    console.log("  - API 키 존재 여부:", !!API_KEY);
    console.log(
      "  - API 키 앞 10자리:",
      API_KEY ? API_KEY.substring(0, 10) + "..." : "undefined"
    );
    console.log("  - 요청 좌표:", { lat, lng });

    if (!API_KEY) {
      console.warn("⚠️ [WARNING] Google Maps API 키가 설정되지 않았습니다");
      return `위도: ${lat.toFixed(4)}, 경도: ${lng.toFixed(4)}`;
    }

    try {
      const requestUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=ko`;
      console.log(
        "🌍 [GOOGLE API] 요청 URL:",
        requestUrl.replace(API_KEY, "API_KEY")
      );

      const response = await fetch(requestUrl);

      console.log("🌍 [GOOGLE API] 응답 상태:", response.status);
      console.log("🌍 [GOOGLE API] 응답 OK:", response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("🌍 [GOOGLE API] 응답 데이터:", data);

      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];
        console.log("🌍 [GOOGLE API] 첫 번째 결과:", result);

        // 주소 구성 요소 파싱해서 간단한 주소 만들기
        const components = result.address_components;
        console.log("🌍 [GOOGLE API] 주소 구성요소들:", components);

        let city = "";
        let district = "";

        components.forEach((component: any, index: number) => {
          console.log(`🌍 [GOOGLE API] 구성요소 ${index}:`, component);
          const types = component.types;
          if (types.includes("administrative_area_level_1")) {
            city = component.long_name; // 시/도
            console.log("🌍 [GOOGLE API] 시/도 발견:", city);
          }
          if (
            types.includes("administrative_area_level_2") ||
            types.includes("sublocality_level_1")
          ) {
            district = component.long_name; // 구/군
            console.log("🌍 [GOOGLE API] 구/군 발견:", district);
          }
        });

        // 간단한 주소 형식으로 반환
        let finalAddress;
        if (city && district) {
          finalAddress = `${city} ${district}`;
        } else {
          // 전체 주소에서 첫 번째 부분만 가져오기
          finalAddress =
            result.formatted_address.split(",")[0] || result.formatted_address;
        }

        console.log("🎯 [SUCCESS] 최종 주소:", finalAddress);
        return finalAddress;
      } else {
        console.warn(`⚠️ [WARNING] Geocoding failed: ${data.status}`);
        console.log("🌍 [GOOGLE API] 실패 상세:", data);
        return `위도: ${lat.toFixed(4)}, 경도: ${lng.toFixed(4)}`;
      }
    } catch (error) {
      console.error("❌ [ERROR] 구글 지오코딩 실패:", error);
      return `위도: ${lat.toFixed(4)}, 경도: ${lng.toFixed(4)}`;
    }
  };

  // 현재 위치와 주소를 함께 가져오는 함수
  const getCurrentLocationWithAddress = (): Promise<{
    latitude: number;
    longitude: number;
    address: string;
  }> => {
    return new Promise((resolve, reject) => {
      console.log("📍 [GPS] 위치 요청 시작");

      if (!navigator.geolocation) {
        console.error("❌ [ERROR] 브라우저가 위치 서비스를 지원하지 않음");
        reject(new Error("이 브라우저는 위치 서비스를 지원하지 않습니다."));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5분간 캐시
      };

      console.log("📍 [GPS] 위치 옵션:", options);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          console.log("🎯 [SUCCESS] GPS 위치 획득 성공!");
          console.log("  - 위도:", latitude);
          console.log("  - 경도:", longitude);
          console.log("  - 정확도:", accuracy, "m");
          console.log("  - 전체 좌표 객체:", position.coords);

          try {
            console.log("🌍 [GOOGLE API] 주소 변환 시작...");
            // 구글 API로 주소 가져오기
            const address = await getAddressFromGoogle(latitude, longitude);

            console.log("🎯 [SUCCESS] 주소 변환 완료:", address);

            const result = {
              latitude,
              longitude,
              address,
            };

            console.log("🎯 [FINAL] 최종 반환 객체:", result);
            resolve(result);
          } catch (addressError) {
            console.warn(
              "⚠️ [WARNING] 주소 가져오기 실패, 좌표만 제공:",
              addressError
            );

            // 주소 가져오기 실패해도 좌표는 제공
            const fallbackResult = {
              latitude,
              longitude,
              address: `위도: ${latitude.toFixed(4)}, 경도: ${longitude.toFixed(
                4
              )}`,
            };

            console.log("🔄 [FALLBACK] 좌표만 반환:", fallbackResult);
            resolve(fallbackResult);
          }
        },
        (error) => {
          console.error("❌ [ERROR] GPS 위치 획득 실패");
          console.error("  - 에러 코드:", error.code);
          console.error("  - 에러 메시지:", error.message);

          let errorMessage = "";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "위치 접근이 거부되었습니다.";
              console.error("❌ [ERROR] 사용자가 위치 권한을 거부함");
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "위치 정보를 사용할 수 없습니다.";
              console.error("❌ [ERROR] 위치 정보 사용 불가");
              break;
            case error.TIMEOUT:
              errorMessage = "위치 정보 요청이 시간 초과되었습니다.";
              console.error("❌ [ERROR] 위치 요청 타임아웃");
              break;
            default:
              errorMessage = "위치 정보를 가져오는 중 오류가 발생했습니다.";
              console.error("❌ [ERROR] 기타 위치 오류");
              break;
          }
          reject(new Error(errorMessage));
        },
        options
      );
    });
  };

  // 모달이 열릴 때 현재 위치 가져오기
  const handleModalOpen = async () => {
    console.log("🚀 [DEBUG] 신고하기 버튼 클릭됨");
    console.log("🚀 [DEBUG] 모달 열기 - 현재 위치 가져오는 중...");

    try {
      console.log("🚀 [DEBUG] getCurrentLocationWithAddress 호출 시작");
      const locationInfo = await getCurrentLocationWithAddress();

      console.log("🎯 [SUCCESS] 현재 위치 정보 획득 성공:");
      console.log("  - 위도:", locationInfo.latitude);
      console.log("  - 경도:", locationInfo.longitude);
      console.log("  - 주소:", locationInfo.address);
      console.log("  - 전체 객체:", locationInfo);

      setCurrentLocation(locationInfo);
      console.log("🚀 [DEBUG] currentLocation state 업데이트 완료");

      open(); // 위치 정보 설정 후 모달 열기
      console.log("🚀 [DEBUG] 모달 열기 완료");
    } catch (error) {
      console.error("❌ [ERROR] 위치 정보 가져오기 실패:", error);
      console.error("❌ [ERROR] 에러 메시지:");

      // 위치 정보 실패해도 모달은 열기 (기본값 사용)
      const fallbackLocation = {
        latitude: 33.2541,
        longitude: 126.5597,
        address: "제주 서귀포시 (기본값)",
      };

      console.log("🔄 [FALLBACK] 기본 위치 사용:", fallbackLocation);
      setCurrentLocation(fallbackLocation);

      open();
      alert("위치 정보를 가져올 수 없어 기본 위치를 사용합니다.");
    }
  };

  const handleReport = (data: ReportData) => {
    console.log("신고 데이터:", data);
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
        //zoom: 18,
        mapId,
        colorScheme: google.maps.ColorScheme.LIGHT,
        disableDefaultUI: true,
        gestureHandling: "greedy",
      });
      setMap(map);

      // 제주 경계 맞추기
      const sw = new google.maps.LatLng(33.05, 126.14);
      const ne = new google.maps.LatLng(33.62, 126.98);
      const bounds = new google.maps.LatLngBounds(sw, ne);
      const adjusted = shrinkBoundsByZoom(bounds, SLIGHT_ZOOM_IN);
      map.fitBounds(adjusted);

      // ✅ 프로젝션 준비 후 맞추기
      google.maps.event.addListenerOnce(map, "projection_changed", () => {
        map.fitBounds(adjusted);
      });

      // ✅ fit 이후 첫 idle에서 줌 잠깐 락 + 살짝 확대(1회)
      google.maps.event.addListenerOnce(map, "idle", () => {
        // 현재 줌 잠깐 고정 (지도 내부 로직이 줌을 흔드는 걸 방지)
        const z = map.getZoom() ?? 10;
        clampZoomTemporarily(map, z, 280);

        // 락이 풀린 직후 한 번만 SLIGHT_ZOOM_IN 적용
        window.setTimeout(() => {
          slightZoomInOnce(map, SLIGHT_ZOOM_IN, didInitialSlightZoomRef);
        }, 300);
      });

      // fit 이후 살짝 확대
      /*google.maps.event.addListenerOnce(map, "idle", () => {
        const current = map.getZoom() ?? 9;
        map.moveCamera({ zoom: current + SLIGHT_ZOOM_IN }); // 0.4 유지
      });*/
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

  const lights = useLightsLayer(map, {
    initialEnabled: true,
    cooldownMs: 700,
  });

  // 현재 위치 따라가기 (기존 startFollow 함수도 구글 API 사용하도록 업데이트)
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

    const onPos: PositionCallback = async (p) => {
      const here = { lat: p.coords.latitude, lng: p.coords.longitude };

      // 구글 API로 주소 가져오기
      const address = await getAddressFromGoogle(
        p.coords.latitude,
        p.coords.longitude
      );

      // 현재 위치 state 업데이트 (실시간으로)
      setCurrentLocation({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        address,
      });

      if (!myMarkerRef.current) {
        myMarkerRef.current = new AdvancedMarkerElement({
          map,
          position: here,
          title: "현재 위치",
          content: makeIcon(),
          zIndex: 3000,
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

  useEffect(() => {
    if (!map) return;

    const refetchAll = () => {
      const c = map.getCenter();
      if (c) map.moveCamera({ center: c }); // ← zoom 파라미터 넣지 않기!
      setTimeout(() => {
        if (lights.enabled) lights.triggerReload?.();
        if (cctv.enabled) cctv.reload?.();
        if (report.enabled) report.reload?.();
      }, 0);
    };
    const onFocus = () => refetchAll();
    const onVisible = () => !document.hidden && refetchAll();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    // 처음 mount 되었을 때도 한번
    refetchAll();

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [map, lights.enabled, cctv.enabled, report.enabled]);

  return (
    <div style={{ width: "100%", height: "100dvh", position: "relative" }}>
      <div
        ref={canvasRef}
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
      />

      {/* 그라디언트 오버레이들 */}
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: "20%",
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
          inset: "auto 0 0 0",
          height: "20%",
          pointerEvents: "none",
          zIndex: 5,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.00) 100%)",
        }}
        aria-hidden
      />

      {/* 농장 버튼 */}
      <IconButton
        variant="ghost"
        size="xl"
        onClick={() => router.push("/farm")}
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
          style={{ width: 32, height: 32, pointerEvents: "none" }}
        />
      </IconButton>

      {/* 하단 컨트롤 바 */}
      <div
        style={{
          position: "absolute",
          bottom: "max(60px, env(safe-area-inset-bottom, 0px) + 12px)",
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingRight: "44px",
          paddingLeft: "80px",
          pointerEvents: "auto",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <SpeedDial
            actions={[
              {
                id: "star",
                label: "가로등",
                onClick: async () => {
                  if (!map) return;
                  await lockZoomAround(map, 320);
                  cctv.hide();
                  report.hide();
                  lights.show();
                  lights.reload({ force: true });
                },
              },
              {
                id: "cctv",
                label: "CCTV",
                onClick: async () => {
                  if (!map) return;
                  await lockZoomAround(map, 320);
                  lights.hide();
                  report.hide();
                  cctv.show();
                  cctv.reload({ force: true });
                },
              },
              {
                id: "notice",
                label: "신고",
                onClick: async () => {
                  if (!map) return;
                  await lockZoomAround(map, 320);
                  lights.hide();
                  cctv.hide();
                  report.show();
                  report.reload({ force: true });
                },
              },
            ]}
          />
        </div>

        <VStack textAlign={"center"}>
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
          <Text typography="body2" style={{ color: "#fff", marginLeft: "5px" }}>
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
      </div>

      {/* ReportModal - 구글 API로 가져온 현재 위치 전달 */}
      <ReportModal
        isOpen={isOpen}
        onClose={close}
        onReport={handleReport}
        currentLocation={currentLocation} // 구글 API로 가져온 위치 전달
      />
    </div>
  );
}
