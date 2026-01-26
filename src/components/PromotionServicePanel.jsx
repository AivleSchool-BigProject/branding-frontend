// src/components/PromotionServicePanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * ✅ 홍보물 컨설팅 서비스 선택 패널
 * - 홍보물 컨설팅은 단계형이 아니라 ‘각각 독립 서비스’
 * - 현재 서비스(activeKey) 강조
 * - localStorage 결과(선택 완료) 기반으로 완료 표시
 */

const SERVICES = [
  {
    key: "icon",
    label: "제품 아이콘",
    desc: "아이콘 가이드",
    icon: "🔹",
    path: "/promotion/icon/interview",
    legacyKey: "promo_icon_v1",
  },
  {
    key: "aicut",
    label: "AI컷 모델",
    desc: "모델 이미지",
    icon: "👤",
    path: "/promotion/aicut/interview",
    legacyKey: "promo_aicut_v1",
  },
  {
    key: "staging",
    label: "제품 연출컷",
    desc: "연출/무드",
    icon: "📸",
    path: "/promotion/staging/interview",
    legacyKey: "promo_staging_v1",
  },
  {
    key: "poster",
    label: "SNS 포스터",
    desc: "카피/레이아웃",
    icon: "📰",
    path: "/promotion/poster/interview",
    legacyKey: "promo_poster_v1",
  },
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
  return Boolean(parsed?.selected || parsed?.selectedId);
}

export default function PromotionServicePanel({ activeKey = "icon" }) {
  const navigate = useNavigate();

  const activeIndex = useMemo(() => {
    const idx = SERVICES.findIndex((s) => s.key === activeKey);

    return idx >= 0 ? idx : 0;
  }, [activeKey]);

  const activeService = useMemo(() => SERVICES[activeIndex], [activeIndex]);

  const [doneMap, setDoneMap] = useState(() => {
    const initial = {};

    SERVICES.forEach((s) => {
      initial[s.key] = false;
    });
    return initial;
  });

  const doneCount = useMemo(
    () => Object.values(doneMap).filter(Boolean).length,
    [doneMap],
  );

  useEffect(() => {
    try {
      const next = {};
      SERVICES.forEach((s) => {
        next[s.key] = isDone(s.legacyKey);
      });
      setDoneMap(next);
    } catch {
      // ignore
    }
  }, [activeKey]);

  const handleClick = (svc) => {
    if (!svc?.path) return;
    if (svc.key === activeKey) return;
    navigate(svc.path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="flowPanel" aria-label="홍보물 컨설팅 서비스 선택">
      <div className="flowPanel__top">
        <div className="flowPanel__left">
          <span className="flowPill">{activeService?.label || "서비스"}</span>
          <span className="flowPanel__mini">완료 {doneCount}/{SERVICES.length} · 각 서비스는 독립적으로 진행됩니다.</span>
        </div>
        <button
          type="button"
          className="flowLink"
          onClick={() => navigate("/promotion")}
          title="홍보물 컨설팅 홈으로 이동"
        >
          홍보물 홈
        </button>
      </div>

      <ol className="flowSteps">
        {SERVICES.map((s, i) => {
          const isActive = i === activeIndex;
          const isDoneState = doneMap[s.key];
          const stateClass = isActive ? "active" : isDoneState ? "done" : "todo";

          return (
            <li key={s.key} className={`flowStep ${stateClass}`}>
              <button
                type="button"
                className="flowStep__btn"
                onClick={() => handleClick(s)}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="flowStep__circle" aria-hidden>
                  {isDoneState && !isActive ? "✓" : s.icon}
                </span>
                <span className="flowStep__text">
                  <span className="flowStep__label">{s.label}</span>
                  <span className="flowStep__desc">{s.desc}</span>
                </span>
              </button>
</li>
          );
        })}
      </ol>

      <div className="flowTip">
        <span className="flowTip__badge">TIP</span>
        <div className="flowTip__body">
          <p className="flowTip__title">원하는 결과에 가까운 레퍼런스를 적어보세요</p>
          <p className="flowTip__text">
            제품 특징, 타깃, 분위기(미니멀/프리미엄/발랄 등), 피하고 싶은 느낌을 구체적으로 적으면
            후보 3안의 품질이 더 좋아집니다.
          </p>
        </div>
      </div>
    </section>
  );
}
