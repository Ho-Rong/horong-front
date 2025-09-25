function createClusterCircle(count: number, zoom = 10) {
  const base = mapSqrt(count, 1, 200, 36, 220);
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

  el.style.background = `
      radial-gradient(
        70.49% 70.46% at 50.35% 50%,
        rgba(254, 251, 168, 0.70) 0%,
        rgba(255, 249, 98, 0.10) 14.9%,
        rgba(255, 248, 75, 0.20) 40.87%,
        rgba(255, 249, 93, 0.40) 65.87%,
        var(--color-lemon-050, #FEFBA8) 100%
      )
    `;
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
