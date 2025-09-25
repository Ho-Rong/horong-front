import React from "react";

interface MinusIconProps {
  width?: number;
  height?: number;
  fill?: string;
  className?: string;
}

export const MinusIcon = ({
  width = 14,
  height = 14,
  fill = "white",
  className,
}: MinusIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 14 14"
      fill="none"
      className={className}
    >
      <path
        d="M3.50008 7.58268C3.3348 7.58268 3.19626 7.52678 3.08446 7.41497C2.97265 7.30317 2.91675 7.16463 2.91675 6.99935C2.91675 6.83407 2.97265 6.69553 3.08446 6.58372C3.19626 6.47192 3.3348 6.41602 3.50008 6.41602H10.5001C10.6654 6.41602 10.8039 6.47192 10.9157 6.58372C11.0275 6.69553 11.0834 6.83407 11.0834 6.99935C11.0834 7.16463 11.0275 7.30317 10.9157 7.41497C10.8039 7.52678 10.6654 7.58268 10.5001 7.58268H3.50008Z"
        fill={fill}
      />
    </svg>
  );
};
