import { CLUSTER_PIXELS, type ClusterSize } from "@/utils/cluster-size";

type GlowOptions = {
  seed?: number; // 위치 기반으로 지연/속도만 약간 다르게 (위상 분산)
  blend?: "screen" | "normal"; // 겹침시 화면 합성. 밝은 지도면 "normal" 사용
};

export function createCssGlowCluster(
  size: ClusterSize,
  { seed, blend = "screen" }: GlowOptions = {}
) {
  const px = CLUSTER_PIXELS[size];

  // === 래퍼 ===
  const el = document.createElement("div");
  el.style.width = `${px}px`;
  el.style.height = `${px}px`;
  el.style.position = "relative";
  el.style.borderRadius = "50%";
  el.style.overflow = "visible";
  el.style.pointerEvents = "auto";
  el.style.transform = "translateZ(0)";
  el.style.willChange = "transform,opacity";
  el.style.opacity = "0";
  el.style.transition = "opacity 200ms ease";
  requestAnimationFrame(() => (el.style.opacity = "1"));

  // === 단일 core 레이어 (요청한 색/그라데이션 + blur 2px) ===
  const core = document.createElement("div");
  core.style.position = "absolute";
  core.style.inset = "0";
  core.style.borderRadius = "50%";
  core.style.background =
    "radial-gradient(50% 50% at 50% 50%, #FEFBA8 0%, rgba(254, 251, 168, 0.00) 100%)";
  core.style.filter = "blur(2px)";
  core.style.transformOrigin = "50% 50%";
  core.style.pointerEvents = "none";
  if (blend === "screen") core.style.mixBlendMode = "screen";

  el.append(core);

  // === 사이즈별 “호흡” 강도(스케일/불투명도 범위) ===
  // === 사이즈별 “호흡” 강도(스케일/불투명도 범위) ===
  const scaleRangeBy: Record<ClusterSize, [number, number]> = {
    small: [0.95, 1.05], // ±5%
    medium: [0.93, 1.07], // ±7%
    large: [0.91, 1.09], // ±9%
  };
  const opacityRangeBy: Record<ClusterSize, [number, number]> = {
    small: [0.9, 1.0],
    medium: [0.88, 1.0],
    large: [0.85, 1.0],
  };

  // seed → 지연/속도만 약간 다르게 (모두 부드럽고, “흔들림 없음”)
  const rnd = seeded(seed ?? Date.now());
  const dur = lerp(2.1, 2.6, rnd()); // 2.1~2.6s
  const delayMs = Math.floor(rnd() * 600); // 0~600ms
  const easing = "cubic-bezier(.33,.0,.17,1)"; // 부드럽게 들어와서 부드럽게 나감

  injectKeyframesOnce();

  const [sMin, sMax] = scaleRangeBy[size];
  const [oMin, oMax] = opacityRangeBy[size];

  core.style.setProperty("--s-min", String(sMin));
  core.style.setProperty("--s-max", String(sMax));
  core.style.setProperty("--o-min", String(oMin));
  core.style.setProperty("--o-max", String(oMax));
  core.style.animation = `lamp-breathe ${dur}s ${easing} ${delayMs}ms infinite`;

  // 제거 시 부드럽게
  (el as any).__dispose = () => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 160);
  };

  return el;
}

/* ---------- 유틸 ---------- */
function seeded(s: number) {
  let x = s >>> 0 || 1;
  return () => (x = (x * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

let injected = false;
function injectKeyframesOnce() {
  if (injected) return;
  injected = true;
  const st = document.createElement("style");
  st.textContent = `
  /* 순수 호흡(흔들림/깜빡임/이동 없음): scale + opacity 만 */
  @keyframes lamp-breathe {
    0%   { transform: scale(var(--s-min,0.985)); opacity: var(--o-min,0.94); }
    50%  { transform: scale(var(--s-max,1.015)); opacity: var(--o-max,1);    }
    100% { transform: scale(var(--s-min,0.985)); opacity: var(--o-min,0.94); }
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes lamp-breathe { 0%,50%,100% { transform:none; opacity:1; } }
  }`;
  document.head.appendChild(st);
}
