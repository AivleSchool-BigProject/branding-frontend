// src/pages/DiagnosisInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

const STORAGE_KEY = "diagnosisInterviewDraft_v1";
const HOME_SUMMARY_KEY = "diagnosisDraft";

// ✅ 선택지(너가 적은 기준 기반)
const INDUSTRY_OPTIONS = [
  { value: "saas", label: "SaaS/플랫폼" },
  { value: "manufacturing", label: "제조/하드웨어" },
  { value: "commerce", label: "커머스" },
  { value: "education", label: "교육" },
  { value: "healthcare", label: "헬스케어" },
  { value: "finance", label: "금융" },
  { value: "content", label: "콘텐츠/미디어" },
  { value: "mobility", label: "모빌리티/운송" },
  { value: "etc", label: "기타" },
];

const STAGE_OPTIONS = [
  { value: "idea", label: "아이디어 단계" },
  { value: "mvp", label: "MVP 개발/테스트 중" },
  { value: "early_revenue", label: "초기 매출 발생" },
  { value: "pmf", label: "PMF 탐색" },
  { value: "scaleup", label: "스케일업" },
];

const PERSONA_OPTIONS = [
  { value: "trend_2030", label: "2030 트렌드 세터" },
  { value: "worker_3040", label: "3040 직장인" },
  { value: "startup_ceo", label: "초기 스타트업 대표" },
  { value: "mid_manager", label: "중견기업 팀장" },
  { value: "professional", label: "전문직(의/법/회계 등)" },
  { value: "student", label: "학생/취준생" },
  { value: "etc", label: "기타" },
];

export default function DiagnosisInterview({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 폼 상태 (초기 진단 7문항 중심)
  const [form, setForm] = useState({
    // 기본
    companyName: "",
    website: "",

    // Foundation (초기 진단)
    oneLine: "", // 한 줄 정의
    industry: "", // 산업 카테고리
    stage: "", // 성장 단계
    customerProblem: "", // 핵심 문제
    targetPersona: "", // 타겟 고객 페르소나
    usp: "", // 차별화 포인트
    visionHeadline: "", // 5년 뒤 헤드라인(비전)
  });

  // ✅ 저장 상태 UI
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");
  const [loaded, setLoaded] = useState(false);

  // 섹션 스크롤용 ref
  const refBasic = useRef(null);
  const refFoundation = useRef(null);
  const refCustomer = useRef(null);
  const refDiff = useRef(null);
  const refVision = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "foundation", label: "비즈니스 정의", ref: refFoundation },
      { id: "customer", label: "고객/문제", ref: refCustomer },
      { id: "diff", label: "차별화 포인트", ref: refDiff },
      { id: "vision", label: "비전(5년)", ref: refVision },
    ],
    [],
  );

  // ✅ 필수 항목(초기 진단 7개)
  const requiredKeys = useMemo(
    () => [
      "oneLine",
      "industry",
      "stage",
      "customerProblem",
      "targetPersona",
      "usp",
      "visionHeadline",
    ],
    [],
  );

  const requiredStatus = useMemo(() => {
    const status = {};
    requiredKeys.forEach((k) => {
      status[k] = Boolean(form[k]?.trim());
    });
    return status;
  }, [form, requiredKeys]);

  const completedRequired = useMemo(() => {
    return requiredKeys.filter((k) => requiredStatus[k]).length;
  }, [requiredKeys, requiredStatus]);

  const progress = useMemo(() => {
    if (requiredKeys.length === 0) return 0;
    return Math.round((completedRequired / requiredKeys.length) * 100);
  }, [completedRequired, requiredKeys.length]);

  const canAnalyze = completedRequired === requiredKeys.length;

  // ✅ 현재 단계
  const currentSectionLabel = useMemo(() => {
    if (!form.oneLine.trim() || !form.industry.trim() || !form.stage.trim())
      return "비즈니스 정의";
    if (!form.customerProblem.trim() || !form.targetPersona.trim())
      return "고객/문제";
    if (!form.usp.trim()) return "차별화 포인트";
    if (!form.visionHeadline.trim()) return "비전(5년)";
    return "완료";
  }, [form]);

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getFirstIncompleteRef = () => {
    if (!form.oneLine.trim() || !form.industry.trim() || !form.stage.trim())
      return refFoundation;
    if (!form.customerProblem.trim() || !form.targetPersona.trim())
      return refCustomer;
    if (!form.usp.trim()) return refDiff;
    if (!form.visionHeadline.trim()) return refVision;
    return refVision;
  };

  // ✅ Home에 표시할 요약 저장
  const saveHomeSummary = (updatedAtTs) => {
    try {
      const summary = {
        progress,
        completedRequired,
        requiredTotal: requiredKeys.length,
        stageLabel: currentSectionLabel,
        updatedAt: updatedAtTs,
      };
      localStorage.setItem(HOME_SUMMARY_KEY, JSON.stringify(summary));
    } catch {
      // ignore
    }
  };

  // ✅ draft 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed?.form) setForm((prev) => ({ ...prev, ...parsed.form }));
      if (parsed?.updatedAt) {
        const d = new Date(parsed.updatedAt);
        if (!Number.isNaN(d.getTime())) setLastSaved(d.toLocaleString());
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }, []);

  // ✅ “이어서 진행하기”로 들어오면 첫 미완료 섹션으로 이동
  useEffect(() => {
    if (!loaded) return;
    const mode = location.state?.mode;
    if (mode !== "resume") return;

    const t = setTimeout(() => {
      scrollToSection(getFirstIncompleteRef());
    }, 60);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // ✅ 자동 저장(디바운스)
  useEffect(() => {
    if (!loaded) return;
    setSaveMsg("");

    const t = setTimeout(() => {
      try {
        const payload = { form, updatedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setLastSaved(new Date(payload.updatedAt).toLocaleString());
        setSaveMsg("자동 저장됨");
        saveHomeSummary(payload.updatedAt);
      } catch {
        // ignore
      }
    }, 600);

    return () => clearTimeout(t);
  }, [
    form,
    loaded,
    progress,
    completedRequired,
    requiredKeys.length,
    currentSectionLabel,
  ]);

  const setValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTempSave = () => {
    try {
      const payload = { form, updatedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSaved(new Date(payload.updatedAt).toLocaleString());
      setSaveMsg("임시 저장 완료");
      saveHomeSummary(payload.updatedAt);
    } catch {
      setSaveMsg("저장 실패");
    }
  };

  const handleNext = () => {
    const label = currentSectionLabel;
    const map = {
      "기본 정보": refFoundation,
      "비즈니스 정의": refCustomer,
      "고객/문제": refDiff,
      "차별화 포인트": refVision,
      "비전(5년)": null,
      완료: null,
    };
    const nextRef = map[label];
    if (!nextRef) return;
    scrollToSection(nextRef);
  };

  const handleAnalyze = () => {
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 AI 분석 요청이 가능합니다.");
      return;
    }

    // 홈 진행률용(선택)
    const payload = {
      progress,
      stageLabel: currentSectionLabel,
      updatedAt: Date.now(),
    };
    localStorage.setItem(HOME_SUMMARY_KEY, JSON.stringify(payload));

    navigate("/diagnosis/result");
  };

  return (
    <div className="diagInterview">
      {/* ✅ 약관/방침 모달 */}
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

      {/* ✅ 공통 헤더 */}
      <SiteHeader onLogout={onLogout} />

      <main className="diagInterview__main">
        <div className="diagInterview__container">
          {/* 상단 타이틀 */}
          <div className="diagInterview__titleRow">
            <div>
              <h1 className="diagInterview__title">
                초기 진단 인터뷰 (Foundation)
              </h1>
              <p className="diagInterview__sub">
                비즈니스의 정체를 정의하는 단계입니다. 입력이 구체적일수록 분석
                결과가 더 선명해집니다.
              </p>
            </div>

            <div className="diagInterview__topActions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate("/diagnosis")}
              >
                진단 홈으로
              </button>
              <button type="button" className="btn" onClick={handleTempSave}>
                임시저장
              </button>
            </div>
          </div>

          <div className="diagInterview__grid">
            {/* ✅ 왼쪽: 폼 */}
            <section className="diagInterview__left">
              {/* BASIC */}
              <div className="card" ref={refBasic}>
                <div className="card__head">
                  <h2>0. 기본 정보 (선택)</h2>
                  <p>프로젝트 식별을 위해 적어두면 좋아요.</p>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>회사/프로젝트명 (선택)</label>
                    <input
                      value={form.companyName}
                      onChange={(e) => setValue("companyName", e.target.value)}
                      placeholder="예) BRANDPILOT"
                    />
                  </div>

                  <div className="field">
                    <label>웹사이트/소개 링크 (선택)</label>
                    <input
                      value={form.website}
                      onChange={(e) => setValue("website", e.target.value)}
                      placeholder="예) https://..."
                    />
                  </div>
                </div>
              </div>

              {/* FOUNDATION */}
              <div className="card" ref={refFoundation}>
                <div className="card__head">
                  <h2>1. 비즈니스 정의</h2>
                  <p>정체를 정의하면 이후 단계(네이밍/로고/홍보)가 쉬워져요.</p>
                </div>

                <div className="field">
                  <label>
                    한 줄 정의 <span className="req">*</span>
                  </label>
                  <input
                    value={form.oneLine}
                    onChange={(e) => setValue("oneLine", e.target.value)}
                    placeholder="10살 조카에게 설명하듯, 한 문장으로 서비스를 정의해보세요."
                  />
                  <small className="helper">
                    예) “초기 스타트업이 브랜딩을 빠르게 정리하고 실행하도록
                    돕는 AI 컨설팅 플랫폼”
                  </small>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>
                      산업 카테고리 <span className="req">*</span>
                    </label>
                    <select
                      value={form.industry}
                      onChange={(e) => setValue("industry", e.target.value)}
                    >
                      <option value="">선택</option>
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>
                      현재 성장 단계 <span className="req">*</span>
                    </label>
                    <select
                      value={form.stage}
                      onChange={(e) => setValue("stage", e.target.value)}
                    >
                      <option value="">선택</option>
                      {STAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* CUSTOMER */}
              <div className="card" ref={refCustomer}>
                <div className="card__head">
                  <h2>2. 고객/문제</h2>
                  <p>
                    고객과 문제를 명확히 하면 메시지와 제품 방향이 정렬됩니다.
                  </p>
                </div>

                <div className="field">
                  <label>
                    핵심 문제 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.customerProblem}
                    onChange={(e) =>
                      setValue("customerProblem", e.target.value)
                    }
                    placeholder="고객이 우리 서비스를 쓰지 않을 때 겪는 가장 고통스러운 문제는 무엇인가요?"
                    rows={5}
                  />
                </div>

                <div className="field">
                  <label>
                    타겟 고객 페르소나 <span className="req">*</span>
                  </label>
                  <select
                    value={form.targetPersona}
                    onChange={(e) => setValue("targetPersona", e.target.value)}
                  >
                    <option value="">선택</option>
                    {PERSONA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <small className="helper">
                    필요하면 ‘기타’를 선택하고 문제 설명에서 구체화해도 좋아요.
                  </small>
                </div>
              </div>

              {/* DIFF */}
              <div className="card" ref={refDiff}>
                <div className="card__head">
                  <h2>3. 차별화 포인트</h2>
                  <p>경쟁사가 절대 따라할 수 없는 ‘무기’를 한 문장으로.</p>
                </div>

                <div className="field">
                  <label>
                    차별화 포인트(무기) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.usp}
                    onChange={(e) => setValue("usp", e.target.value)}
                    placeholder="경쟁사가 절대 따라 할 수 없는 우리만의 강점은 무엇인가요?"
                    rows={4}
                  />
                </div>
              </div>

              {/* VISION */}
              <div className="card" ref={refVision}>
                <div className="card__head">
                  <h2>4. 최종 목표 (Vision)</h2>
                  <p>5년 뒤 모습을 상상하면 브랜드/전략의 기준점이 생겨요.</p>
                </div>

                <div className="field">
                  <label>
                    5년 뒤 뉴스 헤드라인 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.visionHeadline}
                    onChange={(e) => setValue("visionHeadline", e.target.value)}
                    placeholder='예) "BRANDPILOT, 1만 스타트업의 브랜딩 실행을 자동화하다"'
                    rows={4}
                  />
                </div>
              </div>

              {/* 하단 버튼 */}
              <div className="bottomBar">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleNext}
                >
                  다음 섹션
                </button>
                <button type="button" className="btn" onClick={handleTempSave}>
                  임시저장
                </button>
                <button
                  type="button"
                  className={`btn primary ${canAnalyze ? "" : "disabled"}`}
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                >
                  AI 분석 요청
                </button>
              </div>
            </section>

            {/* ✅ 오른쪽: 진행률/가이드 */}
            <aside className="diagInterview__right">
              <div className="sideCard">
                <div className="sideCard__titleRow">
                  <h3>진행 상태</h3>
                  <span className="badge">{progress}%</span>
                </div>

                <div
                  className="progressBar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="progressBar__fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="sideMeta">
                  <div className="sideMeta__row">
                    <span className="k">현재 단계</span>
                    <span className="v">{currentSectionLabel}</span>
                  </div>
                  <div className="sideMeta__row">
                    <span className="k">필수 완료</span>
                    <span className="v">
                      {completedRequired}/{requiredKeys.length}
                    </span>
                  </div>
                  <div className="sideMeta__row">
                    <span className="k">마지막 저장</span>
                    <span className="v">{lastSaved}</span>
                  </div>
                </div>

                {saveMsg ? <p className="saveMsg">{saveMsg}</p> : null}

                <div className="divider" />

                <h4 className="sideSubTitle">필수 입력 체크</h4>
                <ul className="checkList">
                  <li className={requiredStatus.oneLine ? "ok" : ""}>
                    한 줄 정의
                  </li>
                  <li className={requiredStatus.industry ? "ok" : ""}>
                    산업 카테고리
                  </li>
                  <li className={requiredStatus.stage ? "ok" : ""}>
                    성장 단계
                  </li>
                  <li className={requiredStatus.customerProblem ? "ok" : ""}>
                    핵심 문제
                  </li>
                  <li className={requiredStatus.targetPersona ? "ok" : ""}>
                    타겟 페르소나
                  </li>
                  <li className={requiredStatus.usp ? "ok" : ""}>
                    차별화 포인트
                  </li>
                  <li className={requiredStatus.visionHeadline ? "ok" : ""}>
                    5년 헤드라인
                  </li>
                </ul>

                <div className="divider" />

                <h4 className="sideSubTitle">빠른 이동</h4>
                <div className="jumpGrid">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="jumpBtn"
                      onClick={() => scrollToSection(s.ref)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className={`btn primary sideAnalyze ${canAnalyze ? "" : "disabled"}`}
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                >
                  AI 분석 요청
                </button>

                {!canAnalyze ? (
                  <p className="hint">
                    * 필수 항목을 모두 입력하면 분석 버튼이 활성화됩니다.
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* ✅ 공통 푸터 */}
      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
