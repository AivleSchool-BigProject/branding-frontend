// src/pages/BrandStoryConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

const STORAGE_KEY = "brandStoryConsultingInterviewDraft_v1";

// ✅ 기타(직접 입력) 값(내부 식별용)
const OTHER_VALUE = "__other__";

// ✅ 산업/타깃 선택지
const INDUSTRY_OPTIONS = [
  "IT/SaaS",
  "AI/데이터",
  "이커머스/쇼핑",
  "마케팅/광고",
  "교육/에듀테크",
  "헬스케어/바이오",
  "핀테크",
  "부동산/프롭테크",
  "여행/레저",
  "미디어/콘텐츠",
  "제조/하드웨어",
  "F&B/프랜차이즈",
  "뷰티/패션",
  "B2B 서비스/컨설팅",
  "공공/지자체",
  "기타(직접 입력)",
];

const TARGET_OPTIONS = [
  "일반 소비자(B2C)",
  "직장인/실무자",
  "대학생/취준생",
  "10대/청소년",
  "부모/가정",
  "시니어",
  "소상공인/자영업자",
  "스타트업 대표/창업팀",
  "중소기업 담당자",
  "대기업 담당자",
  "공공기관 담당자",
  "기타(직접 입력)",
];

export default function BrandStoryConsultingInterview({ onLogout }) {
  const navigate = useNavigate();

  // ✅ 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 폼 상태
  const [form, setForm] = useState({
    companyName: "",
    industry: "", // select
    industryOther: "", // ✅ 기타 입력칸
    stage: "",
    website: "",

    oneLine: "",
    targetCustomer: "", // select
    targetCustomerOther: "", // ✅ 기타 입력칸

    brandCore: "",
    originStory: "",
    problemStory: "",
    solutionStory: "",

    tone: "",
    keyMessages: "",
    proof: "",
    goal: "",

    notes: "", // 기타사항(추가 메모)
  });

  // ✅ 저장 상태 UI
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");

  // 섹션 스크롤 ref
  const refBasic = useRef(null);
  const refCore = useRef(null);
  const refStory = useRef(null);
  const refTone = useRef(null);
  const refGoal = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "core", label: "브랜드 핵심", ref: refCore },
      { id: "story", label: "스토리 구성", ref: refStory },
      { id: "tone", label: "톤/메시지", ref: refTone },
      { id: "goal", label: "목표/근거", ref: refGoal },
    ],
    [],
  );

  // ✅ 필수 항목(최소)
  const requiredKeys = useMemo(
    () => [
      "companyName",
      "industry",
      "stage",
      "oneLine",
      "targetCustomer",
      "brandCore",
      "goal",
    ],
    [],
  );

  const setValue = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ✅ “필수 완료” 판정(기타 선택 시에는 기타 입력칸도 필수)
  const isRequiredFilled = (key) => {
    if (key === "industry") {
      if (form.industry === OTHER_VALUE)
        return Boolean(form.industryOther.trim());
      return Boolean(form.industry.trim());
    }
    if (key === "targetCustomer") {
      if (form.targetCustomer === OTHER_VALUE)
        return Boolean(form.targetCustomerOther.trim());
      return Boolean(form.targetCustomer.trim());
    }
    return Boolean(String(form[key] || "").trim());
  };

  const requiredStatus = useMemo(() => {
    const status = {};
    requiredKeys.forEach((k) => {
      status[k] = isRequiredFilled(k);
    });
    return status;
  }, [requiredKeys, form]); // eslint-disable-line react-hooks/exhaustive-deps

  const completedRequired = useMemo(
    () => requiredKeys.filter((k) => requiredStatus[k]).length,
    [requiredKeys, requiredStatus],
  );

  const progress = useMemo(() => {
    if (requiredKeys.length === 0) return 0;
    return Math.round((completedRequired / requiredKeys.length) * 100);
  }, [completedRequired, requiredKeys.length]);

  const canAnalyze = completedRequired === requiredKeys.length;

  // ✅ 현재 단계(대략)
  const currentSectionLabel = useMemo(() => {
    const basicOk =
      isRequiredFilled("companyName") &&
      isRequiredFilled("industry") &&
      isRequiredFilled("stage");

    if (!basicOk) return "기본 정보";
    if (!isRequiredFilled("brandCore")) return "브랜드 핵심";
    if (!isRequiredFilled("goal")) return "목표/근거";
    return "완료";
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const map = {
      "기본 정보": refCore,
      "브랜드 핵심": refStory,
      "목표/근거": null,
      완료: null,
    };
    const nextRef = map[currentSectionLabel];
    if (!nextRef) return;
    scrollToSection(nextRef);
  };

  // ✅ 결과 페이지 연결
  const handleAnalyze = () => {
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 요청이 가능합니다.");
      return;
    }
    const payload = { form, updatedAt: Date.now() };
    localStorage.setItem("brandInterview_story_v1", JSON.stringify(payload));
    navigate("/brand/result?service=story");
  };

  // ✅ select 변경 시 기타 입력칸 처리
  const handleIndustryChange = (v) => {
    if (v === OTHER_VALUE) {
      setForm((prev) => ({ ...prev, industry: OTHER_VALUE }));
      return;
    }
    setForm((prev) => ({ ...prev, industry: v, industryOther: "" }));
  };

  const handleTargetChange = (v) => {
    if (v === OTHER_VALUE) {
      setForm((prev) => ({ ...prev, targetCustomer: OTHER_VALUE }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      targetCustomer: v,
      targetCustomerOther: "",
    }));
  };

  return (
    <div className="diagInterview">
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

      <SiteHeader onLogout={onLogout} />

      <main className="diagInterview__main">
        <div className="diagInterview__container">
          <div className="diagInterview__titleRow">
            <div>
              <h1 className="diagInterview__title">
                브랜드 스토리 컨설팅 인터뷰
              </h1>
              <p className="diagInterview__sub">
                브랜드가 왜 시작됐고, 무엇을 해결하며, 어떤 방향으로 가는지
                “이야기”로 정리합니다.
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
            <section className="diagInterview__left">
              {/* 1) BASIC */}
              <div className="card" ref={refBasic}>
                <div className="card__head">
                  <h2>1. 기본 정보</h2>
                  <p>기본 정보는 스토리의 전제(맥락)가 됩니다.</p>
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

                  {/* ✅ 산업/분야: select + 기타 입력 */}
                  <div className="field">
                    <label>
                      산업/분야 <span className="req">*</span>
                    </label>
                    <select
                      value={
                        form.industry === OTHER_VALUE
                          ? OTHER_VALUE
                          : form.industry
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "기타(직접 입력)")
                          handleIndustryChange(OTHER_VALUE);
                        else handleIndustryChange(v);
                      }}
                    >
                      <option value="">선택</option>
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <option
                          key={opt}
                          value={
                            opt === "기타(직접 입력)" ? "기타(직접 입력)" : opt
                          }
                        >
                          {opt}
                        </option>
                      ))}
                    </select>

                    {form.industry === OTHER_VALUE ? (
                      <div style={{ marginTop: 10 }}>
                        <input
                          value={form.industryOther}
                          onChange={(e) =>
                            setValue("industryOther", e.target.value)
                          }
                          placeholder="산업/분야를 직접 입력하세요 (예: 반려동물/펫테크)"
                        />
                      </div>
                    ) : null}
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

                {/* ✅ 타깃 고객: select + 기타 입력 */}
                <div className="field">
                  <label>
                    타깃 고객 <span className="req">*</span>
                  </label>
                  <select
                    value={
                      form.targetCustomer === OTHER_VALUE
                        ? OTHER_VALUE
                        : form.targetCustomer
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "기타(직접 입력)")
                        handleTargetChange(OTHER_VALUE);
                      else handleTargetChange(v);
                    }}
                  >
                    <option value="">선택</option>
                    {TARGET_OPTIONS.map((opt) => (
                      <option
                        key={opt}
                        value={
                          opt === "기타(직접 입력)" ? "기타(직접 입력)" : opt
                        }
                      >
                        {opt}
                      </option>
                    ))}
                  </select>

                  {form.targetCustomer === OTHER_VALUE ? (
                    <div style={{ marginTop: 10 }}>
                      <input
                        value={form.targetCustomerOther}
                        onChange={(e) =>
                          setValue("targetCustomerOther", e.target.value)
                        }
                        placeholder="타깃 고객을 직접 입력하세요 (예: 1인 창업자/개인 크리에이터)"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 2) CORE */}
              <div className="card" ref={refCore}>
                <div className="card__head">
                  <h2>2. 브랜드 핵심</h2>
                  <p>이 브랜드가 ‘무엇을 믿는지’를 한 문장으로 정리해요.</p>
                </div>

                <div className="field">
                  <label>
                    브랜드 핵심(정체성/가치) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.brandCore}
                    onChange={(e) => setValue("brandCore", e.target.value)}
                    placeholder="예) 실행 가능한 전략을 제공해 스타트업 성장을 돕는다"
                    rows={4}
                  />
                </div>
              </div>

              {/* 3) STORY */}
              <div className="card" ref={refStory}>
                <div className="card__head">
                  <h2>3. 스토리 구성</h2>
                  <p>‘시작 계기 → 문제 → 해결’ 흐름으로 적어보세요.</p>
                </div>

                <div className="field">
                  <label>시작 계기(Origin) (선택)</label>
                  <textarea
                    value={form.originStory}
                    onChange={(e) => setValue("originStory", e.target.value)}
                    placeholder="예) 창업 초기, 브랜딩 방향을 잡지 못해 비용/시간이 크게 낭비됨"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>고객 문제(Problem) (선택)</label>
                  <textarea
                    value={form.problemStory}
                    onChange={(e) => setValue("problemStory", e.target.value)}
                    placeholder="예) 브랜드 전략이 없어 마케팅 효율이 낮고 전환율이 떨어짐"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>해결 방식(Solution) (선택)</label>
                  <textarea
                    value={form.solutionStory}
                    onChange={(e) => setValue("solutionStory", e.target.value)}
                    placeholder="예) 인터뷰 기반 진단 → 전략 추천 → 실행 체크리스트 제공"
                    rows={4}
                  />
                </div>
              </div>

              {/* 4) TONE */}
              <div className="card" ref={refTone}>
                <div className="card__head">
                  <h2>4. 톤/메시지</h2>
                  <p>스토리를 어디에 쓰는지에 따라 말투/구조가 달라져요.</p>
                </div>

                <div className="field">
                  <label>원하는 톤/분위기 (선택)</label>
                  <input
                    value={form.tone}
                    onChange={(e) => setValue("tone", e.target.value)}
                    placeholder="예) 신뢰감, 담백함, 테크, 따뜻함"
                  />
                </div>

                <div className="field">
                  <label>핵심 메시지(3개 정도) (선택)</label>
                  <textarea
                    value={form.keyMessages}
                    onChange={(e) => setValue("keyMessages", e.target.value)}
                    placeholder={
                      "예)\n- 우리는 실행 가능한 전략을 만든다\n- 작은 팀도 바로 적용 가능\n- 비용 대비 효과가 크다"
                    }
                    rows={4}
                  />
                </div>
              </div>

              {/* 5) GOAL */}
              <div className="card" ref={refGoal}>
                <div className="card__head">
                  <h2>5. 목표/근거</h2>
                  <p>스토리의 목적을 정하면 결과물이 더 정확해져요.</p>
                </div>

                <div className="field">
                  <label>
                    스토리 목표(어디에 쓰는가) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.goal}
                    onChange={(e) => setValue("goal", e.target.value)}
                    placeholder="예) 투자 피치덱/홈페이지 About/서비스 소개 페이지에 사용할 스토리"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>근거/증거(성과/수치/사례) (선택)</label>
                  <textarea
                    value={form.proof}
                    onChange={(e) => setValue("proof", e.target.value)}
                    placeholder="예) 테스트 전환율 2%→3.5%, 10개 팀 컨설팅 경험, 수상/인증"
                    rows={4}
                  />
                </div>

                {/* ✅ 기타사항 입력칸(추가 메모) */}
                <div className="field">
                  <label>기타사항 (선택)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 감성적 표현은 줄이고, 깔끔한 톤으로 작성해 주세요 / 참고 브랜드 링크 등"
                    rows={5}
                  />
                </div>
              </div>

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
                    {form.industry === OTHER_VALUE ? " (기타 입력 포함)" : ""}
                  </li>
                  <li className={requiredStatus.stage ? "ok" : ""}>
                    성장 단계
                  </li>
                  <li className={requiredStatus.oneLine ? "ok" : ""}>
                    한 줄 소개
                  </li>
                  <li className={requiredStatus.targetCustomer ? "ok" : ""}>
                    타깃 고객
                    {form.targetCustomer === OTHER_VALUE
                      ? " (기타 입력 포함)"
                      : ""}
                  </li>
                  <li className={requiredStatus.brandCore ? "ok" : ""}>
                    브랜드 핵심
                  </li>
                  <li className={requiredStatus.goal ? "ok" : ""}>
                    스토리 목표
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

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
