// src/pages/DiagnosisHome.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/DiagnosisHome.css";

import SiteFooter from "../components/SiteFooter.jsx";

// ✅ 모달/콘텐츠(메인과 동일하게 쓰려면)
import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

export default function DiagnosisHome({ onLogout }) {
  const navigate = useNavigate();

  // ✅ 브랜드 컨설팅 드롭다운 (메인과 동일)
  const [brandOpen, setBrandOpen] = useState(false);
  const brandRef = useRef(null);

  // ✅ 푸터 약관/방침 모달 (메인과 동일)
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!brandOpen) return;
      if (brandRef.current && !brandRef.current.contains(e.target)) {
        setBrandOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setBrandOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [brandOpen]);

  const handleBrandItem = (action) => {
    setBrandOpen(false);
    const map = {
      concept: "컨셉 컨설팅",
      naming: "네이밍 컨설팅",
      logo: "로고 컨설팅",
      homepage: "홈페이지 컨설팅",
    };
    alert(`${map[action]} 클릭 (테스트)`);
  };

  // ✅ 메인페이지와 동일하게: 기업진단 버튼 클릭 시 이 페이지(/diagnosis) 유지
  const handleDiagnosisClick = () => navigate("/diagnosis");

  // ✅ 로그아웃 처리 (메인과 동일)
  const handleLogout = () => {
    if (typeof onLogout === "function") onLogout();
    else navigate("/login");
  };

  // ✅ 4칸 프로세스
  const steps = useMemo(
    () => [
      {
        n: 1,
        title: "기본 정보 입력",
        bullets: ["성장단계/산업/아이템 입력", "문제·예산·팀·12개월 목표 정리"],
      },
      {
        n: 2,
        title: "AI 분석",
        bullets: ["리스크/병목 자동 분석", "영역별 점수화 + 이슈 요약"],
      },
      {
        n: 3,
        title: "우선순위 & 로드맵",
        bullets: ["핵심 과제 우선순위 도출", "4~12주 실행 로드맵 초안 생성"],
      },
      {
        n: 4,
        title: "결과 및 전략",
        bullets: ["체크리스트/KPI 제안", "맞춤 컨설팅 추천"],
      },
    ],
    []
  );

  // ===== localStorage 진행률(테스트용) =====
  const [draft, setDraft] = useState(null);

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem("diagnosisDraft");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    setDraft(loadDraft());
  }, []);

  const progress = useMemo(() => {
    const p = Number(draft?.progress ?? 0);
    if (!Number.isFinite(p)) return 0;
    return Math.max(0, Math.min(100, p));
  }, [draft]);

  const stageLabel = useMemo(() => {
    const stage = Number(draft?.stage ?? 0);
    switch (stage) {
      case 1:
        return "기본 정보 입력";
      case 2:
        return "AI 분석";
      case 3:
        return "우선순위 & 로드맵";
      case 4:
        return "결과 및 전략";
      default:
        return "미시작";
    }
  }, [draft]);

  const lastSaved = useMemo(() => {
    const t = draft?.updatedAt;
    if (!t) return "-";
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
  }, [draft]);

  const handleStart = () => alert("기업 진단 시작 (테스트)");
  const handleResume = () => {
    if (!draft) return;
    alert(`이어서 진행 (테스트)\n단계: ${stageLabel}\n진행률: ${progress}%`);
  };
  const handleRestart = () => {
    localStorage.removeItem("diagnosisDraft");
    setDraft(null);
    alert("진단 데이터를 초기화했습니다. (localStorage 삭제)");
  };
  const handleSeed = () => {
    const sample = { progress: 35, stage: 2, updatedAt: Date.now() };
    localStorage.setItem("diagnosisDraft", JSON.stringify(sample));
    setDraft(sample);
    alert("테스트 저장 데이터를 만들었습니다! (진행률 35%, AI 분석 단계)");
  };

  return (
    <div className="diagHome">
      {/* ✅ 개인정보/이용약관 모달 (메인과 동일) */}
      <PolicyModal
        open={openType === "privacy"}
        title="개인정보 처리방침"
        onClose={closeModal}
      >
        <PrivacyContent />
      </PolicyModal>

      <PolicyModal
        open={openType === "terms"}
        title="이용약관"
        onClose={closeModal}
      >
        <TermsContent />
      </PolicyModal>

      {/* ✅ Header: MainPage 형식으로 통일 */}
      <header className="main-header">
        <div
          className="brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/main")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") navigate("/main");
          }}
        >
          BRANDPILOT
        </div>

        <nav className="main-nav" aria-label="주요 메뉴">
          <button
            type="button"
            className="nav-link"
            onClick={handleDiagnosisClick}
          >
            기업 진단 &amp; 인터뷰
          </button>

          <div
            className={`nav-dropdown ${brandOpen ? "is-open" : ""}`}
            ref={brandRef}
          >
            <button
              type="button"
              className="nav-link nav-dropdown__btn"
              aria-expanded={brandOpen ? "true" : "false"}
              onClick={() => setBrandOpen((v) => !v)}
            >
              브랜드 컨설팅 <span className="nav-dropdown__chev">▾</span>
            </button>

            <div
              className="nav-dropdown__panel"
              role="menu"
              aria-label="브랜드 컨설팅 메뉴"
            >
              <button
                type="button"
                className="nav-dropdown__item"
                onClick={() => handleBrandItem("concept")}
              >
                컨셉 컨설팅
              </button>
              <button
                type="button"
                className="nav-dropdown__item"
                onClick={() => handleBrandItem("naming")}
              >
                네이밍 컨설팅
              </button>
              <button
                type="button"
                className="nav-dropdown__item"
                onClick={() => handleBrandItem("logo")}
              >
                로고 컨설팅
              </button>
              <button
                type="button"
                className="nav-dropdown__item"
                onClick={() => handleBrandItem("homepage")}
              >
                홈페이지 컨설팅
              </button>
            </div>
          </div>

          <button type="button" className="nav-link">
            홍보물 컨설팅
          </button>
        </nav>

        <div className="account-nav">
          <button
            type="button"
            className="nav-link"
            onClick={() => navigate("/main")}
          >
            홈
          </button>
          <button type="button" className="nav-link">
            마이페이지
          </button>
          <button type="button" className="nav-link" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <main className="diagHome__main">
        <section className="diagHome__heroCard">
          <p className="diagHome__heroText">
            간단한 정보를 입력하면 AI가 빠르게 분석하고, 주요 문제와 추천 전략을
            제공합니다.
          </p>

          <div className="processCard">
            <div className="processCard__head">
              <h3 className="processCard__title">기업 진단 프로세스</h3>
              <div className="processCard__sub">
                입력 → 분석 → 우선순위 → 전략까지 한 번에
              </div>
            </div>

            <ol className="processGrid" aria-label="기업 진단 단계">
              {steps.map((s) => (
                <li className="processItem" key={s.n}>
                  <div className="processItem__top">
                    <span className="processItem__badge">{s.n}</span>
                    <div className="processItem__title">{s.title}</div>
                  </div>
                  <ul className="processItem__list">
                    {s.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="diagHome__topGrid">
          <button
            className="diagHome__startCard"
            type="button"
            onClick={handleStart}
          >
            기업 진단 시작하기
            <div className="diagHome__startSub">
              평균 3~5분 · 결과 리포트 + 실행 체크리스트 제공
            </div>
          </button>

          <div className="diagHome__rightCard">
            <div className="diagHome__rightHint">
              <div className="diagHome__rightTitle">가이드</div>
              <div className="diagHome__rightDesc">
                • 로그인 상태에서 결과가 저장됩니다
                <br />
                • 중간 저장 후 이어서 진행 가능
                <br />• 리포트는 히스토리에서 다시 확인 가능
              </div>
            </div>
          </div>
        </section>

        <section className="diagHome__progressWrap">
          <div className="diagHome__progressInner">
            <h2 className="diagHome__progressTitle">
              기업 진단 진행률 및 정보 표시
            </h2>

            <div
              className="diagHome__progressBar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="diagHome__progressFill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="diagHome__meta">
              <div className="diagHome__metaRow">
                <span className="diagHome__metaKey">현재 단계</span>
                <span className="diagHome__metaVal">{stageLabel}</span>
              </div>
              <div className="diagHome__metaRow">
                <span className="diagHome__metaKey">진행률</span>
                <span className="diagHome__metaVal">{progress}%</span>
              </div>
              <div className="diagHome__metaRow">
                <span className="diagHome__metaKey">마지막 저장</span>
                <span className="diagHome__metaVal">{lastSaved}</span>
              </div>
            </div>
          </div>

          <div className="diagHome__actions">
            <button
              className="diagHome__actionBtn"
              type="button"
              onClick={handleResume}
              disabled={!draft}
            >
              이어서 진행하기
            </button>
            <button
              className="diagHome__actionBtn diagHome__actionBtn--ghost"
              type="button"
              onClick={handleRestart}
            >
              처음부터 다시 하기
            </button>
          </div>

          <button
            className="diagHome__devSeed"
            type="button"
            onClick={handleSeed}
          >
            테스트 저장 생성
          </button>
        </section>
      </main>

      {/* ✅ Footer: DiagnosisHome 형식으로 통일(공통 컴포넌트) */}
      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
