// src/pages/NamingConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

const STORAGE_KEY = "namingConsultingInterviewDraft_v1";

// ✅ 선택 옵션
const INDUSTRY_OPTIONS = [
  "IT/SaaS",
  "브랜딩/마케팅",
  "컨설팅/에이전시",
  "이커머스/리테일",
  "교육/에듀테크",
  "헬스케어/바이오",
  "금융/핀테크",
  "부동산/프롭테크",
  "푸드/프랜차이즈",
  "콘텐츠/미디어",
  "제조/하드웨어",
  "모빌리티/물류",
  "여행/레저",
  "공공/지자체",
];

const TARGET_OPTIONS = [
  "초기 창업자/대표",
  "마케팅/브랜딩 담당자",
  "B2B 구매/도입 담당자",
  "소상공인/자영업자",
  "중소기업 실무자",
  "개인 크리에이터",
  "학생/취업준비생",
  "일반 소비자(B2C)",
];

export default function NamingConsultingInterview({ onLogout }) {
  const navigate = useNavigate();

  // ✅ 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ industry / target 선택 모드
  const [industryMode, setIndustryMode] = useState("select"); // select | custom
  const [industrySelect, setIndustrySelect] = useState("");

  const [targetMode, setTargetMode] = useState("select"); // select | custom
  const [targetSelect, setTargetSelect] = useState("");

  // ✅ 폼 상태
  const [form, setForm] = useState({
    // 1) 기본 정보
    companyName: "",
    industry: "",
    stage: "",
    website: "",

    // 2) 브랜드 요약
    oneLine: "",
    brandDesc: "",

    // 3) 네이밍 방향
    targetCustomer: "",
    tone: "",
    keywords: "",
    avoidWords: "",
    language: "ko",
    lengthPref: "mid",
    namingStyle: "",
    targetEmotion: "",

    // 4) 제약/리스크
    mustInclude: "",
    competitorNames: "",
    domainNeed: "",

    // 5) 목표/추가
    goal: "",
    useCase: "",
    notes: "",
  });

  // ✅ 저장 상태 UI
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");

  // 섹션 ref
  const refBasic = useRef(null);
  const refBrand = useRef(null);
  const refDirection = useRef(null);
  const refConstraints = useRef(null);
  const refGoal = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "brand", label: "브랜드 요약", ref: refBrand },
      { id: "direction", label: "네이밍 방향", ref: refDirection },
      { id: "constraints", label: "제약/리스크", ref: refConstraints },
      { id: "goal", label: "목표/요청", ref: refGoal },
    ],
    [],
  );

  // ✅ 필수 항목(결과 페이지 config와 맞춤)
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
    [],
  );

  const requiredStatus = useMemo(() => {
    const status = {};
    requiredKeys.forEach((k) => {
      status[k] = Boolean(String(form?.[k] || "").trim());
    });
    return status;
  }, [form, requiredKeys]);

  const completedRequired = useMemo(
    () => requiredKeys.filter((k) => requiredStatus[k]).length,
    [requiredKeys, requiredStatus],
  );

  const progress = useMemo(() => {
    if (requiredKeys.length === 0) return 0;
    return Math.round((completedRequired / requiredKeys.length) * 100);
  }, [completedRequired, requiredKeys.length]);

  const canAnalyze = completedRequired === requiredKeys.length;

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
    if (!form.goal.trim()) return "목표/요청";
    return "완료";
  }, [form]);

  // ✅ draft 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (parsed?.form) {
        const f = parsed.form;
        setForm((prev) => ({ ...prev, ...f }));

        // industry init
        if (typeof f.industry === "string" && f.industry.trim()) {
          if (INDUSTRY_OPTIONS.includes(f.industry)) {
            setIndustryMode("select");
            setIndustrySelect(f.industry);
          } else {
            setIndustryMode("custom");
            setIndustrySelect("__custom__");
          }
        }

        // target init
        if (typeof f.targetCustomer === "string" && f.targetCustomer.trim()) {
          if (TARGET_OPTIONS.includes(f.targetCustomer)) {
            setTargetMode("select");
            setTargetSelect(f.targetCustomer);
          } else {
            setTargetMode("custom");
            setTargetSelect("__custom__");
          }
        }
      }

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

  const setValue = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
      "목표/요청": refGoal,
      완료: null,
    };
    const nextRef = map[label];
    if (!nextRef) return;
    scrollToSection(nextRef);
  };

  const handleAnalyze = () => {
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 요청이 가능합니다.");
      return;
    }
    const payload = { form, updatedAt: Date.now() };
    localStorage.setItem("brandInterview_naming_v1", JSON.stringify(payload));
    navigate("/brand/result?service=naming");
  };

  // ✅ handlers: industry/target select
  const handleIndustrySelect = (v) => {
    if (!v) {
      setIndustrySelect("");
      setIndustryMode("select");
      setValue("industry", "");
      return;
    }
    if (v === "__custom__") {
      setIndustrySelect("__custom__");
      setIndustryMode("custom");
      setValue("industry", "");
      return;
    }
    setIndustrySelect(v);
    setIndustryMode("select");
    setValue("industry", v);
  };

  const handleTargetSelect = (v) => {
    if (!v) {
      setTargetSelect("");
      setTargetMode("select");
      setValue("targetCustomer", "");
      return;
    }
    if (v === "__custom__") {
      setTargetSelect("__custom__");
      setTargetMode("custom");
      setValue("targetCustomer", "");
      return;
    }
    setTargetSelect(v);
    setTargetMode("select");
    setValue("targetCustomer", v);
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
              <h1 className="diagInterview__title">네이밍 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                타깃/톤/키워드가 명확할수록 네이밍 후보가 깔끔하게 나옵니다.
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
                  <p>기본 정보를 기반으로 네이밍 방향이 정해져요.</p>
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

                  {/* ✅ 산업/분야: 선택형 */}
                  <div className="field">
                    <label>
                      산업/분야 <span className="req">*</span>
                    </label>
                    <select
                      value={industrySelect}
                      onChange={(e) => handleIndustrySelect(e.target.value)}
                    >
                      <option value="">선택</option>
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      <option value="__custom__">기타(직접 입력)</option>
                    </select>

                    {industryMode === "custom" ? (
                      <input
                        value={form.industry}
                        onChange={(e) => setValue("industry", e.target.value)}
                        placeholder="산업/분야를 직접 입력"
                        style={{ marginTop: 8 }}
                      />
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
              </div>

              {/* 2) BRAND */}
              <div className="card" ref={refBrand}>
                <div className="card__head">
                  <h2>2. 브랜드 요약</h2>
                  <p>네이밍은 “무슨 브랜드인지”를 전달해야 해요.</p>
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

                <div className="field">
                  <label>브랜드/서비스 상세 설명 (선택)</label>
                  <textarea
                    value={form.brandDesc}
                    onChange={(e) => setValue("brandDesc", e.target.value)}
                    placeholder="예) 기업 진단 → 전략 도출 → 실행 체크리스트 제공..."
                    rows={5}
                  />
                </div>
              </div>

              {/* 3) DIRECTION */}
              <div className="card" ref={refDirection}>
                <div className="card__head">
                  <h2>3. 네이밍 방향</h2>
                  <p>타깃/톤/키워드가 핵심이에요.</p>
                </div>

                {/* ✅ 타깃: 선택형 */}
                <div className="field">
                  <label>
                    타깃 고객 <span className="req">*</span>
                  </label>
                  <select
                    value={targetSelect}
                    onChange={(e) => handleTargetSelect(e.target.value)}
                  >
                    <option value="">선택</option>
                    {TARGET_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    <option value="__custom__">기타(직접 입력)</option>
                  </select>

                  {targetMode === "custom" ? (
                    <input
                      value={form.targetCustomer}
                      onChange={(e) =>
                        setValue("targetCustomer", e.target.value)
                      }
                      placeholder="타깃 고객을 직접 입력"
                      style={{ marginTop: 8 }}
                    />
                  ) : null}
                </div>

                <div className="field">
                  <label>
                    원하는 톤/성격 <span className="req">*</span>
                  </label>
                  <input
                    value={form.tone}
                    onChange={(e) => setValue("tone", e.target.value)}
                    placeholder="예) 신뢰감, 테크, 프리미엄, 미니멀, 따뜻함"
                  />
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
                  <label>피하고 싶은 단어/뉘앙스 (선택)</label>
                  <input
                    value={form.avoidWords}
                    onChange={(e) => setValue("avoidWords", e.target.value)}
                    placeholder="예) 유치함, 과장됨, 너무 길어짐"
                  />
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>언어 (선택)</label>
                    <select
                      value={form.language}
                      onChange={(e) => setValue("language", e.target.value)}
                    >
                      <option value="ko">한국어</option>
                      <option value="en">영어</option>
                      <option value="mix">혼합(한/영)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>길이 선호 (선택)</label>
                    <select
                      value={form.lengthPref}
                      onChange={(e) => setValue("lengthPref", e.target.value)}
                    >
                      <option value="short">짧게(1~6자/짧은 단어)</option>
                      <option value="mid">중간(7~12자)</option>
                      <option value="long">길게(설명형)</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>네이밍 스타일 선호 (선택)</label>
                  <input
                    value={form.namingStyle}
                    onChange={(e) => setValue("namingStyle", e.target.value)}
                    placeholder="예) 조합형, 약자/이니셜, 은유형, 직관형"
                  />
                </div>

                <div className="field">
                  <label>타깃에게 주고 싶은 감정 (선택)</label>
                  <input
                    value={form.targetEmotion}
                    onChange={(e) => setValue("targetEmotion", e.target.value)}
                    placeholder="예) 신뢰, 기대감, 안심, 설렘"
                  />
                </div>
              </div>

              {/* 4) CONSTRAINTS */}
              <div className="card" ref={refConstraints}>
                <div className="card__head">
                  <h2>4. 제약/리스크 (선택)</h2>
                  <p>피해야 할 충돌(도메인/유사명) 등을 적어주세요.</p>
                </div>

                <div className="field">
                  <label>반드시 포함(단어/이니셜) (선택)</label>
                  <input
                    value={form.mustInclude}
                    onChange={(e) => setValue("mustInclude", e.target.value)}
                    placeholder="예) BP, Pilot"
                  />
                </div>

                <div className="field">
                  <label>경쟁사/유사 서비스 이름 (선택)</label>
                  <textarea
                    value={form.competitorNames}
                    onChange={(e) =>
                      setValue("competitorNames", e.target.value)
                    }
                    placeholder="예) 경쟁사명/유사명(겹치지 않게 참고)"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>도메인/계정 고려사항 (선택)</label>
                  <input
                    value={form.domainNeed}
                    onChange={(e) => setValue("domainNeed", e.target.value)}
                    placeholder="예) .com 필요 / 인스타 계정 확보 중요"
                  />
                </div>
              </div>

              {/* 5) GOAL */}
              <div className="card" ref={refGoal}>
                <div className="card__head">
                  <h2>5. 목표/추가 요청</h2>
                  <p>원하는 결과/활용처를 정리하면 후보가 더 좋아져요.</p>
                </div>

                <div className="field">
                  <label>
                    네이밍 목표 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.goal}
                    onChange={(e) => setValue("goal", e.target.value)}
                    placeholder="예) 투자자/고객에게 신뢰감 전달, 기억에 남는 이름"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>사용처 (선택)</label>
                  <input
                    value={form.useCase}
                    onChange={(e) => setValue("useCase", e.target.value)}
                    placeholder="예) 앱 이름, 서비스 이름, 캠페인/프로젝트명"
                  />
                </div>

                <div className="field">
                  <label>추가 메모 (선택)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 발음이 쉬웠으면 좋겠고, 의미가 너무 직설적이진 않았으면 해요."
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

            {/* ✅ 오른쪽: 진행률 */}
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
