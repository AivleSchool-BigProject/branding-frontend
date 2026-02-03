// src/pages/DiagnosisInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// ✅ 백 연동
import { apiRequest } from "../api/client.js";

// ✅ 사용자별 localStorage 분리(계정마다 독립 진행)
import { userGetItem, userSetItem } from "../utils/userLocalStorage.js";

import {
  abortBrandFlow,
  buildDiagnosisSummaryFromDraft,
  upsertPipeline,
} from "../utils/brandPipelineStorage.js";

const STORAGE_KEY = "diagnosisInterviewDraft_v1";
const HOME_SUMMARY_KEY = "diagnosisDraft";

// ✅ 백 응답 저장 키(결과 페이지에서 읽음)
const DIAGNOSIS_RESULT_KEY = "diagnosisResult_v1";

const INDUSTRY_OPTIONS = [
  { value: "saas_platform", label: "SaaS/플랫폼" },
  { value: "commerce", label: "커머스" },
  { value: "healthcare", label: "헬스케어" },
  { value: "education", label: "교육" },
];

const STAGE_OPTIONS = [
  { value: "idea", label: "아이디어 단계" },
  { value: "mvp", label: "MVP 개발 중" },
  { value: "early_revenue", label: "초기 매출 발생" },
  { value: "scaleup", label: "스케일업" },
];

const PERSONA_OPTIONS = [
  { value: "trend_2030", label: "2030 트렌드 세터" },
  { value: "worker_3040", label: "3040 직장인" },
  { value: "startup_ceo", label: "초기 스타트업 대표" },
  { value: "mid_team_lead", label: "중견기업 팀장" },
  { value: "professional", label: "전문직" },
];

const getLabel = (value, options) => {
  const v = String(value || "").trim();
  if (!v) return "";
  return options.find((o) => o.value === v)?.label || v;
};

export default function DiagnosisInterview({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 약관/방침 모달 UI
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 폼 상태
  const [form, setForm] = useState({
    companyName: "", // ✅ 필수
    website: "", // ✅ 선택

    oneLine: "",
    customerProblem: "",
    targetPersona: "",
    usp: "",
    stage: "",
    industry: "",
    visionHeadline: "",
  });

  // ✅ 저장 상태 UI (자동저장만 사용)
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");
  const [loaded, setLoaded] = useState(false);

  // ✅ 제출 상태(백 요청 중)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitOnceRef = useRef(false);

  // ✅ 섹션 스크롤용 ref
  const refBasic = useRef(null);
  const refOneLine = useRef(null);
  const refCustomer = useRef(null);
  const refUsp = useRef(null);
  const refStatus = useRef(null);
  const refVision = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "oneLine", label: "한 문장 정의", ref: refOneLine },
      { id: "customer", label: "문제/타겟", ref: refCustomer },
      { id: "usp", label: "USP", ref: refUsp },
      { id: "status", label: "단계/산업군", ref: refStatus },
      { id: "vision", label: "헤드라인", ref: refVision },
    ],
    [],
  );

  // ✅ 필수 항목(website 제외)
  const requiredKeys = useMemo(
    () => [
      "companyName",
      "oneLine",
      "customerProblem",
      "targetPersona",
      "usp",
      "stage",
      "industry",
      "visionHeadline",
    ],
    [],
  );

  const requiredStatus = useMemo(() => {
    const status = {};
    requiredKeys.forEach((k) => {
      status[k] = Boolean(String(form[k] || "").trim());
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
    if (!String(form.companyName || "").trim()) return "기본 정보";
    if (!String(form.oneLine || "").trim()) return "한 문장 정의";
    if (
      !String(form.customerProblem || "").trim() ||
      !String(form.targetPersona || "").trim()
    )
      return "문제/타겟";
    if (!String(form.usp || "").trim()) return "USP";
    if (!String(form.stage || "").trim() || !String(form.industry || "").trim())
      return "단계/산업군";
    if (!String(form.visionHeadline || "").trim()) return "헤드라인";
    return "완료";
  }, [form]);

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getFirstIncompleteRef = () => {
    if (!String(form.companyName || "").trim()) return refBasic;
    if (!String(form.oneLine || "").trim()) return refOneLine;
    if (
      !String(form.customerProblem || "").trim() ||
      !String(form.targetPersona || "").trim()
    )
      return refCustomer;
    if (!String(form.usp || "").trim()) return refUsp;
    if (!String(form.stage || "").trim() || !String(form.industry || "").trim())
      return refStatus;
    if (!String(form.visionHeadline || "").trim()) return refVision;
    return refVision;
  };

  const saveHomeSummary = (updatedAtTs) => {
    try {
      const summary = {
        progress,
        completedRequired,
        requiredTotal: requiredKeys.length,
        stageLabel: currentSectionLabel,
        updatedAt: updatedAtTs,
      };
      userSetItem(HOME_SUMMARY_KEY, JSON.stringify(summary));
    } catch {
      // ignore
    }
  };

  // ✅ draft 로드
  useEffect(() => {
    try {
      const raw = userGetItem(STORAGE_KEY);
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

  // ✅ resume 모드 이동
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
        userSetItem(STORAGE_KEY, JSON.stringify(payload));
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

  const setValue = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ✅ 백이 원하는 "질문:key / 답변:value" JSON 만들기
  const buildQaMap = () => {
    const personaLabel = getLabel(form.targetPersona, PERSONA_OPTIONS);
    const stageLabel = getLabel(form.stage, STAGE_OPTIONS);
    const industryLabel = getLabel(form.industry, INDUSTRY_OPTIONS);

    return {
      "회사/프로젝트명": String(form.companyName || "").trim(),
      "웹사이트/소개 링크 (선택)": String(form.website || "").trim(),
      "10살 조카에게 설명한다면 한 문장으로?": String(
        form.oneLine || "",
      ).trim(),
      "서비스를 안 쓰면 겪는 가장 큰 문제는?": String(
        form.customerProblem || "",
      ).trim(),
      "핵심 고객층(찐팬 페르소나 선택)":
        personaLabel || String(form.targetPersona || "").trim(),
      "경쟁사가 못 따라 할 우리만의 무기(USP)": String(form.usp || "").trim(),
      "현재 비즈니스 완성도(단계 선택)":
        stageLabel || String(form.stage || "").trim(),
      "산업군 선택": industryLabel || String(form.industry || "").trim(),
      "어떤 제목으로 기사에 나올까?": String(form.visionHeadline || "").trim(),
    };
  };

  // ✅ 안전한 brandId 추출 (하드코딩 금지)
  const toValidBrandId = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = String(v).trim();
    if (!s) return null;
    // 숫자 문자열이면 number로 통일
    if (/^\d+$/.test(s)) return Number(s);
    return s; // 혹시 UUID 같은 형태가 오면 그대로 보존
  };

  const pickBrandId = (data) => {
    const d = data || {};
    const candidates = [
      d.brandId,
      d.brand_id,
      d.id,
      d?.data?.brandId,
      d?.data?.brand_id,
      d?.interviewReport?.brandId,
      d?.interviewReport?.brand_id,
      d?.interviewReport?.id,
      d?.report?.brandId,
      d?.report?.brand_id,
      d?.report?.id,
    ];
    for (const c of candidates) {
      const bid = toValidBrandId(c);
      if (bid != null) return bid;
    }
    return null;
  };

  const asMultilineText = (v) => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) {
      const arr = v.map((x) => String(x ?? "").trim()).filter(Boolean);
      return arr.length ? arr.map((t) => `- ${t}`).join("\n") : "";
    }
    // object면 보기 좋게 stringify
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  };

  const buildRawQaFields = () => {
    const personaLabel = getLabel(form.targetPersona, PERSONA_OPTIONS);
    const stageLabel = getLabel(form.stage, STAGE_OPTIONS);
    const industryLabel = getLabel(form.industry, INDUSTRY_OPTIONS);
    return {
      company_name: String(form.companyName || "").trim(),
      website: String(form.website || "").trim(),
      service_definition: String(form.oneLine || "").trim(),
      pain_point: String(form.customerProblem || "").trim(),
      target_persona: personaLabel || String(form.targetPersona || "").trim(),
      usp: String(form.usp || "").trim(),
      growth_stage: stageLabel || String(form.stage || "").trim(),
      industry: industryLabel || String(form.industry || "").trim(),
      vision_headline: String(form.visionHeadline || "").trim(),
    };
  };

  const handleViewResult = async () => {
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 AI 요약 결과를 볼 수 있어요.");
      return;
    }
    if (isSubmitting) return;
    if (submitOnceRef.current) return;
    submitOnceRef.current = true;

    // 홈 진행 요약 저장(기존 로직 유지)
    try {
      const payload = {
        progress,
        completedRequired,
        requiredTotal: requiredKeys.length,
        stageLabel: currentSectionLabel,
        updatedAt: Date.now(),
      };
      userSetItem(HOME_SUMMARY_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }

    setIsSubmitting(true);

    try {
      const qa = buildQaMap();
      const requestBody = { ...form, qa };

      // ✅ 1) 백엔드 호출
      const responseData = await apiRequest("/brands/interview", {
        method: "POST",
        data: requestBody,
      });

      // ✅ 2) brandId 추출 (하드코딩 금지)
      const extractedBrandId = pickBrandId(responseData);

      // ✅ 3) 결과 가공(flat)
      const legacyUserResult =
        responseData?.interviewReport?.user_result ||
        responseData?.interviewReport?.userResult ||
        responseData?.user_result ||
        responseData?.userResult ||
        {};

      const resultPayload = {
        brandId: extractedBrandId,

        // 응답 구조가 달라도 화면에서 최대한 그려지도록 평탄화
        summary: asMultilineText(
          responseData?.summary ?? legacyUserResult?.summary,
        ),
        analysis: asMultilineText(
          responseData?.analysis ?? legacyUserResult?.analysis,
        ),
        key_insights: asMultilineText(
          responseData?.key_insights ??
            legacyUserResult?.key_insights ??
            legacyUserResult?.keyInsights,
        ),

        // Q&A(원문)
        raw_qa: qa,
        // 입력 요약(필드형)
        raw_qa_fields: buildRawQaFields(),

        receivedAt: Date.now(),
        updatedAt: new Date().toISOString(),
        _source: "diagnosisInterview",
      };

      // ✅ 4) 저장
      userSetItem(DIAGNOSIS_RESULT_KEY, JSON.stringify(resultPayload));

      // ✅ 5) Pipeline 업데이트
      // - 새 진단이 시작되면, 기존 네이밍/컨셉/스토리/로고 진행은 초기화(brandId 섞임 방지)
      // - brandId가 없으면 다음 단계 진행이 불가하므로 diagnosisSummary도 비워 접근을 막음
      abortBrandFlow("new_diagnosis");

      if (extractedBrandId != null) {
        const summaryStr = buildDiagnosisSummaryFromDraft(form);
        upsertPipeline({
          brandId: extractedBrandId,
          diagnosisSummary: summaryStr,
        });
      } else {
        upsertPipeline({
          brandId: null,
          diagnosisSummary: null,
        });
        alert(
          "서버 응답에 brandId가 없어 다음 단계 진행이 불가능해요. (백엔드 응답 확인 필요)\n결과는 표시되지만, 브랜드 컨설팅은 시작할 수 없습니다.",
        );
      }

      // ✅ 6) 페이지 이동
      navigate("/diagnosis/result", {
        state: {
          from: "diagnosisInterview",
          next: "/brandconsulting",
          brandId: extractedBrandId,
          report: resultPayload,
        },
      });
    } catch (err) {
      console.error(err);
      const msg =
        err?.userMessage ||
        err?.response?.data?.message ||
        err?.message ||
        "요청 실패";
      alert(msg);
    } finally {
      setIsSubmitting(false);
      submitOnceRef.current = false;
    }
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
                초기 진단 인터뷰 (Foundation)
              </h1>
              <p className="diagInterview__sub">
                필수 항목을 모두 입력하면 백엔드로 전송하고, 더미/AI 결과를
                “진단 결과” 페이지에서 보여줘요.
              </p>
            </div>

            <div className="diagInterview__topActions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate("/brandconsulting")}
              >
                브랜드 컨설팅 홈으로
              </button>
            </div>
          </div>

          <div className="diagInterview__grid">
            <section className="diagInterview__left">
              {/* 0) BASIC */}
              <div className="card" ref={refBasic}>
                <div className="card__head">
                  <h2>0. 기본 정보</h2>
                  <p>회사/프로젝트명은 필수입니다. 링크는 있으면 좋아요.</p>
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
                    <label>웹사이트/소개 링크 (선택)</label>
                    <input
                      value={form.website}
                      onChange={(e) => setValue("website", e.target.value)}
                      placeholder="예) https://... 또는 노션/구글독 링크"
                    />
                  </div>
                </div>
              </div>

              {/* 1) ONE LINE */}
              <div className="card" ref={refOneLine}>
                <div className="card__head">
                  <h2>1. 한 문장 정의</h2>
                  <p>아주 쉬운 말로 한 문장만 딱 적어보세요.</p>
                </div>

                <div className="field">
                  <label>
                    10살 조카에게 설명한다면 한 문장으로?{" "}
                    <span className="req">*</span>
                  </label>
                  <input
                    value={form.oneLine}
                    onChange={(e) => setValue("oneLine", e.target.value)}
                    placeholder="예) 누구를 위해 무엇을 도와주는 서비스인지 한 문장으로"
                  />
                </div>
              </div>

              {/* 2~3) CUSTOMER / PERSONA */}
              <div className="card" ref={refCustomer}>
                <div className="card__head">
                  <h2>2. 문제 / 3. 타겟</h2>
                  <p>문제와 타겟이 또렷할수록 분석 결과가 더 정확해져요.</p>
                </div>

                <div className="field">
                  <label>
                    서비스를 안 쓰면 겪는 가장 큰 문제는?{" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.customerProblem}
                    onChange={(e) =>
                      setValue("customerProblem", e.target.value)
                    }
                    placeholder="예) 고객이 겪는 상황, 불편함, 손해(시간/돈/스트레스)를 구체적으로"
                    rows={5}
                  />
                </div>

                <div className="field">
                  <label>
                    핵심 고객층(찐팬 페르소나 선택){" "}
                    <span className="req">*</span>
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
                </div>
              </div>

              {/* 4) USP */}
              <div className="card" ref={refUsp}>
                <div className="card__head">
                  <h2>4. USP</h2>
                  <p>경쟁사가 못 따라 하는 ‘결정적 이유’를 적어보세요.</p>
                </div>

                <div className="field">
                  <label>
                    경쟁사가 못 따라 할 우리만의 무기(USP){" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.usp}
                    onChange={(e) => setValue("usp", e.target.value)}
                    placeholder="예) 데이터/네트워크/실행력/전문성/독점 자원 등"
                    rows={4}
                  />
                </div>
              </div>

              {/* 5~6) STAGE / INDUSTRY */}
              <div className="card" ref={refStatus}>
                <div className="card__head">
                  <h2>5. 단계 / 6. 산업군</h2>
                  <p>현재 상태를 선택하면 분석 기준이 더 명확해져요.</p>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>
                      현재 비즈니스 완성도(단계 선택){" "}
                      <span className="req">*</span>
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

                  <div className="field">
                    <label>
                      산업군 선택 <span className="req">*</span>
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
                </div>
              </div>

              {/* 7) VISION HEADLINE */}
              <div className="card" ref={refVision}>
                <div className="card__head">
                  <h2>7. 헤드라인</h2>
                </div>

                <div className="field">
                  <label>
                    어떤 제목으로 기사에 나올까? <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.visionHeadline}
                    onChange={(e) => setValue("visionHeadline", e.target.value)}
                    placeholder='예) "OOO, 1만 기업의 브랜딩 실행을 자동화하다"'
                    rows={4}
                  />
                </div>
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
                  <li className={requiredStatus.oneLine ? "ok" : ""}>
                    1) 한 문장 정의
                  </li>
                  <li className={requiredStatus.customerProblem ? "ok" : ""}>
                    2) 가장 큰 문제
                  </li>
                  <li className={requiredStatus.targetPersona ? "ok" : ""}>
                    3) 핵심 고객층
                  </li>
                  <li className={requiredStatus.usp ? "ok" : ""}>4) USP</li>
                  <li className={requiredStatus.stage ? "ok" : ""}>
                    5) 비즈니스 단계
                  </li>
                  <li className={requiredStatus.industry ? "ok" : ""}>
                    6) 산업군
                  </li>
                  <li className={requiredStatus.visionHeadline ? "ok" : ""}>
                    7) 헤드라인
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
                    canAnalyze && !isSubmitting ? "" : "disabled"
                  }`}
                  onClick={handleViewResult}
                  disabled={!canAnalyze || isSubmitting}
                >
                  {isSubmitting ? "요청 중..." : "AI 요약 결과 보기"}
                </button>

                {!canAnalyze ? (
                  <p className="hint">
                    * 필수 항목을 모두 입력하면 결과 보기 버튼이 활성화됩니다.
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
