"use client";

import * as React from "react";
import * as s from "./SpeedDial.css";
import {
  PlusOutlineIcon,
  NoticeCircleIcon,
  CloseOutlineIcon,
  PresetOutlineIcon,
} from "@vapor-ui/icons";
import { IconButton } from "@vapor-ui/core";
import { Icon } from "../Icon/Icon";

// 필요한 id를 명시적으로 유니온으로 두고(안정성↑), 그 외 문자열도 허용

type BuiltInId = "star" | "cctv" | "notice";
type SpeedDialAction = {
  id: BuiltInId | (string & {});
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
};

export function SpeedDial({
  actions,
  style,
}: {
  actions: SpeedDialAction[];
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<
    SpeedDialAction["id"] | null
  >(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const defaultIcons: Record<BuiltInId, React.ReactNode> = {
    star: <Icon name="star" width={24} height={24} />,
    cctv: <Icon name="cctv" width={24} height={24} />,
    notice: <NoticeCircleIcon width={24} height={24} />,
  };

  const getIconFor = (a: SpeedDialAction) => {
    if (a.icon) return a.icon;
    if ((["star", "cctv", "notice"] as const).includes(a.id as BuiltInId)) {
      return defaultIcons[a.id as BuiltInId];
    }
    return null;
  };

  const getSelectedIcon = () => {
    if (!selectedId) return null;
    const found = actions.find((a) => a.id === selectedId);
    return found ? getIconFor(found) : null;
  };

  const delayKey = (idx: number) =>
    (["d0", "d1", "d2", "d3"] as const)[Math.min(idx, 3)];

  const floatingBtnStyle: React.CSSProperties = {
    borderRadius: "50%",
    backdropFilter: "blur(8px)",
    background: "rgba(255,255,255,0.2)",
    border: "0.5px solid rgba(255,255,255,0.5)",
    color: "#fff",
  };

  return (
    <div className={s.root} style={style}>
      {/* 펼쳐지는 액션들 */}
      <div className={s.actionsWrap({ open })} aria-hidden={!open}>
        {actions.map((a, idx) => {
          const iconEl = getIconFor(a);
          return (
            <IconButton
              key={a.id}
              variant="ghost"
              size="xl"
              onClick={() => {
                setSelectedId(a.id); // ✅ 선택 아이콘 기억
                a.onClick?.();
                setOpen(false); // 닫기
              }}
              aria-label={a.label ?? String(a.id)}
              className={s.actionBtn({ open, delay: delayKey(idx) })}
              style={floatingBtnStyle}
            >
              {iconEl}
            </IconButton>
          );
        })}
      </div>

      {/* 메인 FAB */}
      <IconButton
        variant="ghost"
        size="xl"
        onClick={() => setOpen((v) => !v)}
        style={floatingBtnStyle}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-pressed={open}
      >
        {/* 열렸을 때는 무조건 X, 닫혔을 때는 선택 아이콘 또는 + */}
        {open ? (
          <CloseOutlineIcon width={24} height={24} />
        ) : getSelectedIcon() ? (
          // ✅ 선택된 아이콘 표시
          <span className={s.fabIconSwap}>
            <span className={s.fabIcon({ kind: "plus", open: false })}>
              {getSelectedIcon()}
            </span>
          </span>
        ) : (
          // 선택 전에는 + 아이콘
          <span className={s.fabIconSwap}>
            <span className={s.fabIcon({ kind: "plus", open: false })}>
              <PresetOutlineIcon width={24} height={24} />
            </span>
          </span>
        )}
      </IconButton>
    </div>
  );
}
