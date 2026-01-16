// src/pages/LogoConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

import "../styles/LogoConsultingInterview.css";

const STORAGE_KEY = "logoConsultingInterviewDraft_v1";

export default function LogoConsultingInterview({ onLogout }) {
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

    // 3) 로고 방향(컨셉)
    targetCustomer: "",
    brandPersonality: "",
    keywords: "",
    avoidKeywords: "",

    // 4) 디자인 요구
    logoType: "", // 워드마크/심볼/콤비네이션/엠블럼
    styleRefs: "",
    colorPref: "",
    colorAvoid: "",
    usagePlaces: "",

    // 5) 제약/리스크
    mustInclude: "",
    mustAvoid: "",
    competitorLogos: "",
    legalNotes: "",

    // 6) 목표/추가 요청
    goal: "",
    deliverables: "",
    notes: "",
  });

  // ✅ 저장 상태 UI
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");

  // 섹션 스크롤용 ref
  const refBasic = useRef(null);
  const refBrand = useRef(null);
  const refDirection = useRef(null);
  const refDesign = useRef(null);
  const refConstraints = useRef(null);
  const refGoal = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "brand", label: "브랜드 요약", ref: refBrand },
      { id: "direction", label: "로고 방향", ref: refDirection },
      { id: "design", label: "디자인 요구", ref: refDesign },
      { id: "constraints", label: "제약/리스크", ref: refConstraints },
      { id: "goal", label: "목표/요청", ref: refGoal },
    ],
    []
  );

  // ✅ 필수 항목(최소 8개)
  const requiredKeys = useMemo(
    () => [
      "companyName",
      "industry",
      "stage",
      "oneLine",
      "targetCustomer",
      "brandPersonality",
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
      !form.brandPersonality.trim() ||
      !form.keywords.trim()
    )
      return "로고 방향";
    if (!form.goal.trim()) return "목표/요청";
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
      "로고 방향": refDesign,
      "목표/요청": null,
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
    alert("로고 컨설팅 AI 분석 요청 (테스트)");
    // 예: navigate("/brand/logo/result");
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
              <h1 className="diagInterview__title">로고 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                입력이 구체적일수록 로고 시안의 방향과 근거가 더 명확해집니다.
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
                  <p>필수 항목을 먼저 채우면 컨셉이 빠르게 잡혀요.</p>
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
                  <p>로고는 “무슨 브랜드인지”를 한 눈에 전달해야 해요.</p>
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
                    핵심 가치가 드러나게 간단명료하게 작성해보세요.
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
                  <h2>3. 로고 방향</h2>
                  <p>타깃과 브랜드 성격이 로고 스타일을 결정합니다.</p>
                </div>

                <div className="field">
                  <label>
                    타깃 고객 <span className="req">*</span>
                  </label>
                  <input
                    value={form.targetCustomer}
                    onChange={(e) => setValue("targetCustomer", e.target.value)}
                    placeholder="예) 1~3년차 초기 스타트업 대표 / B2B 담당자"
                  />
                </div>

                <div className="field">
                  <label>
                    브랜드 성격(인격) <span className="req">*</span>
                  </label>
                  <input
                    value={form.brandPersonality}
                    onChange={(e) =>
                      setValue("brandPersonality", e.target.value)
                    }
                    placeholder="예) 신뢰감, 전문적, 테크, 미니멀, 따뜻함"
                  />
                  <small className="helper">
                    예: “단단한/프리미엄”, “유쾌한/젊은”, “미니멀/테크”
                  </small>
                </div>

                <div className="field">
                  <label>
                    핵심 키워드(3~10개) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.keywords}
                    onChange={(e) => setValue("keywords", e.target.value)}
                    placeholder="예) AI, 성장, 로드맵, 실행, 신뢰, 속도"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>피하고 싶은 키워드/느낌 (선택)</label>
                  <input
                    value={form.avoidKeywords}
                    onChange={(e) => setValue("avoidKeywords", e.target.value)}
                    placeholder="예) 유치함, 과장됨, 너무 복잡함"
                  />
                </div>
              </div>

              {/* 4) DESIGN */}
              <div className="card" ref={refDesign}>
                <div className="card__head">
                  <h2>4. 디자인 요구</h2>
                  <p>원하는 로고 타입과 색감/활용처를 정리해요.</p>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>로고 타입 (선택)</label>
                    <select
                      value={form.logoType}
                      onChange={(e) => setValue("logoType", e.target.value)}
                    >
                      <option value="">선택</option>
                      <option value="wordmark">워드마크(텍스트 중심)</option>
                      <option value="symbol">심볼(아이콘 중심)</option>
                      <option value="combo">콤비네이션(텍스트+심볼)</option>
                      <option value="emblem">엠블럼(뱃지/문장형)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>주요 사용처 (선택)</label>
                    <input
                      value={form.usagePlaces}
                      onChange={(e) => setValue("usagePlaces", e.target.value)}
                      placeholder="예) 웹/앱 아이콘, 명함, PPT, SNS"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>원하는 색상/톤 (선택)</label>
                  <input
                    value={form.colorPref}
                    onChange={(e) => setValue("colorPref", e.target.value)}
                    placeholder="예) 네이비/블루, 모노톤, 파스텔"
                  />
                </div>

                <div className="field">
                  <label>피하고 싶은 색상 (선택)</label>
                  <input
                    value={form.colorAvoid}
                    onChange={(e) => setValue("colorAvoid", e.target.value)}
                    placeholder="예) 형광색, 너무 강한 빨강"
                  />
                </div>

                <div className="field">
                  <label>참고 스타일/레퍼런스 (선택)</label>
                  <textarea
                    value={form.styleRefs}
                    onChange={(e) => setValue("styleRefs", e.target.value)}
                    placeholder="예) Apple처럼 미니멀, Nike처럼 역동적 / 참고 링크나 브랜드명"
                    rows={4}
                  />
                </div>
              </div>

              {/* 5) CONSTRAINTS */}
              <div className="card" ref={refConstraints}>
                <div className="card__head">
                  <h2>5. 제약/리스크 (선택)</h2>
                  <p>
                    반드시 포함/제외할 요소나 법적 고려가 있으면 적어주세요.
                  </p>
                </div>

                <div className="field">
                  <label>반드시 포함할 요소 (선택)</label>
                  <input
                    value={form.mustInclude}
                    onChange={(e) => setValue("mustInclude", e.target.value)}
                    placeholder="예) 이니셜 BP / 특정 심볼"
                  />
                </div>

                <div className="field">
                  <label>반드시 피할 요소 (선택)</label>
                  <input
                    value={form.mustAvoid}
                    onChange={(e) => setValue("mustAvoid", e.target.value)}
                    placeholder="예) 특정 도형 / 너무 복잡한 디테일"
                  />
                </div>

                <div className="field">
                  <label>경쟁사/유사 로고 참고 (선택)</label>
                  <textarea
                    value={form.competitorLogos}
                    onChange={(e) =>
                      setValue("competitorLogos", e.target.value)
                    }
                    placeholder="예) 경쟁사 로고 특징/링크 (겹치지 않게 참고)"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>법적/상표 관련 고려사항 (선택)</label>
                  <textarea
                    value={form.legalNotes}
                    onChange={(e) => setValue("legalNotes", e.target.value)}
                    placeholder="예) 상표 출원 예정 / 특정 업종에서 사용 제한 가능성"
                    rows={4}
                  />
                </div>
              </div>

              {/* 6) GOAL */}
              <div className="card" ref={refGoal}>
                <div className="card__head">
                  <h2>6. 목표/추가 요청</h2>
                  <p>원하는 결과물과 목표를 정리하면 시안 품질이 좋아져요.</p>
                </div>

                <div className="field">
                  <label>
                    로고 목표 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.goal}
                    onChange={(e) => setValue("goal", e.target.value)}
                    placeholder="예) 투자자/고객에게 신뢰감 전달, 프리미엄 느낌, 확장성 있는 심볼"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>희망 산출물 (선택)</label>
                  <input
                    value={form.deliverables}
                    onChange={(e) => setValue("deliverables", e.target.value)}
                    placeholder="예) 로고 3안 + 컬러/흑백 버전 + 간단 가이드"
                  />
                </div>

                <div className="field">
                  <label>추가 메모 (선택)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 심볼은 앱 아이콘에서도 잘 보여야 하고, 단색에서도 식별되면 좋겠어요."
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
                  <li className={requiredStatus.brandPersonality ? "ok" : ""}>
                    브랜드 성격
                  </li>
                  <li className={requiredStatus.keywords ? "ok" : ""}>
                    핵심 키워드
                  </li>
                  <li className={requiredStatus.goal ? "ok" : ""}>로고 목표</li>
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
