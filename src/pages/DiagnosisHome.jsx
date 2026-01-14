import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/DiagnosisHome.css";

export default function DiagnosisHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [draft, setDraft] = useState(null);

  const brandRef = useRef(null);

  // ✅ 기업 진단 & 인터뷰 프로세스(상자 안에 설명까지)
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
        bullets: ["리스크/병목 자동 분석", "핵심 이슈 요약"],
      },
      {
        n: 3,
        title: "우선순위 & 로드맵",
        bullets: ["점수화 + 우선순위 도출", "4~12주 실행 로드맵 초안 생성"],
      },
      {
        n: 4,
        title: "결과 및 전략",
        bullets: ["실행 체크리스트 + KPI 제안", "맞춤 컨설팅 추천"],
      },
    ],
    []
  );

  // ===== localStorage 진행률(테스트용) =====
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
        return "우선순위 진단";
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

  const resumeAvailable = Boolean(draft);

  // ===== 드롭다운: 바깥 클릭/ESC 닫기 =====
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

  // ===== 액션(테스트용) =====
  const handleBrandItem = (action) => {
    setBrandOpen(false);
    const map = {
      concept: "컨셉 컨설팅",
      naming: "네이밍 컨설팅",
      logo: "로고 컨설팅",
      homepage: "홈페이지 컨설팅",
    };
    alert(`${map[action]} 클릭(테스트)`);
  };

  const handleStart = () => alert("기업 진단 시작(테스트)");
  const handleLogout = () => alert("로그아웃(테스트)");
  const handleHome = () => alert("홈으로 이동(테스트)");

  const handleResume = () => {
    if (!draft) return;
    alert(`이어서 진행(테스트)\n단계: ${stageLabel}\n진행률: ${progress}%`);
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
      {/* Header */}
      <header className="diagHome__header">
        <div className="diagHome__headerInner">
          <div
            className="diagHome__brand"
            role="button"
            tabIndex={0}
            onClick={handleHome}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleHome();
            }}
          >
            AI Consulting
          </div>

          <button
            className="diagHome__menuBtn"
            type="button"
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>

          <nav className={`diagHome__nav ${menuOpen ? "is-open" : ""}`}>
            <a href="#diagnosis" className="diagHome__link is-active">
              기업 진단 &amp; 인터뷰
            </a>

            <div
              className={`diagHome__dropdown ${brandOpen ? "is-open" : ""}`}
              ref={brandRef}
            >
              <button
                className="diagHome__link diagHome__dropdownBtn"
                type="button"
                aria-expanded={brandOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setBrandOpen((v) => !v);
                }}
              >
                브랜드 컨설팅{" "}
                <span className="diagHome__chev" aria-hidden="true">
                  ▾
                </span>
              </button>

              <div
                className="diagHome__dropdownPanel"
                role="menu"
                aria-label="브랜드 컨설팅 메뉴"
              >
                <button
                  className="diagHome__ddItem"
                  type="button"
                  onClick={() => handleBrandItem("concept")}
                >
                  컨셉 컨설팅
                </button>
                <button
                  className="diagHome__ddItem"
                  type="button"
                  onClick={() => handleBrandItem("naming")}
                >
                  네이밍 컨설팅
                </button>
                <button
                  className="diagHome__ddItem"
                  type="button"
                  onClick={() => handleBrandItem("logo")}
                >
                  로고 컨설팅
                </button>
                <button
                  className="diagHome__ddItem"
                  type="button"
                  onClick={() => handleBrandItem("homepage")}
                >
                  홈페이지 컨설팅
                </button>
              </div>
            </div>

            <a href="#promo" className="diagHome__link">
              홍보물 컨설팅
            </a>
            <a href="#home" className="diagHome__link">
              홈
            </a>
            <a href="#mypage" className="diagHome__link">
              마이페이지
            </a>

            <button
              className="diagHome__link diagHome__link--btn"
              type="button"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="diagHome__main">
        <section className="diagHome__heroCard">
          <p className="diagHome__heroText">
            간단한 정보를 입력하면 AI가 빠르게 분석하고, 주요 문제와 추천 전략을
            제공합니다.
          </p>

          {/* ✅ 프로세스: 상자 안에 상세 설명 */}
          <div className="processCard">
            <div className="processCard__head">
              <h3 className="processCard__title">기업 진단 프로세스</h3>
              <div className="processCard__sub">
                입력 → 분석 → 우선순위 → 전략 추천까지 한 번에
              </div>
            </div>

            <ol className="processGrid" aria-label="기업 진단 단계">
              {steps.map((s, idx) => (
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

                  {/* 연결선: PC에서만 보여줌 */}
                  {idx < steps.length - 1 && (
                    <span
                      className="processItem__connector"
                      aria-hidden="true"
                    />
                  )}
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
              disabled={!resumeAvailable}
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
            title="테스트용 저장 데이터 생성"
          >
            테스트 저장 생성
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="diagHome__footer">
        <div className="diagHome__footerInner">
          <div className="diagHome__footerTitle">
            KT AIVLE EDU 개인정보 처리방침 | 이용약관
          </div>
          <div className="diagHome__footerText">
            (주)케이티 경기도 성남시 분당구 불정로 90 (정자동) | 대표자명:
            김영섭 | 사업자등록번호: 102-81-42945
            <br />© 2026 AI Consulting. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
