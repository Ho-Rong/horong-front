import React from "react";

interface GradientBackgroundProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const GradientBackground = ({
  width = 393,
  height = 484,
  className,
  style,
}: GradientBackgroundProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 393 484"
      fill="none"
      className={className}
      style={style}
    >
      <g opacity="0.4" filter="url(#filter0_fn_31217_20512)">
        <circle
          cx="199"
          cy="242"
          r="142"
          fill="url(#paint0_linear_31217_20512)"
        />
      </g>
      <defs>
        <filter
          id="filter0_fn_31217_20512"
          x="-43"
          y="0"
          width="484"
          height="484"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="50"
            result="effect1_foregroundBlur_31217_20512"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="2 2"
            stitchTiles="stitch"
            numOctaves="3"
            result="noise"
            seed="2866"
          />
          <feColorMatrix
            in="noise"
            type="luminanceToAlpha"
            result="alphaNoise"
          />
          <feComponentTransfer in="alphaNoise" result="coloredNoise1">
            <feFuncA
              type="discrete"
              tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 "
            />
          </feComponentTransfer>
          <feComposite
            operator="in"
            in2="effect1_foregroundBlur_31217_20512"
            in="coloredNoise1"
            result="noise1Clipped"
          />
          <feFlood floodColor="rgba(0, 0, 0, 0.25)" result="color1Flood" />
          <feComposite
            operator="in"
            in2="noise1Clipped"
            in="color1Flood"
            result="color1"
          />
          <feMerge result="effect2_noise_31217_20512">
            <feMergeNode in="effect1_foregroundBlur_31217_20512" />
            <feMergeNode in="color1" />
          </feMerge>
        </filter>
        <linearGradient
          id="paint0_linear_31217_20512"
          x1="131.162"
          y1="166.113"
          x2="243.306"
          y2="384"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D071FF" />
          <stop offset="1" stopColor="#4EFFAA" />
        </linearGradient>
      </defs>
    </svg>
  );
};
