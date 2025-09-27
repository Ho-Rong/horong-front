import { CLUSTER_PIXELS, type ClusterSize } from "@/utils/cluster-size";

type GlowOptions = {
  seed?: number;
  blend?: "screen" | "normal";
};

type ClusterFamily = "small" | "medium" | "large";
const toFamily = (s: ClusterSize): ClusterFamily =>
  s.endsWith("small") ? "small" : s.endsWith("medium") ? "medium" : "large";

export function createCssGlowCluster(
  size: ClusterSize,
  { seed, blend = "screen" }: GlowOptions = {}
) {
  const px = CLUSTER_PIXELS[size];
  if (px == null) {
    // 방어: 잘못된 키가 들어오면 기본값/로깅
    console.warn("[createCssGlowCluster] unknown size:", size);
    return document.createTextNode("") as unknown as HTMLElement;
  }

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

  const core = document.createElement("div");
  core.classList.add("point");
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

  // 패밀리 단위 강도표
  const scaleRangeBy: Record<ClusterFamily, [number, number]> = {
    small: [0.95, 1.05],
    medium: [0.93, 1.07],
    large: [0.91, 1.09],
  };
  const opacityRangeBy: Record<ClusterFamily, [number, number]> = {
    small: [0.9, 1.0],
    medium: [0.88, 1.0],
    large: [0.85, 1.0],
  };

  const fam = toFamily(size);

  // seed 기반 미세 위상차
  const rnd = seeded(seed ?? Date.now());
  const dur = lerp(2.1, 2.6, rnd());
  const delayMs = Math.floor(rnd() * 600);
  const easing = "cubic-bezier(.33,.0,.17,1)";

  injectKeyframesOnce();

  const [sMin, sMax] = scaleRangeBy[fam];
  const [oMin, oMax] = opacityRangeBy[fam];

  core.style.setProperty("--s-min", String(sMin));
  core.style.setProperty("--s-max", String(sMax));
  core.style.setProperty("--o-min", String(oMin));
  core.style.setProperty("--o-max", String(oMax));
  core.style.animation = `lamp-breathe ${dur}s ${easing} ${delayMs}ms infinite`;

  (el as any).__dispose = () => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 160);
  };

  return el;
}

/* ---------- utils ---------- */
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
