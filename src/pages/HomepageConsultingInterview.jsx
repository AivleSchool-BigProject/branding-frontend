// src/pages/HomepageConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

import "../styles/HomepageConsultingInterview.css";

const STORAGE_KEY = "homepageConsultingInterviewDraft_v1";

export default function HomepageConsultingInterview({ onLogout }) {
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

    // 2) 웹사이트 목적/요약
    oneLine: "",
    siteGoal: "", // 전환/문의/가입/예약/브랜딩 등
    primaryAction: "", // CTA
    targetCustomer: "",

    // 3) 콘텐츠/구성
    mainSections: "", // 필요한 섹션
    keyContent: "", // 반드시 보여줄 내용
    productsServices: "", // 서비스/상품 요약
    pricing: "", // 가격/요금 노출 여부/형태

    // 4) 디자인/UX
    styleTone: "",
    referenceSites: "",
    colorPref: "",
    colorAvoid: "",
    imagesAssets: "", // 로고/이미지/영상 보유 여부
    devicePriority: "", // 모바일 우선/데스크톱 우선

    // 5) 기능/기술
    features: "", // 로그인/결제/예약/문의폼 등
    integrations: "", // GA/CRM/채널톡/결제/지도
    cms: "", // 노코드/워드프레스/리액트 등

    // 6) 제약/일정/추가 요청
    constraints: "",
    deadline: "",
    budget: "",
    notes: "",
  });

  // ✅ 저장 상태 UI
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");

  // 섹션 스크롤용 ref
  const refBasic = useRef(null);
  const refGoal = useRef(null);
  const refContent = useRef(null);
  const refDesign = useRef(null);
  const refTech = useRef(null);
  const refConstraints = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "goal", label: "목적/타깃", ref: refGoal },
      { id: "content", label: "콘텐츠/구성", ref: refContent },
      { id: "design", label: "디자인/UX", ref: refDesign },
      { id: "tech", label: "기능/기술", ref: refTech },
      { id: "constraints", label: "제약/일정", ref: refConstraints },
    ],
    []
  );

  // ✅ 필수 항목(최소)
  const requiredKeys = useMemo(
    () => [
      "companyName",
      "industry",
      "stage",
      "oneLine",
      "siteGoal",
      "primaryAction",
      "targetCustomer",
      "mainSections",
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
    if (
      !form.oneLine.trim() ||
      !form.siteGoal.trim() ||
      !form.primaryAction.trim() ||
      !form.targetCustomer.trim()
    )
      return "목적/타깃";
    if (!form.mainSections.trim()) return "콘텐츠/구성";
    return canAnalyze ? "완료" : "진행 중";
  }, [form, canAnalyze]);

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
      "기본 정보": refGoal,
      "목적/타깃": refContent,
      "콘텐츠/구성": refDesign,
      "진행 중": refTech,
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
    alert("홈페이지 컨설팅 AI 분석 요청 (테스트)");
    // 예: navigate("/brand/homepage/result");
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
              <h1 className="diagInterview__title">홈페이지 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                목표(전환/문의/가입)와 필요한 섹션을 정리하면 구조가 빠르게
                나옵니다.
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
                  <p>브랜드/사업 정보를 기반으로 사이트 구조가 정해져요.</p>
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
                    <label>기존 웹사이트/소개 링크 (선택)</label>
                    <input
                      value={form.website}
                      onChange={(e) => setValue("website", e.target.value)}
                      placeholder="예) https://..."
                    />
                  </div>
                </div>
              </div>

              {/* 2) GOAL */}
              <div className="card" ref={refGoal}>
                <div className="card__head">
                  <h2>2. 목적/타깃</h2>
                  <p>사이트의 목적(CTA)을 먼저 정하면 UX가 쉬워져요.</p>
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
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>
                      사이트 목표 <span className="req">*</span>
                    </label>
                    <select
                      value={form.siteGoal}
                      onChange={(e) => setValue("siteGoal", e.target.value)}
                    >
                      <option value="">선택</option>
                      <option value="lead">문의/상담(리드) 확보</option>
                      <option value="signup">회원가입/대기자 모집</option>
                      <option value="purchase">결제/구매 전환</option>
                      <option value="reservation">예약/신청</option>
                      <option value="branding">브랜딩/포트폴리오</option>
                      <option value="recruit">채용/회사 소개</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>
                      핵심 CTA(버튼) <span className="req">*</span>
                    </label>
                    <input
                      value={form.primaryAction}
                      onChange={(e) =>
                        setValue("primaryAction", e.target.value)
                      }
                      placeholder="예) 상담 신청 / 데모 요청 / 무료 체험"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>
                    타깃 고객 <span className="req">*</span>
                  </label>
                  <input
                    value={form.targetCustomer}
                    onChange={(e) => setValue("targetCustomer", e.target.value)}
                    placeholder="예) 초기 스타트업 대표, 마케팅 담당자"
                  />
                </div>
              </div>

              {/* 3) CONTENT */}
              <div className="card" ref={refContent}>
                <div className="card__head">
                  <h2>3. 콘텐츠/구성</h2>
                  <p>필요한 섹션을 적으면 “와이어프레임”이 바로 나옵니다.</p>
                </div>

                <div className="field">
                  <label>
                    필요한 섹션(목록) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.mainSections}
                    onChange={(e) => setValue("mainSections", e.target.value)}
                    placeholder={
                      "예)\n- Hero(한 줄 소개 + CTA)\n- 문제/해결\n- 서비스 특징\n- 프로세스\n- 가격/플랜\n- 후기/사례\n- FAQ\n- 문의"
                    }
                    rows={6}
                  />
                  <small className="helper">
                    실제로 메인 페이지에 들어가야 할 블록을 나열해보세요.
                  </small>
                </div>

                <div className="field">
                  <label>반드시 보여줄 핵심 내용 (선택)</label>
                  <textarea
                    value={form.keyContent}
                    onChange={(e) => setValue("keyContent", e.target.value)}
                    placeholder="예) 투자 유치 성과, 주요 고객사, 핵심 지표, 인증/수상"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>상품/서비스 설명 (선택)</label>
                  <textarea
                    value={form.productsServices}
                    onChange={(e) =>
                      setValue("productsServices", e.target.value)
                    }
                    placeholder="예) 기업 진단 / 로고 / 네이밍 / 홈페이지 컨설팅 패키지"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>가격/요금 노출 방식 (선택)</label>
                  <input
                    value={form.pricing}
                    onChange={(e) => setValue("pricing", e.target.value)}
                    placeholder="예) 가격 공개 / 문의 유도 / 플랜 3개"
                  />
                </div>
              </div>

              {/* 4) DESIGN */}
              <div className="card" ref={refDesign}>
                <div className="card__head">
                  <h2>4. 디자인/UX</h2>
                  <p>원하는 톤과 레퍼런스가 있으면 결과물이 빨리 맞춰져요.</p>
                </div>

                <div className="field">
                  <label>스타일/톤 (선택)</label>
                  <input
                    value={form.styleTone}
                    onChange={(e) => setValue("styleTone", e.target.value)}
                    placeholder="예) 미니멀/프리미엄/테크/따뜻함"
                  />
                </div>

                <div className="field">
                  <label>레퍼런스 사이트/링크 (선택)</label>
                  <textarea
                    value={form.referenceSites}
                    onChange={(e) => setValue("referenceSites", e.target.value)}
                    placeholder="예) https://..., Notion 링크, 참고 브랜드명"
                    rows={4}
                  />
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>선호 색상 (선택)</label>
                    <input
                      value={form.colorPref}
                      onChange={(e) => setValue("colorPref", e.target.value)}
                      placeholder="예) 네이비/블루/모노톤"
                    />
                  </div>

                  <div className="field">
                    <label>피하고 싶은 색상 (선택)</label>
                    <input
                      value={form.colorAvoid}
                      onChange={(e) => setValue("colorAvoid", e.target.value)}
                      placeholder="예) 형광색/강한 빨강"
                    />
                  </div>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>이미지/로고/영상 자료 (선택)</label>
                    <input
                      value={form.imagesAssets}
                      onChange={(e) => setValue("imagesAssets", e.target.value)}
                      placeholder="예) 로고 있음 / 사진 없음 / 영상 있음"
                    />
                  </div>

                  <div className="field">
                    <label>우선 디바이스 (선택)</label>
                    <select
                      value={form.devicePriority}
                      onChange={(e) =>
                        setValue("devicePriority", e.target.value)
                      }
                    >
                      <option value="">선택</option>
                      <option value="mobile">모바일 우선</option>
                      <option value="desktop">데스크톱 우선</option>
                      <option value="both">둘 다 중요</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 5) TECH */}
              <div className="card" ref={refTech}>
                <div className="card__head">
                  <h2>5. 기능/기술</h2>
                  <p>필요한 기능을 미리 정하면 개발 범위가 깔끔해져요.</p>
                </div>

                <div className="field">
                  <label>필요 기능 (선택)</label>
                  <textarea
                    value={form.features}
                    onChange={(e) => setValue("features", e.target.value)}
                    placeholder="예) 문의 폼, 로그인, 예약, 결제, 파일 업로드, 관리자 페이지"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>연동/도구 (선택)</label>
                  <textarea
                    value={form.integrations}
                    onChange={(e) => setValue("integrations", e.target.value)}
                    placeholder="예) GA4, Search Console, 채널톡, 결제(PG), 지도"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>원하는 구현 방식 (선택)</label>
                  <input
                    value={form.cms}
                    onChange={(e) => setValue("cms", e.target.value)}
                    placeholder="예) React, Next.js, WordPress, Webflow"
                  />
                </div>
              </div>

              {/* 6) CONSTRAINTS */}
              <div className="card" ref={refConstraints}>
                <div className="card__head">
                  <h2>6. 제약/일정/추가 요청</h2>
                  <p>현실적인 조건을 적으면 추천안이 더 실무적으로 변해요.</p>
                </div>

                <div className="field">
                  <label>제약/리스크 (선택)</label>
                  <textarea
                    value={form.constraints}
                    onChange={(e) => setValue("constraints", e.target.value)}
                    placeholder="예) 콘텐츠가 부족함, 사진 촬영 필요, 개발 인력 제한"
                    rows={4}
                  />
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>희망 일정 (선택)</label>
                    <input
                      value={form.deadline}
                      onChange={(e) => setValue("deadline", e.target.value)}
                      placeholder="예) 2주 내 1차, 1달 내 런칭"
                    />
                  </div>

                  <div className="field">
                    <label>예산 (선택)</label>
                    <input
                      value={form.budget}
                      onChange={(e) => setValue("budget", e.target.value)}
                      placeholder="예) 100만원 ~ 300만원"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>추가 메모 (선택)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 랜딩 페이지 먼저 만들고 추후 기능 확장하고 싶어요."
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
                  <li className={requiredStatus.siteGoal ? "ok" : ""}>
                    사이트 목표
                  </li>
                  <li className={requiredStatus.primaryAction ? "ok" : ""}>
                    핵심 CTA
                  </li>
                  <li className={requiredStatus.targetCustomer ? "ok" : ""}>
                    타깃 고객
                  </li>
                  <li className={requiredStatus.mainSections ? "ok" : ""}>
                    필요한 섹션
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
