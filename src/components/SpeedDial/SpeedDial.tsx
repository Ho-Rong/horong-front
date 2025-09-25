"use client";

import * as React from "react";
import * as s from "./SpeedDial.css";
import {
  PlusOutlineIcon,
  NoticeCircleIcon,
  CloseOutlineIcon,
} from "@vapor-ui/icons";
import { IconButton } from "@vapor-ui/core";
import { Icon } from "../Icon/Icon";

// 필요한 id를 명시적으로 유니온으로 두고(안정성↑), 그 외 문자열도 허용
type BuiltInId = "star" | "cctv" | "notice";
type SpeedDialAction = {
  id: BuiltInId | (string & {}); // 커스텀 id도 가능
  label?: string;
  icon?: React.ReactNode; // 외부에서 아이콘 주면 그걸 우선 사용
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

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 액션별 기본 아이콘 매핑
  const defaultIcons: Record<BuiltInId, React.ReactNode> = {
    star: <Icon name="star" width={24} height={24} />,
    cctv: <Icon name="cctv" width={24} height={24} />,
    notice: <NoticeCircleIcon width={24} height={24} />,
  };

  const getIconFor = (a: SpeedDialAction) => {
    if (a.icon) return a.icon; // 외부 주입 아이콘 우선
    if ((["star", "cctv", "notice"] as const).includes(a.id as BuiltInId)) {
      return defaultIcons[a.id as BuiltInId];
    }
    return null; // 아이콘 없을 수도 있음
  };

  const delayKey = (idx: number) =>
    (["d0", "d1", "d2", "d3"] as const)[Math.min(idx, 3)];

  // 공통 버튼 스타일
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
                a.onClick?.();
                setOpen(false);
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
        {/* ← 아이콘 두 개를 겹쳐놓고 상태로 토글 */}
        <span className={s.fabIconSwap}>
          <span className={s.fabIcon({ kind: "plus", open })}>
            <PlusOutlineIcon width={24} height={24} />
          </span>
          <span className={s.fabIcon({ kind: "close", open })}>
            <CloseOutlineIcon width={24} height={24} />
          </span>
        </span>
      </IconButton>
    </div>
  );
}
