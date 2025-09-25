"use client";

import * as React from "react";

import { cn } from "@/utils/cn";
import * as styles from "./Icon.css";
import { iconMap } from "../icons";

export type IconName = keyof typeof iconMap;

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name: IconName;
  /** px 또는 css 길이값. 예: 16 | '1.25rem' */
  size?: number | string;
  /** CSS color 값. 예: '#2C60FF' | 'var(--c-primary50)' */
  color?: string;
  /** 기본 currentColor 적용 끄기 (기본: false = 적용) */
  disableCurrentColor?: boolean;
  /** 접근성 레이블 (없으면 장식용) */
  title?: string;
  className?: string;
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  (
    {
      name,
      size,
      color,
      disableCurrentColor,
      title,
      className,
      style,
      ...rest
    },
    ref
  ) => {
    const IconComponent = iconMap[name];
    if (!IconComponent) {
      console.warn(`Icon "${name}" not found`);
      return null;
    }

    const sizeStyle =
      typeof size === "number"
        ? { width: size, height: size }
        : size
        ? { width: size, height: size }
        : undefined;

    const colorStyle = color ? { color } : undefined;

    return (
      <IconComponent
        ref={ref}
        role={title ? "img" : undefined}
        aria-hidden={title ? undefined : true}
        className={cn(
          styles.baseIcon,
          !disableCurrentColor && styles.currentColorStroke,
          className
        )}
        style={{ ...colorStyle, ...sizeStyle, ...style }}
        title={title}
        {...rest}
      />
    );
  }
);
Icon.displayName = "Icon";
