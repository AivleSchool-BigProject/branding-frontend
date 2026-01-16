// src/pages/NamingConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

import "../styles/NamingConsultingInterview.css";

const STORAGE_KEY = "namingConsultingInterviewDraft_v1";

export default function NamingConsultingInterview({ onLogout }) {
  const navigate = useNavigate();

  // ✅ 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 폼 상태
  const [form, setForm] = useState({
    // 1) 기본 정보
    companyName: "",
    industry: "",
    stage: "",
    website: "",

    // 2) 브랜드/서비스 요약
    oneLine: "",
    brandDesc: "",

    // 3) 네이밍 방향
    targetCustomer: "",
    tone: "",
    keywords: "",
    avoidWords: "",

    // 4) 조건/제약
    language: "ko",
    lengthPref: "",
    mustInclude: "",
    competitorNames: "",

    // 5) 활용/목표
    goal: "",
    useCase: "",
    domainNeed: "",

    // 6) 기타
    notes: "",
  });

  // ✅ 저장 상태 UI
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");

  // 섹션 스크롤용 ref
  const refBasic = useRef(null);
  const refBrand = useRef(null);
  const refDirection = useRef(null);
  const refConstraints = useRef(null);
  const refGoal = useRef(null);
  const refNotes = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "brand", label: "브랜드 요약", ref: refBrand },
      { id: "direction", label: "네이밍 방향", ref: refDirection },
      { id: "constraints", label: "조건/제약", ref: refConstraints },
      { id: "goal", label: "목표/활용", ref: refGoal },
      { id: "notes", label: "기타", ref: refNotes },
    ],
    []
  );

  // ✅ 필수 항목(최소 8개 기준)
  const requiredKeys = useMemo(
    () => [
      "companyName",
      "industry",
      "stage",
      "oneLine",
      "targetCustomer",
      "tone",
      "keywords",
      "goal",
    ],
    []
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

  // ✅ 현재 단계(대략)
  const currentSectionLabel = useMemo(() => {
    if (!form.companyName.trim() || !form.industry.trim() || !form.stage.trim())
      return "기본 정보";
    if (!form.oneLine.trim()) return "브랜드 요약";
    if (
      !form.targetCustomer.trim() ||
      !form.tone.trim() ||
      !form.keywords.trim()
    )
      return "네이밍 방향";
    if (!form.goal.trim()) return "목표/활용";
    return "완료";
  }, [form]);

  // ✅ draft 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.form) setForm((prev) => ({ ...prev, ...parsed.form }));
      if (parsed?.updatedAt) {
        const d = new Date(parsed.updatedAt);
        if (!Number.isNaN(d.getTime())) setLastSaved(d.toLocaleString());
      }
    } catch {
      // ignore
    }
  }, []);

  // ✅ 자동 저장(디바운스)
  useEffect(() => {
    setSaveMsg("");
    const t = setTimeout(() => {
      try {
        const payload = { form, updatedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setLastSaved(new Date(payload.updatedAt).toLocaleString());
        setSaveMsg("자동 저장됨");
      } catch {
        // ignore
      }
    }, 600);

    return () => clearTimeout(t);
  }, [form]);

  const setValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTempSave = () => {
    try {
      const payload = { form, updatedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSaved(new Date(payload.updatedAt).toLocaleString());
      setSaveMsg("임시 저장 완료");
    } catch {
      setSaveMsg("저장 실패");
    }
  };

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNext = () => {
    const label = currentSectionLabel;
    const map = {
      "기본 정보": refBrand,
      "브랜드 요약": refDirection,
      "네이밍 방향": refConstraints,
      "목표/활용": refNotes,
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
    alert("네이밍 컨설팅 AI 분석 요청 (테스트)");
    // 예: navigate("/brand/naming/result");
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
              <h1 className="diagInterview__title">네이밍 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                입력이 구체적일수록 더 좋은 네이밍 후보와 근거를 만들 수 있어요.
              </p>
            </div>

            <div className="diagInterview__topActions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate("/brandconsulting")}
              >
                브랜드 컨설팅으로
              </button>
              <button type="button" className="btn" onClick={handleTempSave}>
                임시저장
              </button>
            </div>
          </div>

          <div className="diagInterview__grid">
            {/* ✅ 왼쪽: 폼 */}
            <section className="diagInterview__left">
              {/* 1) BASIC */}
              <div className="card" ref={refBasic}>
                <div className="card__head">
                  <h2>1. 기본 정보</h2>
                  <p>필수 항목을 먼저 채우면 방향이 빨리 잡혀요.</p>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>
                      회사/프로젝트명 <span className="req">*</span>
                    </label>
                    <input
                      value={form.companyName}
                      onChange={(e) => setValue("companyName", e.target.value)}
                      placeholder="예) BRANDPILOT"
                    />
                  </div>

                  <div className="field">
                    <label>
                      산업/분야 <span className="req">*</span>
                    </label>
                    <input
                      value={form.industry}
                      onChange={(e) => setValue("industry", e.target.value)}
                      placeholder="예) 브랜딩 / 컨설팅 / SaaS"
                    />
                  </div>

                  <div className="field">
                    <label>
                      성장 단계 <span className="req">*</span>
                    </label>
                    <select
                      value={form.stage}
                      onChange={(e) => setValue("stage", e.target.value)}
                    >
                      <option value="">선택</option>
                      <option value="idea">아이디어 단계</option>
                      <option value="mvp">MVP/테스트 중</option>
                      <option value="pmf">PMF 탐색</option>
                      <option value="revenue">매출 발생</option>
                      <option value="invest">투자 유치 진행</option>
                    </select>
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

              {/* 2) BRAND */}
              <div className="card" ref={refBrand}>
                <div className="card__head">
                  <h2>2. 브랜드 요약</h2>
                  <p>한 줄 소개는 네이밍 결과에 가장 큰 영향을 줘요.</p>
                </div>

                <div className="field">
                  <label>
                    한 줄 소개 <span className="req">*</span>
                  </label>
                  <input
                    value={form.oneLine}
                    onChange={(e) => setValue("oneLine", e.target.value)}
                    placeholder="예) 초기 스타트업을 위한 AI 브랜딩 컨설팅 플랫폼"
                  />
                  <small className="helper">
                    사용자가 바로 이해할 수 있게 간단명료하게 작성해보세요.
                  </small>
                </div>

                <div className="field">
                  <label>브랜드/서비스 상세 설명 (선택)</label>
                  <textarea
                    value={form.brandDesc}
                    onChange={(e) => setValue("brandDesc", e.target.value)}
                    placeholder="예) 기업 진단 → 전략 도출 → 실행 체크리스트 제공까지..."
                    rows={5}
                  />
                </div>
              </div>

              {/* 3) DIRECTION */}
              <div className="card" ref={refDirection}>
                <div className="card__head">
                  <h2>3. 네이밍 방향</h2>
                  <p>톤과 키워드가 명확할수록 네이밍 품질이 좋아져요.</p>
                </div>

                <div className="field">
                  <label>
                    타깃 고객 <span className="req">*</span>
                  </label>
                  <input
                    value={form.targetCustomer}
                    onChange={(e) => setValue("targetCustomer", e.target.value)}
                    placeholder="예) 1~3년차 초기 스타트업 대표"
                  />
                </div>

                <div className="field">
                  <label>
                    원하는 톤/성격 <span className="req">*</span>
                  </label>
                  <input
                    value={form.tone}
                    onChange={(e) => setValue("tone", e.target.value)}
                    placeholder="예) 신뢰감, 전문적, 세련된, 친근한"
                  />
                  <small className="helper">
                    예: “단단한/프리미엄”, “유쾌한/영한”, “미니멀/테크”
                  </small>
                </div>

                <div className="field">
                  <label>
                    핵심 키워드(3~10개) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.keywords}
                    onChange={(e) => setValue("keywords", e.target.value)}
                    placeholder="예) AI, 컨설팅, 성장, 스타트업, 로드맵, 실행"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>피하고 싶은 단어/뉘앙스 (선택)</label>
                  <input
                    value={form.avoidWords}
                    onChange={(e) => setValue("avoidWords", e.target.value)}
                    placeholder="예) 과장된 느낌, 너무 유치한 어감, 어려운 발음"
                  />
                </div>
              </div>

              {/* 4) CONSTRAINTS */}
              <div className="card" ref={refConstraints}>
                <div className="card__head">
                  <h2>4. 조건/제약</h2>
                  <p>반드시 지켜야 하는 규칙이 있으면 여기서 정리하세요.</p>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>언어 (선택)</label>
                    <select
                      value={form.language}
                      onChange={(e) => setValue("language", e.target.value)}
                    >
                      <option value="ko">한글 위주</option>
                      <option value="en">영문 위주</option>
                      <option value="mix">혼합</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>길이 선호 (선택)</label>
                    <input
                      value={form.lengthPref}
                      onChange={(e) => setValue("lengthPref", e.target.value)}
                      placeholder="예) 2~4글자 / 6~10자 / 짧게"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>반드시 포함해야 하는 요소 (선택)</label>
                  <input
                    value={form.mustInclude}
                    onChange={(e) => setValue("mustInclude", e.target.value)}
                    placeholder="예) Pilot / Brand / 특정 단어 / 이니셜"
                  />
                </div>

                <div className="field">
                  <label>경쟁사/유사 서비스 이름 (선택)</label>
                  <textarea
                    value={form.competitorNames}
                    onChange={(e) =>
                      setValue("competitorNames", e.target.value)
                    }
                    placeholder="예) Notion, Toss, Wadiz ... (겹치지 않게 참고)"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>도메인/계정 사용 고려사항 (선택)</label>
                  <input
                    value={form.domainNeed}
                    onChange={(e) => setValue("domainNeed", e.target.value)}
                    placeholder="예) .com 선호, 발음 쉬워야 함, 검색 유리"
                  />
                </div>
              </div>

              {/* 5) GOAL */}
              <div className="card" ref={refGoal}>
                <div className="card__head">
                  <h2>5. 목표/활용</h2>
                  <p>이름의 역할을 정하면 더 정확한 후보를 제시할 수 있어요.</p>
                </div>

                <div className="field">
                  <label>
                    네이밍 목표 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.goal}
                    onChange={(e) => setValue("goal", e.target.value)}
                    placeholder="예) 신뢰감 있는 B2B 느낌, 투자/파트너에게 설득력 있는 이름"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>사용처 (선택)</label>
                  <input
                    value={form.useCase}
                    onChange={(e) => setValue("useCase", e.target.value)}
                    placeholder="예) 서비스명 / 법인명 / 앱명 / 제품 라인업"
                  />
                </div>
              </div>

              {/* 6) NOTES */}
              <div className="card" ref={refNotes}>
                <div className="card__head">
                  <h2>6. 기타(선택)</h2>
                  <p>추가로 전달할 내용이 있으면 적어주세요.</p>
                </div>

                <div className="field">
                  <label>추가 메모 (선택)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 발음이 쉬웠으면 좋겠고, 너무 흔한 단어 조합은 피하고 싶어요."
                    rows={5}
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

            {/* ✅ 오른쪽: 진행률/가이드(Sticky) */}
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
                  <li className={requiredStatus.companyName ? "ok" : ""}>
                    회사/프로젝트명
                  </li>
                  <li className={requiredStatus.industry ? "ok" : ""}>
                    산업/분야
                  </li>
                  <li className={requiredStatus.stage ? "ok" : ""}>
                    성장 단계
                  </li>
                  <li className={requiredStatus.oneLine ? "ok" : ""}>
                    한 줄 소개
                  </li>
                  <li className={requiredStatus.targetCustomer ? "ok" : ""}>
                    타깃 고객
                  </li>
                  <li className={requiredStatus.tone ? "ok" : ""}>원하는 톤</li>
                  <li className={requiredStatus.keywords ? "ok" : ""}>
                    핵심 키워드
                  </li>
                  <li className={requiredStatus.goal ? "ok" : ""}>
                    네이밍 목표
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
                  className={`btn primary sideAnalyze ${
                    canAnalyze ? "" : "disabled"
                  }`}
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
