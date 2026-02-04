// src/pages/DiagnosisInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// ✅ 백 연동
import { apiRequestAI } from "../api/client.js";

// ✅ 사용자별 localStorage 분리(계정마다 독립 진행)
import { userGetItem, userSetItem } from "../utils/userLocalStorage.js";

import { abortBrandFlow, upsertPipeline } from "../utils/brandPipelineStorage.js";

const STORAGE_KEY = "diagnosisInterviewDraft_v1";
const HOME_SUMMARY_KEY = "diagnosisDraft";

// ✅ 백 응답 저장 키(결과 페이지에서 읽음)
const DIAGNOSIS_RESULT_KEY = "diagnosisResult_v1";

const TARGET_PERSONA_OPTIONS = [
  {
    value: "2030 Early Adopter",
    label: "새로운 것을 먼저 시도하는 2030 얼리어답터",
    description: "트렌드에 민감하고 SNS 활동이 활발한 젊은 층",
  },
  {
    value: "3040 Efficiency Seeker",
    label: "효율을 중시하는 3040 직장인",
    description: "시간이 부족하고 실용성을 중요시하는 워킹맘/워킹대디",
  },
  {
    value: "Professional/Freelancer",
    label: "전문성을 추구하는 프리랜서/전문직",
    description: "개인 브랜드와 전문성이 중요한 독립적인 워커",
  },
  {
    value: "Self-improving Student",
    label: "자기계발에 진지한 대학생/취준생",
    description: "미래를 준비하고 스펙을 쌓는 데 집중하는 청년층",
  },
  {
    value: "Active Senior",
    label: "새로운 도전을 시작하는 시니어",
    description:
      "은퇴 후 제2의 인생이나 취미 활동을 적극적으로 추구하는 중장년층",
  },
  {
    value: "Other",
    label: "기타",
    description: "",
    hasTextInput: true,
    textInputPlaceholder: "구체적인 고객 페르소나를 설명해주세요",
  },
];

const INDUSTRY_OPTIONS = [
  {
    value: "SaaS/B2B Platform",
    label: "SaaS/B2B 플랫폼",
    description: "기업용 소프트웨어, 업무 도구",
  },
  {
    value: "E-commerce/Retail",
    label: "이커머스/리테일",
    description: "온라인 쇼핑, 판매 플랫폼",
  },
  {
    value: "Fintech/Finance",
    label: "핀테크/금융",
    description: "결제, 투자, 대출, 자산관리",
  },
  {
    value: "Healthcare/Wellness",
    label: "헬스케어/웰니스",
    description: "건강, 의료, 피트니스",
  },
  {
    value: "Edutech/Education",
    label: "에듀테크/교육",
    description: "온라인 교육, 학습 플랫폼",
  },
  {
    value: "Contents/Media",
    label: "콘텐츠/미디어",
    description: "OTT, 음악, 웹툰, 뉴스",
  },
  {
    value: "Social/Community",
    label: "소셜/커뮤니티",
    description: "SNS, 커뮤니케이션, 네트워킹",
  },
  {
    value: "Mobility/Logistics",
    label: "모빌리티/물류",
    description: "배달, 운송, 차량 공유",
  },
  {
    value: "Proptech/Real Estate",
    label: "프롭테크/부동산",
    description: "부동산 중개, 임대, 관리",
  },
  {
    value: "Other",
    label: "기타",
    description: "",
    hasTextInput: true,
    textInputPlaceholder: "산업군을 직접 입력해주세요",
  },
];

const REVENUE_MODEL_OPTIONS = [
  { value: "Subscription", label: "구독", description: "정기적인 구독료" },
  { value: "Advertising", label: "광고", description: "광고 수익" },
  { value: "Commission", label: "수수료", description: "거래 수수료" },
  { value: "Sales", label: "판매", description: "제품 판매" },
  {
    value: "Other",
    label: "기타",
    description: "",
    hasTextInput: true,
    textInputPlaceholder: "수익 모델을 직접 입력해주세요",
  },
];

const BRAND_PRIORITY_OPTIONS = [
  {
    value: "Brand Awareness",
    label: "브랜드 인지도",
    description: "더 많은 사람들이 우리 브랜드를 알게 하기",
  },
  {
    value: "Customer Acquisition",
    label: "고객 확보",
    description: "신규 고객 수 증가",
  },
  {
    value: "Conversion Rate Improvement",
    label: "유료 전환율 상승",
    description: "무료 사용자를 유료 고객으로 전환",
  },
  {
    value: "Investment Attraction",
    label: "투자 유치",
    description: "외부 투자 유치 및 펀딩",
  },
  {
    value: "Other",
    label: "기타",
    description: "",
    hasTextInput: true,
    textInputPlaceholder: "브랜드 목표를 직접 입력해주세요",
  },
];

function safeText(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function hasText(v) {
  return Boolean(String(v ?? "").trim());
}

function findOpt(options, value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  return (options || []).find((o) => String(o.value) === v) || null;
}

function resolveSingleChoice(options, value, otherText) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (v !== "Other") {
    const opt = findOpt(options, v);
    return opt?.label || v;
  }
  const t = safeText(otherText);
  return t || "기타";
}

function resolveMultiChoice(options, values, otherText) {
  const arr = Array.isArray(values) ? values : [];
  return arr
    .map((v) => {
      const vv = String(v ?? "").trim();
      if (!vv) return null;
      if (vv !== "Other") {
        const opt = findOpt(options, vv);
        return opt?.label || vv;
      }
      const t = safeText(otherText);
      return t || "기타";
    })
    .filter(Boolean);
}

function RadioCards({ name, value, options, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((opt) => {
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.08)",
              cursor: "pointer",
              background: checked ? "rgba(0,0,0,0.03)" : "transparent",
            }}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onChange(opt.value)}
              style={{ marginTop: 3 }}
            />
            <div>
              <div style={{ fontWeight: 700 }}>{opt.label}</div>
              {opt.description ? (
                <div style={{ opacity: 0.75, marginTop: 2, fontSize: 13 }}>
                  {opt.description}
                </div>
              ) : null}
            </div>
          </label>
        );
      })}
    </div>
  );
}

function CheckboxCards({ value, options, onToggle, disabledFn }) {
  const current = Array.isArray(value) ? value : [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((opt) => {
        const checked = current.includes(opt.value);
        const disabled =
          typeof disabledFn === "function" ? disabledFn(opt.value) : false;
        return (
          <label
            key={opt.value}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.08)",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.55 : 1,
              background: checked ? "rgba(0,0,0,0.03)" : "transparent",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(opt.value)}
              style={{ marginTop: 3 }}
            />
            <div>
              <div style={{ fontWeight: 700 }}>{opt.label}</div>
              {opt.description ? (
                <div style={{ opacity: 0.75, marginTop: 2, fontSize: 13 }}>
                  {opt.description}
                </div>
              ) : null}
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default function DiagnosisInterview({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 약관/방침 모달 UI
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 폼 상태 (JSON 기반: context_key로 저장)
  // - Other 텍스트는 `${context_key}__other` 키에 저장
  const [form, setForm] = useState({
    // (레거시 키들도 함께 보관: 기존 저장본/다른 페이지 호환)
    companyName: "",
    website: "",
    stage: "",

    // ✅ Step 1: Identity & Foundation
    oneLine: "", // service_definition
    customerProblem: "", // pain_point
    targetPersona: "",
    targetPersonaOther: "",
    currentAlternatives: "",
    usp: "", // differentiation (optional)
    industry: "",
    industryOther: "",
    visionHeadline: "",
    revenueModel: "",
    revenueModelOther: "",
    brandPriority: [],
    brandPriorityOther: "",
  });

  // ✅ 저장 상태 UI (자동저장만 사용)
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");
  const [loaded, setLoaded] = useState(false);

  // ✅ 제출 상태(백 요청 중)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitOnceRef = useRef(false);

  // ✅ 섹션 스크롤용 ref
  const refDefinition = useRef(null);
  const refPain = useRef(null);
  const refPersona = useRef(null);
  const refAlternatives = useRef(null);
  const refUsp = useRef(null);
  const refIndustry = useRef(null);
  const refVision = useRef(null);
  const refRevenue = useRef(null);
  const refPriority = useRef(null);

  const sections = useMemo(
    () => [
      { id: "definition", label: "서비스 정의", ref: refDefinition },
      { id: "pain", label: "Pain Point", ref: refPain },
      { id: "persona", label: "타겟", ref: refPersona },
      { id: "alt", label: "대안", ref: refAlternatives },
      { id: "usp", label: "차별점", ref: refUsp },
      { id: "industry", label: "산업군", ref: refIndustry },
      { id: "vision", label: "비전", ref: refVision },
      { id: "revenue", label: "수익모델", ref: refRevenue },
      { id: "priority", label: "브랜드 목표", ref: refPriority },
    ],
    [],
  );

  const requiredStatus = useMemo(() => {
    const personaOk =
      hasText(form.targetPersona) &&
      (form.targetPersona !== "Other" || hasText(form.targetPersonaOther));

    const industryOk =
      hasText(form.industry) &&
      (form.industry !== "Other" || hasText(form.industryOther));

    const revenueOk =
      hasText(form.revenueModel) &&
      (form.revenueModel !== "Other" || hasText(form.revenueModelOther));

    const priorities = Array.isArray(form.brandPriority)
      ? form.brandPriority
      : [];
    const priorityOk =
      priorities.length > 0 &&
      priorities.length <= 2 &&
      (!priorities.includes("Other") || hasText(form.brandPriorityOther));

    return {
      oneLine: hasText(form.oneLine),
      customerProblem: hasText(form.customerProblem),
      targetPersona: personaOk,
      currentAlternatives: hasText(form.currentAlternatives),
      industry: industryOk,
      visionHeadline: hasText(form.visionHeadline),
      revenueModel: revenueOk,
      brandPriority: priorityOk,
    };
  }, [form]);

  const requiredKeys = useMemo(
    () => [
      "oneLine",
      "customerProblem",
      "targetPersona",
      "currentAlternatives",
      "industry",
      "visionHeadline",
      "revenueModel",
      "brandPriority",
    ],
    [],
  );

  const completedRequired = useMemo(
    () => requiredKeys.filter((k) => Boolean(requiredStatus[k])).length,
    [requiredKeys, requiredStatus]
  );

  const progress = useMemo(() => {
    if (requiredKeys.length === 0) return 0;
    return Math.round((completedRequired / requiredKeys.length) * 100);
  }, [completedRequired, requiredKeys.length]);

  const canAnalyze = completedRequired === requiredKeys.length;

  const currentSectionLabel = useMemo(() => {
    if (!requiredStatus.oneLine) return "서비스 정의";
    if (!requiredStatus.customerProblem) return "Pain Point";
    if (!requiredStatus.targetPersona) return "타겟";
    if (!requiredStatus.currentAlternatives) return "대안";
    if (!requiredStatus.industry) return "산업군";
    if (!requiredStatus.visionHeadline) return "비전";
    if (!requiredStatus.revenueModel) return "수익모델";
    if (!requiredStatus.brandPriority) return "브랜드 목표";
    return "완료";
  }, [requiredStatus]);

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getFirstIncompleteRef = () => {
    if (!requiredStatus.oneLine) return refDefinition;
    if (!requiredStatus.customerProblem) return refPain;
    if (!requiredStatus.targetPersona) return refPersona;
    if (!requiredStatus.currentAlternatives) return refAlternatives;
    if (!requiredStatus.industry) return refIndustry;
    if (!requiredStatus.visionHeadline) return refVision;
    if (!requiredStatus.revenueModel) return refRevenue;
    if (!requiredStatus.brandPriority) return refPriority;
    return refPriority;
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

  // ✅ UI용: 멀티 선택 토글(최대 2개 등)
  const toggleMulti = (contextKey, value, maxSelect = 2) => {
    setForm((prev) => {
      const cur = Array.isArray(prev[contextKey]) ? prev[contextKey] : [];
      const exists = cur.includes(value);

      if (exists) {
        const next = cur.filter((v) => v !== value);
        return { ...prev, [contextKey]: next };
      }

      if (cur.length >= maxSelect) return prev;
      return { ...prev, [contextKey]: [...cur, value] };
    });
  };

  const togglePriority = (optValue) => {
    const current = Array.isArray(form.brandPriority) ? form.brandPriority : [];
    const exists = current.includes(optValue);

    if (!exists && current.length >= 2) {
      alert("최대 2개까지 선택할 수 있어요.");
      return;
    }

    const next = exists
      ? current.filter((x) => x !== optValue)
      : [...current, optValue];
    setValue("brandPriority", next);
  };

  const priorityDisabledFn = (optValue) => {
    const current = Array.isArray(form.brandPriority) ? form.brandPriority : [];
    if (current.includes(optValue)) return false;
    return current.length >= 2;
  };

  // ✅ 백이 원하는 "질문:key / 답변:value" JSON 만들기
  const buildQaMap = () => {
    const personaText = resolveSingleChoice(
      TARGET_PERSONA_OPTIONS,
      form.targetPersona,
      form.targetPersonaOther,
    );
    const industryText = resolveSingleChoice(
      INDUSTRY_OPTIONS,
      form.industry,
      form.industryOther,
    );
    const revenueText = resolveSingleChoice(
      REVENUE_MODEL_OPTIONS,
      form.revenueModel,
      form.revenueModelOther,
    );
    const priorities = resolveMultiChoice(
      BRAND_PRIORITY_OPTIONS,
      form.brandPriority,
      form.brandPriorityOther,
    );

    return {
      "우리 서비스를 전혀 모르는 10살 조카에게 설명한다고 가정하고, 한 문장으로 서비스를 정의해주세요.":
        safeText(form.oneLine),
      "고객이 우리 서비스를 쓰지 않을 때 겪는 가장 고통스러운 문제점은 무엇인가요?":
        safeText(form.customerProblem),
      "우리 서비스의 '찐팬'이 될 핵심 고객층은 누구인가요?": personaText,
      "고객들이 현재 우리 서비스를 사용하지 않을 때 대신 사용하고 있는 대안(경쟁사, 다른 방법)은 무엇인가요?":
        safeText(form.currentAlternatives),
      "경쟁사가 절대 따라 할 수 없는 우리 서비스만의 '무기'는 무엇인가요?":
        safeText(form.usp),
      "비즈니스가 속한 산업군은 어디인가요?": industryText,
      "5년 뒤, 우리 회사가 뉴스 헤드라인에 나온다면 어떤 제목일까요?": safeText(
        form.visionHeadline,
      ),
      "주요 수익 모델은 무엇인가요?": revenueText,
      "향후 6~12개월 동안 브랜드가 가장 집중해야 할 목표는 무엇인가요? (최대 2개 선택)":
        priorities.length ? priorities.map((t) => `- ${t}`).join("\n") : "",
    };
  };

  // ✅ 안전한 brandId 추출 (하드코딩 금지)
  const toValidBrandId = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = String(v).trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) return Number(s);
    return s; // UUID 등 문자열이면 그대로
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
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  };

  const buildRawQaFields = () => {
    const personaLabel = resolveSingleChoice(
      TARGET_PERSONA_OPTIONS,
      form.targetPersona,
      form.targetPersonaOther,
    );
    const industryLabel = resolveSingleChoice(
      INDUSTRY_OPTIONS,
      form.industry,
      form.industryOther,
    );
    const revenueLabel = resolveSingleChoice(
      REVENUE_MODEL_OPTIONS,
      form.revenueModel,
      form.revenueModelOther,
    );
    const priorities = resolveMultiChoice(
      BRAND_PRIORITY_OPTIONS,
      form.brandPriority,
      form.brandPriorityOther,
    );

    return {
      // 레거시 필드(다른 페이지에서 사용 가능)
      company_name: safeText(form.companyName),
      website: safeText(form.website),
      stage: safeText(form.stage),

      // Step1 (context_key 기준)
      service_definition: safeText(form.oneLine),
      pain_point: safeText(form.customerProblem),
      target_persona: personaLabel,
      current_alternatives: safeText(form.currentAlternatives),
      usp: safeText(form.usp),
      industry: industryLabel,
      vision_headline: safeText(form.visionHeadline),
      revenue_model: revenueLabel,
      brand_priority: priorities,
    };
  };

  const buildNormalizedFieldsForBackend = () => {
    const personaValue =
      form.targetPersona === "Other"
        ? safeText(form.targetPersonaOther)
        : safeText(form.targetPersona);
    const industryValue =
      form.industry === "Other"
        ? safeText(form.industryOther)
        : safeText(form.industry);
    const revenueValue =
      form.revenueModel === "Other"
        ? safeText(form.revenueModelOther)
        : safeText(form.revenueModel);

    const priorities = Array.isArray(form.brandPriority)
      ? form.brandPriority
      : [];
    const prioritiesValue = priorities
      .map((v) => {
        const vv = String(v ?? "").trim();
        if (!vv) return null;
        if (vv !== "Other") return vv;
        return safeText(form.brandPriorityOther) || "Other";
      })
      .filter(Boolean);

    return {
      service_definition: safeText(form.oneLine),
      pain_point: safeText(form.customerProblem),
      target_persona: personaValue,
      current_alternatives: safeText(form.currentAlternatives),
      usp: safeText(form.usp),
      industry: industryValue,
      vision_headline: safeText(form.visionHeadline),
      revenue_model: revenueValue,
      brand_priority: prioritiesValue,
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

  try {
    // 홈 진행 요약 저장
    const now = Date.now();
    userSetItem(
      HOME_SUMMARY_KEY,
      JSON.stringify({
        progress,
        completedRequired,
        requiredTotal: requiredKeys.length,
        stageLabel: currentSectionLabel,
        updatedAt: now,
      })
    );

    setIsSubmitting(true);

    const qa = buildQaMap();
    const normalized = buildNormalizedFieldsForBackend();
    const requestBody = { ...form, ...normalized, qa };

    // ✅ AI(또는 백) 호출은 한 번만
    const res = await apiRequestAI("/brands/interview", {
      method: "POST",
      data: requestBody,
    });

    const extractedBrandId = pickBrandId(res);

    // 구버전/다양한 응답 경로 대응
    const interviewReport =
      res?.interviewReport ||
      res?.interview_report ||
      res?.report ||
      res?.data?.interviewReport ||
      {};

    const legacyUserResult =
      interviewReport?.user_result ||
      interviewReport?.userResult ||
      res?.user_result ||
      res?.userResult ||
      {};

    const resultPayload = {
      brandId: extractedBrandId,
      summary: asMultilineText(
        res?.summary ??
          interviewReport?.summary ??
          interviewReport?.Summary ??
          legacyUserResult?.summary
      ),
      analysis: asMultilineText(
        res?.analysis ??
          interviewReport?.analysis ??
          legacyUserResult?.analysis
      ),
      key_insights: asMultilineText(
        res?.key_insights ??
          interviewReport?.key_insights ??
          interviewReport?.keyInsights ??
          legacyUserResult?.key_insights ??
          legacyUserResult?.keyInsights
      ),
      raw_qa: qa,
      raw_qa_fields: buildRawQaFields(),
      receivedAt: now,
      updatedAt: new Date(now).toISOString(),
      _source: "diagnosisInterview",
    };

    userSetItem(DIAGNOSIS_RESULT_KEY, JSON.stringify(resultPayload));

    // ✅ Pipeline 업데이트
    abortBrandFlow("new_diagnosis");
    upsertPipeline({
      brandId: extractedBrandId ?? null,
      diagnosisSummary: extractedBrandId
        ? {
            persona: resolveSingleChoice(
              TARGET_PERSONA_OPTIONS,
              form.targetPersona,
              form.targetPersonaOther
            ),
            revenueModel: resolveSingleChoice(
              REVENUE_MODEL_OPTIONS,
              form.revenueModel,
              form.revenueModelOther
            ),
            priorities: resolveMultiChoice(
              BRAND_PRIORITY_OPTIONS,
              form.brandPriority,
              form.brandPriorityOther
            ),
          }
        : null,
    });

    if (extractedBrandId == null) {
      alert(
        "서버 응답에 brandId가 없어 다음 단계 진행이 불가능해요.\n결과는 표시되지만, 브랜드 컨설팅은 시작할 수 없습니다."
      );
    }

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


  const personaSelected = form.targetPersona;
  const industrySelected = form.industry;
  const revenueSelected = form.revenueModel;
  const prioritySelected = Array.isArray(form.brandPriority)
    ? form.brandPriority
    : [];

  return (
    <div className="diagInterview">
      <PolicyModal
        open={openType === "privacy"}
        title="개인정보 처리방침"
        onClose={closeModal}
      >
        <PrivacyContent />
      </PolicyModal>

      <PolicyModal open={openType === "terms"} title="이용약관" onClose={closeModal}>
        <TermsContent />
      </PolicyModal>

      <SiteHeader onLogout={onLogout} />

      <main className="diagInterview__main">
        <div className="diagInterview__container">
          <div className="diagInterview__titleRow">
            <div>
              <h1 className="diagInterview__title">
                기업진단 인터뷰 (Identity &amp; Foundation)
              </h1>
              <p className="diagInterview__sub">
                브랜드의 본질과 기반을 정의합니다
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
              {/* 1) service definition */}
              <div className="card" ref={refDefinition}>
                <div className="card__head">
                  <h2>1. 한 문장 정의</h2>
                  <p>서비스를 아주 쉽게 설명해보세요.</p>
                </div>

                <div className="field">
                  <label>
                    우리 서비스를 전혀 모르는 10살 조카에게 설명한다고 가정하고,
                    한 문장으로 서비스를 정의해주세요.{" "}
                    <span className="req">*</span>
                  </label>
                  <input
                    value={form.oneLine}
                    onChange={(e) => setValue("oneLine", e.target.value)}
                    placeholder="예: 바쁜 사람들이 5분 만에 건강한 식사를 주문할 수 있게 도와주는 앱이야"
                  />
                </div>
              </div>

              {/* 2) pain point */}
              <div className="card" ref={refPain}>
                <div className="card__head">
                  <h2>2. 가장 고통스러운 문제</h2>
                  <p>구체적인 상황과 감정을 포함하면 좋아요.</p>
                </div>

                <div className="field">
                  <label>
                    고객이 우리 서비스를 쓰지 않을 때 겪는 가장 고통스러운
                    문제점은 무엇인가요? <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.customerProblem}
                    onChange={(e) =>
                      setValue("customerProblem", e.target.value)
                    }
                    placeholder="구체적인 상황과 감정을 포함해서 작성해주세요"
                    rows={6}
                  />
                </div>
              </div>

              {/* 3) target persona */}
              <div className="card" ref={refPersona}>
                <div className="card__head">
                  <h2>3. 핵심 고객층(찐팬 페르소나)</h2>
                  <p>가장 강하게 반응할 1개의 고객층을 선택하세요.</p>
                </div>

                <div className="field">
                  <label>
                    우리 서비스의 '찐팬'이 될 핵심 고객층은 누구인가요?{" "}
                    <span className="req">*</span>
                  </label>

                  <RadioCards
                    name="target_persona"
                    value={personaSelected}
                    options={TARGET_PERSONA_OPTIONS}
                    onChange={(v) => setValue("targetPersona", v)}
                  />

                  {personaSelected === "Other" ? (
                    <div className="field" style={{ marginTop: 10 }}>
                      <input
                        value={form.targetPersonaOther}
                        onChange={(e) =>
                          setValue("targetPersonaOther", e.target.value)
                        }
                        placeholder={
                          findOpt(TARGET_PERSONA_OPTIONS, "Other")
                            ?.textInputPlaceholder || "직접 입력"
                        }
                      />
                      {!hasText(form.targetPersonaOther) ? (
                        <p className="hint" style={{ marginTop: 6 }}>
                          * 기타를 선택한 경우, 내용을 입력해야 완료로
                          처리됩니다.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 4) alternatives */}
              <div className="card" ref={refAlternatives}>
                <div className="card__head">
                  <h2>4. 현재 대안(경쟁/다른 방법)</h2>
                  <p>
                    현재 고객이 어떤 방식으로 문제를 해결하고 있는지 적어주세요.
                  </p>
                </div>

                <div className="field">
                  <label>
                    고객들이 현재 우리 서비스를 사용하지 않을 때 대신 사용하고
                    있는 대안(경쟁사, 다른 방법)은 무엇인가요?{" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.currentAlternatives}
                    onChange={(e) =>
                      setValue("currentAlternatives", e.target.value)
                    }
                    placeholder="예: 수기로 엑셀 관리, 경쟁사 A 서비스, 아예 하지 않음 등"
                    rows={6}
                  />
                </div>
              </div>

              {/* 5) differentiation / usp (optional) */}
              <div className="card" ref={refUsp}>
                <div className="card__head">
                  <h2>5. 차별점/무기 (선택)</h2>
                  <p>
                    기술력, 데이터, 네트워크, 창업자 경험 등 구체적으로
                    작성해주세요.
                  </p>
                </div>

                <div className="field">
                  <label>
                    경쟁사가 절대 따라 할 수 없는 우리 서비스만의 '무기'는
                    무엇인가요?
                  </label>
                  <textarea
                    value={form.usp}
                    onChange={(e) => setValue("usp", e.target.value)}
                    placeholder="기술력, 데이터, 네트워크, 창업자 경험 등 구체적으로 작성해주세요"
                    rows={5}
                  />
                </div>
              </div>

              {/* 6) industry */}
              <div className="card" ref={refIndustry}>
                <div className="card__head">
                  <h2>6. 산업군</h2>
                </div>

                <div className="field">
                  <label>
                    비즈니스가 속한 산업군은 어디인가요?{" "}
                    <span className="req">*</span>
                  </label>

                  <RadioCards
                    name="industry"
                    value={industrySelected}
                    options={INDUSTRY_OPTIONS}
                    onChange={(v) => setValue("industry", v)}
                  />

                  {industrySelected === "Other" ? (
                    <div className="field" style={{ marginTop: 10 }}>
                      <input
                        value={form.industryOther}
                        onChange={(e) =>
                          setValue("industryOther", e.target.value)
                        }
                        placeholder={
                          findOpt(INDUSTRY_OPTIONS, "Other")
                            ?.textInputPlaceholder || "직접 입력"
                        }
                      />
                      {!hasText(form.industryOther) ? (
                        <p className="hint" style={{ marginTop: 6 }}>
                          * 기타를 선택한 경우, 내용을 입력해야 완료로
                          처리됩니다.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 7) vision headline */}
              <div className="card" ref={refVision}>
                <div className="card__head">
                  <h2>7. 비전(헤드라인)</h2>
                </div>

                <div className="field">
                  <label>
                    5년 뒤, 우리 회사가 뉴스 헤드라인에 나온다면 어떤
                    제목일까요? <span className="req">*</span>
                  </label>
                  <input
                    value={form.visionHeadline}
                    onChange={(e) => setValue("visionHeadline", e.target.value)}
                    placeholder="예: 'OO, 국내 1위 배달 플랫폼 등극', 'OO 서비스, 500만 사용자 돌파'"
                  />
                </div>
              </div>

              {/* 8) revenue model */}
              <div className="card" ref={refRevenue}>
                <div className="card__head">
                  <h2>8. 수익 모델</h2>
                </div>

                <div className="field">
                  <label>
                    주요 수익 모델은 무엇인가요? <span className="req">*</span>
                  </label>

                  <RadioCards
                    name="revenue_model"
                    value={revenueSelected}
                    options={REVENUE_MODEL_OPTIONS}
                    onChange={(v) => setValue("revenueModel", v)}
                  />

                  {revenueSelected === "Other" ? (
                    <div className="field" style={{ marginTop: 10 }}>
                      <input
                        value={form.revenueModelOther}
                        onChange={(e) =>
                          setValue("revenueModelOther", e.target.value)
                        }
                        placeholder={
                          findOpt(REVENUE_MODEL_OPTIONS, "Other")
                            ?.textInputPlaceholder || "직접 입력"
                        }
                      />
                      {!hasText(form.revenueModelOther) ? (
                        <p className="hint" style={{ marginTop: 6 }}>
                          * 기타를 선택한 경우, 내용을 입력해야 완료로
                          처리됩니다.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 9) brand priority */}
              <div className="card" ref={refPriority}>
                <div className="card__head">
                  <h2>9. 브랜드 목표</h2>
                  <p>
                    향후 6~12개월 동안 집중해야 할 목표를 최대 2개 선택하세요.
                  </p>
                </div>

                <div className="field">
                  <label>
                    향후 6~12개월 동안 브랜드가 가장 집중해야 할 목표는
                    무엇인가요? (최대 2개 선택) <span className="req">*</span>
                  </label>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      margin: "6px 0 10px",
                    }}
                  >
                    <span style={{ opacity: 0.8, fontSize: 13 }}>
                      선택: {prioritySelected.length}/2
                    </span>
                    {prioritySelected.length >= 2 ? (
                      <span style={{ opacity: 0.7, fontSize: 12 }}>
                        * 최대 2개 선택됨
                      </span>
                    ) : null}
                  </div>

                  <CheckboxCards
                    value={prioritySelected}
                    options={BRAND_PRIORITY_OPTIONS}
                    onToggle={togglePriority}
                    disabledFn={priorityDisabledFn}
                  />

                  {prioritySelected.includes("Other") ? (
                    <div className="field" style={{ marginTop: 10 }}>
                      <input
                        value={form.brandPriorityOther}
                        onChange={(e) =>
                          setValue("brandPriorityOther", e.target.value)
                        }
                        placeholder={
                          findOpt(BRAND_PRIORITY_OPTIONS, "Other")
                            ?.textInputPlaceholder || "직접 입력"
                        }
                      />
                      {!hasText(form.brandPriorityOther) ? (
                        <p className="hint" style={{ marginTop: 6 }}>
                          * 기타를 선택한 경우, 내용을 입력해야 완료로
                          처리됩니다.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
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
                  <li className={requiredStatus.oneLine ? "ok" : ""}>
                    1) 한 문장 정의
                  </li>
                  <li className={requiredStatus.customerProblem ? "ok" : ""}>
                    2) 문제점
                  </li>
                  <li className={requiredStatus.targetPersona ? "ok" : ""}>
                    3) 핵심 고객층
                  </li>
                  <li
                    className={requiredStatus.currentAlternatives ? "ok" : ""}
                  >
                    4) 현재 대안
                  </li>
                  <li className={requiredStatus.industry ? "ok" : ""}>
                    6) 산업군
                  </li>
                  <li className={requiredStatus.visionHeadline ? "ok" : ""}>
                    7) 헤드라인
                  </li>
                  <li className={requiredStatus.revenueModel ? "ok" : ""}>
                    8) 수익 모델
                  </li>
                  <li className={requiredStatus.brandPriority ? "ok" : ""}>
                    9) 브랜드 목표
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
                  className={`btn primary sideAnalyze ${canAnalyze && !isSubmitting ? "" : "disabled"}`}
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
