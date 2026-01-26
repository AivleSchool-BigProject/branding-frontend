// src/components/ConsultingFlowMini.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * ✅ 오른쪽 스티키 사이드바에 들어가는 '전체 4단계' 미니 표시
 * - 인터뷰를 진행하면서(스크롤 중에도) 내가 어느 단계인지 바로 확인 가능
 */

const STEPS = [
  { key: "naming", label: "네이밍", legacyKey: "brandInterview_naming_v1" },
  { key: "concept", label: "컨셉", legacyKey: "brandInterview_homepage_v1" },
  { key: "story", label: "스토리", legacyKey: "brandInterview_story_v1" },
  { key: "logo", label: "로고", legacyKey: "brandInterview_logo_v1" },
];

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isDone(legacyKey) {
  const parsed = safeParse(localStorage.getItem(legacyKey));
  if (!parsed) return false;
  if (parsed.selected) return true;
  if (parsed.selectedId) return true;
  return false;
}

export default function ConsultingFlowMini({ activeKey = "naming" }) {
  const activeIndex = useMemo(() => {
    const idx = STEPS.findIndex((s) => s.key === activeKey);
    return idx >= 0 ? idx : 0;
  }, [activeKey]);

  const [doneMap, setDoneMap] = useState(() => {
    const init = {};
    STEPS.forEach((s) => (init[s.key] = false));
    return init;
  });

  useEffect(() => {
    try {
      const next = {};
      STEPS.forEach((s) => {
        next[s.key] = isDone(s.legacyKey);
      });
      setDoneMap(next);
    } catch {
      // ignore
    }
  }, [activeKey]);

  return (
    <div className="flowMini" aria-label="전체 컨설팅 단계">
      <div className="flowMini__head">
        <span className="flowMini__title">전체 단계</span>
        <span className="flowMini__meta">
          {activeIndex + 1}/{STEPS.length}
        </span>
      </div>
      <div className="flowMini__row">
        {STEPS.map((s, i) => {
          const isActive = i === activeIndex;
          const done = doneMap[s.key] || i < activeIndex;
          const cls = isActive ? "active" : done ? "done" : "todo";
          return (
            <span key={s.key} className={`flowMini__pill ${cls}`}
              title={done ? "완료" : isActive ? "진행 중" : "대기"}
            >
              {done && !isActive ? "✓" : i + 1}. {s.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
