// src/pages/NamingConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import ConsultingFlowPanel from "../components/ConsultingFlowPanel.jsx";
import ConsultingFlowMini from "../components/ConsultingFlowMini.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// ✅ 사용자별 localStorage 분리(계정마다 독립 진행)
import {
  getActiveUserId,
  userGetItem,
  userSetItem,
  userRemoveItem,
} from "../utils/userLocalStorage.js";

// ✅ 파이프라인(단계 잠금/결과 저장)  (정책/기능 건드리지 않음)
import {
  ensureStrictStepAccess,
  migrateLegacyToPipelineIfNeeded,
  readPipeline,
  setStepResult,
  clearStepsFrom,
  readDiagnosisDraftForm,
  buildDiagnosisSummaryFromDraft,
  upsertPipeline,
  startBrandFlow,
  setBrandFlowCurrent,
} from "../utils/brandPipelineStorage.js";

// ✅ 백 연동(이미 프로젝트에 존재하는 클라이언트 사용)
import { apiRequest, apiRequestAI } from "../api/client.js";

const STORAGE_KEY = "namingConsultingInterviewDraft_v1";
const RESULT_KEY = "namingConsultingInterviewResult_v1";
const LEGACY_KEY = "brandInterview_naming_v1";

/** ======================
 *  ✅ Step 2. Naming Strategy (질문지)
 *  ====================== */
const NAMING_QUESTIONS = [
  {
    questionId: "naming_style",
    questionText: "어떤 스타일의 이름을 선호하시나요?",
    key: "namingStyles",
    answerType: "single_select",
  },
  {
    questionId: "name_length",
    questionText: "이름의 길이는 어느 정도가 적당한가요?",
    key: "nameLength",
    answerType: "single_select",
  },
  {
    questionId: "language_pref",
    questionText: "어떤 언어 기반이어야 하나요?",
    key: "languagePrefs",
    answerType: "single_select",
  },
  {
    questionId: "brand_vibe",
    questionText: "이름에서 느껴져야 할 첫인상은 무엇인가요? (최대 2개 선택)",
    key: "brandVibe",
    answerType: "multi_select",
  },
  {
    questionId: "avoid_style",
    questionText: '"이런 느낌만은 피해주세요" 하는 것이 있나요?',
    key: "avoidStyle",
    answerType: "text",
  },
  {
    questionId: "domain_constraint",
    questionText: ".com 도메인 확보가 얼마나 중요한가요?",
    key: "domainConstraint",
    answerType: "single_select",
  },
  {
    questionId: "target_emotion",
    questionText:
      "고객이 이름을 듣자마자 느꼈으면 하는 딱 하나의 감정은 무엇인가요?",
    key: "targetEmotion",
    answerType: "text",
  },
  {
    questionId: "current_name",
    questionText: "현재 사용 중인 브랜드 이름이 있다면 무엇인가요?",
    key: "currentName",
    answerType: "text",
  },
];

function safeText(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function isFilled(v) {
  if (Array.isArray(v)) return v.length > 0;
  return Boolean(String(v ?? "").trim());
}

/** ======================
 *  ✅ Step2 옵션
 *  ====================== */
const NAMING_STYLE_OPTIONS = [
  { value: "Descriptive", label: "직관적/설명적" },
  { value: "Symbolic", label: "함축적/상징적" },
  { value: "Compound Word", label: "합성어" },
  { value: "Abstract/Neologism", label: "추상적/신조어" },
  { value: "Founder/Place Based", label: "창업자/지명 기반" },
  { value: "Other", label: "기타(직접 입력)" },
];

const NAME_LENGTH_OPTIONS = [
  { value: "Short", label: "짧고 강렬 (1-2음절)" },
  { value: "Medium", label: "적당한 길이 (3-4음절)" },
  { value: "Long", label: "설명적인 (5음절 이상)" },
  { value: "Other", label: "기타(직접 입력)" },
];

const LANGUAGE_OPTIONS = [
  { value: "Korean", label: "순수 한글" },
  { value: "English", label: "영어 기반" },
  { value: "Korean-English Mix", label: "한영 혼용" },
  { value: "Any", label: "무관 (AI 추천)" },
  { value: "Other", label: "기타(직접 입력)" },
];

const VIBE_OPTIONS = [
  { value: "Trustworthy", label: "신뢰감 있는" },
  { value: "Innovative", label: "혁신적인" },
  { value: "Friendly", label: "친근한" },
  { value: "Professional", label: "전문적인" },
  { value: "Fun", label: "재미있는" },
  { value: "Simple", label: "심플한" },
  { value: "Powerful", label: "강렬한" },
  { value: "Other", label: "기타(직접 입력)" },
];

const DOMAIN_OPTIONS = [
  { value: "Must have .com", label: ".com 필수" },
  { value: "Prefer .com", label: ".com 선호하지만 필수 아님" },
  { value: "Don't care", label: "도메인 확보 여부 상관없음" },
  { value: "Other", label: "기타(직접 입력)" },
];

/** ======================
 *  ✅ Step2 폼
 *  - (요청) 상단 기업진단 자동입력 UI 제거 → 관련 필드도 제거
 *  ====================== */
const INITIAL_FORM = {
  namingStyles: [], // single_choice (배열 1개만 유지)
  namingStyleOther: "",

  nameLength: "", // single_choice (string)
  nameLengthOther: "",

  languagePrefs: [], // single_choice (배열 1개만 유지)
  languageOther: "",

  brandVibe: [], // multiple_choice (max 2)
  brandVibeOther: "",

  avoidStyle: "", // required
  domainConstraint: "", // required
  domainOther: "",

  targetEmotion: "", // required
  currentName: "", // optional
};

const ALLOWED_FORM_KEYS = Object.keys(INITIAL_FORM);

function sanitizeForm(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  const next = { ...INITIAL_FORM };
  ALLOWED_FORM_KEYS.forEach((k) => {
    if (k in obj) next[k] = obj[k];
  });
  return next;
}

/** ======================
 *  ✅ 백으로 보낼 payload 생성
 *  - 기업진단 내용은 UI에서 안 보여도, 내부적으로 diagnosisSummary로 전달됨
 *  ====================== */
function buildNamingPayload(
  form,
  { mode, regenSeed, brandId, diagnosisSummary },
) {
  const namingStyle = Array.isArray(form.namingStyles)
    ? (form.namingStyles[0] || "").toString()
    : safeText(form.namingStyles, "");

  const languagePref = Array.isArray(form.languagePrefs)
    ? (form.languagePrefs[0] || "").toString()
    : safeText(form.languagePrefs, "");

  const brandVibeArr = Array.isArray(form.brandVibe)
    ? form.brandVibe
    : safeText(form.brandVibe, "")
      ? [safeText(form.brandVibe, "")]
      : [];

  const answersLegacy = {
    namingStyles: Array.isArray(form.namingStyles) ? form.namingStyles : [],
    namingStyleOther: safeText(form.namingStyleOther, ""),

    nameLength: safeText(form.nameLength, ""),
    nameLengthOther: safeText(form.nameLengthOther, ""),

    languagePrefs: Array.isArray(form.languagePrefs) ? form.languagePrefs : [],
    languageOther: safeText(form.languageOther, ""),

    brandVibe: brandVibeArr,
    brandVibeOther: safeText(form.brandVibeOther, ""),

    avoidStyle: safeText(form.avoidStyle, ""),
    domainConstraint: safeText(form.domainConstraint, ""),
    domainOther: safeText(form.domainOther, ""),

    targetEmotion: safeText(form.targetEmotion, ""),
    currentName: safeText(form.currentName, ""),
  };

  // ✅ v2(백 전달용): context_key 기준(스네이크 케이스)
  const answersV2 = {
    naming_style: namingStyle,
    naming_style_other: answersLegacy.namingStyleOther,

    name_length: answersLegacy.nameLength,
    name_length_other: answersLegacy.nameLengthOther,

    language_pref: languagePref,
    language_other: answersLegacy.languageOther,

    brand_vibe: brandVibeArr.join(", "),
    brand_vibe_list: brandVibeArr,
    brand_vibe_other: answersLegacy.brandVibeOther,

    avoid_style: answersLegacy.avoidStyle,

    domain_constraint: answersLegacy.domainConstraint,
    domain_other: answersLegacy.domainOther,

    target_emotion: answersLegacy.targetEmotion,
    current_name: answersLegacy.currentName,
  };

  const answers = { ...answersLegacy, ...answersV2 };

  const getQaAnswer = (q) => {
    const v = answersLegacy[q.key];

    if (q.answerType === "single_select") {
      if (Array.isArray(v)) return v[0] ?? "";
      return safeText(v, "");
    }
    if (q.answerType === "multi_select") {
      return Array.isArray(v) ? v : [];
    }
    return safeText(v, "");
  };

  const qa = NAMING_QUESTIONS.map((q) => ({
    questionId: q.questionId,
    questionText: q.questionText,
    answerType: q.answerType,
    answer: getQaAnswer(q),
  }));

  return {
    step: "naming",
    mode, // "generate" | "regen"
    regenSeed,
    brandId: brandId || null,

    answers,
    qa,

    // ✅ 기업진단 요약(내부 전달용)
    diagnosisSummary: diagnosisSummary || null,

    questionnaire: {
      step: "naming",
      version: "naming_v1",
      locale: "ko-KR",
    },
  };
}

/** ======================
 *  백 응답 후보 normalize
 *  ====================== */
function normalizeNamingCandidates(raw) {
  const payload = raw?.data ?? raw?.result ?? raw;

  // ✅ { name1, name2, name3 } 형태
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const keys = ["name1", "name2", "name3"];
    const values = keys
      .map((k) => payload?.[k])
      .filter((v) => typeof v === "string" && v.trim());

    if (values.length) {
      return values.slice(0, 3).map((name, idx) => ({
        id: `name_${idx + 1}`,
        name: `컨설팅 제안 ${idx + 1}`,
        oneLiner: name,
        keywords: [],
        style: "",
        samples: [name],
        rationale: "",
        checks: [],
        avoid: [],
      }));
    }
  }

  const list = Array.isArray(payload)
    ? payload
    : payload?.candidates ||
      payload?.data?.candidates ||
      payload?.result?.candidates;

  if (!Array.isArray(list)) return [];

  // ✅ ["name1","name2","name3"]
  if (list.length && typeof list[0] === "string") {
    return list.slice(0, 3).map((name, idx) => ({
      id: `name_${idx + 1}`,
      name: `컨설팅 제안 ${idx + 1}`,
      oneLiner: name,
      keywords: [],
      style: "",
      samples: [name],
      rationale: "",
      checks: [],
      avoid: [],
    }));
  }

  // ✅ 객체 배열
  return list.slice(0, 3).map((item, idx) => {
    const id = item.id || item.candidateId || `name_${idx + 1}`;
    const title =
      item.name || item.title || item.label || `컨설팅 제안 ${idx + 1}`;

    const samples =
      (Array.isArray(item.samples) && item.samples) ||
      (Array.isArray(item.names) && item.names) ||
      (Array.isArray(item.examples) && item.examples) ||
      (item.oneLiner ? [item.oneLiner] : []);

    const keywords =
      (Array.isArray(item.keywords) && item.keywords) ||
      (Array.isArray(item.tags) && item.tags) ||
      [];

    const checks =
      (Array.isArray(item.checks) && item.checks) ||
      (Array.isArray(item.notes) && item.notes) ||
      [];

    const avoid =
      (Array.isArray(item.avoid) && item.avoid) ||
      (Array.isArray(item.avoidList) && item.avoidList) ||
      [];

    return {
      id,
      name: title,
      oneLiner: safeText(item.oneLiner || item.summary || "", ""),
      keywords: keywords.slice(0, 10),
      style: safeText(item.style || "", ""),
      samples: samples.slice(0, 10),
      rationale: safeText(item.rationale || item.reason || "", ""),
      checks: checks.slice(0, 10),
      avoid: avoid.slice(0, 10),
    };
  });
}

export default function NamingConsultingInterview({ onLogout }) {
  // 2026-02-05
  // 네이밍 페이지에서 자동 저장이 안되서 수정
  const uidRef = useRef(getActiveUserId());

  const navigate = useNavigate();
  const location = useLocation();

  const REQUIRED_FIELD_ID = {
    namingStyles: "naming-q-namingStyles",
    nameLength: "naming-q-nameLength",
    languagePrefs: "naming-q-languagePrefs",
    brandVibe: "naming-q-brandVibe",
    avoidStyle: "naming-q-avoidStyle",
    domainConstraint: "naming-q-domainConstraint",
    targetEmotion: "naming-q-targetEmotion",
  };

  // ✅ 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 폼 상태
  const [form, setForm] = useState(INITIAL_FORM);
  const [loaded, setLoaded] = useState(false);

  // ✅ 저장 상태 UI
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");

  // ✅ 결과(후보/선택) 상태
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [toast, setToast] = useState({
    msg: "",
    variant: "success",
    muted: false,
  });
  const toastTimerRef = useRef(null);
  const toastMsg = toast.msg;
  const toastMuted = toast.muted;
  const toastVariant = toast.variant;

  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [regenSeed, setRegenSeed] = useState(0);
  const refResult = useRef(null);

  // 섹션 ref
  const refInterview = useRef(null);

  // ✅ 필수 항목
  const requiredKeys = useMemo(
    () => [
      "namingStyles",
      "nameLength",
      "languagePrefs",
      "brandVibe",
      "avoidStyle",
      "domainConstraint",
      "targetEmotion",
    ],
    [],
  );

  const requiredStatus = useMemo(() => {
    const status = {};
    requiredKeys.forEach((k) => {
      status[k] = isFilled(form?.[k]);
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

  // ✅ 모든 필수 입력 완료 시 하단 토스트(몇 초 후 자동 사라짐)
  const [completeToast, setCompleteToast] = useState({ open: false, msg: "" });
  const completeToastTimerRef = useRef(null);
  const completeToastInitRef = useRef(false);
  const prevCanAnalyzeRef = useRef(false);

  const showCompleteToast = (msg) => {
    try {
      if (completeToastTimerRef.current)
        clearTimeout(completeToastTimerRef.current);
    } catch {
      // ignore
    }
    setCompleteToast({ open: true, msg });
    completeToastTimerRef.current = setTimeout(() => {
      setCompleteToast((prev) => ({ ...prev, open: false }));
    }, 3200);
  };

  useEffect(() => {
    return () => {
      try {
        if (completeToastTimerRef.current)
          clearTimeout(completeToastTimerRef.current);
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;

    // 첫 로드에서는 저장된 값으로 인한 즉시 토스트 노출을 막아요.
    if (!completeToastInitRef.current) {
      completeToastInitRef.current = true;
      prevCanAnalyzeRef.current = Boolean(canAnalyze);
      return;
    }

    const prev = prevCanAnalyzeRef.current;
    const cur = Boolean(canAnalyze);

    if (!prev && cur) {
      showCompleteToast(
        "모든 필수 입력이 완료됐어요! 아래 ‘AI 분석 요청’ 버튼을 눌러 다음 단계로 진행하세요.",
      );
    }

    prevCanAnalyzeRef.current = cur;
  }, [loaded, canAnalyze]);
  const remainingRequired = Math.max(
    requiredKeys.length - completedRequired,
    0,
  );
  const hasResult = candidates.length > 0;
  const canGoNext = Boolean(hasResult && selectedId);

  const requiredLabelMap = {
    namingStyles: "원하는 네이밍 스타일",
    nameLength: "이름 길이",
    languagePrefs: "한글/영문 선호",
    brandVibe: "브랜드 분위기",
    avoidStyle: "피하고 싶은 느낌",
    domainConstraint: "도메인 제약사항",
    targetEmotion: "고객이 느끼길 바라는 감정",
  };

  const setValue = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const scrollToRequiredField = (key) => {
    try {
      const id = REQUIRED_FIELD_ID?.[key];
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusTarget = el.querySelector(
        "textarea, input, button, [role='button']",
      );
      if (focusTarget && typeof focusTarget.focus === "function") {
        focusTarget.focus({ preventScroll: true });
      }
    } catch {
      // ignore
    }
  };

  // ✅ 단일 선택(배열 1개만 유지)
  const setSingleArrayValue = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value ? [value] : [],
    }));
  };

  const scrollToResult = () => {
    if (!refResult?.current) return;
    refResult.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const showToast = (msg) => {
    const text = String(msg || "");
    const variant = /^\s*(⚠️|❌)/.test(text) ? "warn" : "success";
    setToast({ msg: text, variant, muted: false });

    try {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);

      // ✅ 성공 메시지는 몇 초 뒤 “톤다운(흰 배경)” 처리(문구는 유지)
      if (variant === "success") {
        toastTimerRef.current = window.setTimeout(() => {
          setToast((prev) =>
            prev.msg === text ? { ...prev, muted: true } : prev,
          );
        }, 3500);
      }
    } catch {
      // ignore
    }
  };

  /** ======================
   *  Strict Flow 가드 + pipeline 준비
   *  ====================== */
  useEffect(() => {
    try {
      migrateLegacyToPipelineIfNeeded();

      const access = ensureStrictStepAccess("naming");
      if (!access?.ok) {
        if (access?.reason === "no_back") {
          alert(
            "이전 단계로는 돌아갈 수 없습니다. 현재 단계에서 계속 진행해주세요.",
          );
        }
        if (access?.redirectTo) {
          navigate(access.redirectTo, { replace: true });
        }
        return;
      }

      const p = readPipeline();
      const brandId =
        location?.state?.brandId ??
        location?.state?.report?.brandId ??
        p?.brandId ??
        null;

      startBrandFlow({ brandId });
      setBrandFlowCurrent("naming");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ draft 로드(폼 키 sanitize)
  useEffect(() => {
    try {
      const raw = userGetItem(STORAGE_KEY, uidRef.current);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      const loadedForm =
        parsed?.form && typeof parsed.form === "object"
          ? sanitizeForm(parsed.form)
          : null;

      if (loadedForm) setForm(loadedForm);

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

  // ✅ 결과 로드(후보/선택)
  useEffect(() => {
    try {
      const raw = userGetItem(RESULT_KEY, uidRef.current);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.candidates)) setCandidates(parsed.candidates);
      if (parsed?.selectedId) setSelectedId(parsed.selectedId);
      if (typeof parsed?.regenSeed === "number") setRegenSeed(parsed.regenSeed);
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
        userSetItem(STORAGE_KEY, JSON.stringify(payload), uidRef.current);

        // 메인 "이어하기"용 레거시 키도 같이 저장 (네이밍만 누락되어 있었음)
        userSetItem(
          LEGACY_KEY,
          JSON.stringify({ form, updatedAt: payload.updatedAt }),
          uidRef.current,
        );

        setLastSaved(new Date(payload.updatedAt).toLocaleString());
        setSaveMsg("자동 저장됨");
      } catch {
        // ignore
      }
    }, 600);

    return () => clearTimeout(t);
  }, [form]);

  const persistResult = (nextCandidates, nextSelectedId, nextSeed) => {
    const updatedAt = Date.now();

    try {
      userSetItem(
        RESULT_KEY,
        JSON.stringify({
          candidates: nextCandidates,
          selectedId: nextSelectedId,
          regenSeed: nextSeed,
          updatedAt,
        }),
        uidRef.current,
      );
    } catch {
      // ignore
    }

    try {
      const selected =
        nextCandidates.find((c) => c.id === nextSelectedId) || null;
      userSetItem(
        LEGACY_KEY,
        JSON.stringify({
          form,
          candidates: nextCandidates,
          selectedId: nextSelectedId,
          selected,
          regenSeed: nextSeed,
          updatedAt,
        }),
        uidRef.current,
      );
    } catch {
      // ignore
    }

    try {
      const selected =
        nextCandidates.find((c) => c.id === nextSelectedId) || null;
      setStepResult("naming", {
        candidates: nextCandidates,
        selectedId: nextSelectedId,
        selected,
        regenSeed: nextSeed,
      });

      // ✅ 네이밍이 바뀌면 이후 단계(컨셉/스토리/로고)는 무효 → 잠금 처리
      clearStepsFrom("concept");
    } catch {
      // ignore
    }
  };

  /** ======================
   *  ✅ 네이밍 생성
   *   - POST /brands/{brandId}/naming
   *  ====================== */
  const handleGenerateCandidates = async (mode = "generate") => {
    setAnalyzeError("");

    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 요청이 가능합니다.");
      return;
    }

    setAnalyzing(true);
    setAnalyzeError("");

    try {
      const nextSeed = mode === "regen" ? regenSeed + 1 : regenSeed;
      if (mode === "regen") setRegenSeed(nextSeed);

      const p = readPipeline();

      // ✅ 기업진단 요약(내부 전달용)
      const diagnosisSummary =
        p?.diagnosisSummary ||
        (() => {
          const diag = readDiagnosisDraftForm();
          return diag ? buildDiagnosisSummaryFromDraft(diag) : null;
        })();

      let brandId =
        p?.brandId ||
        p?.brand?.id ||
        p?.diagnosisResult?.brandId ||
        p?.diagnosis?.brandId ||
        null;

      if (!brandId) {
        alert(
          "brandId를 확인할 수 없습니다. 기업진단 완료 후 생성된 brandId가 pipeline에 저장되어 있어야 합니다.",
        );
        return;
      }

      const payload = buildNamingPayload(form, {
        mode,
        regenSeed: nextSeed,
        brandId,
        diagnosisSummary,
      });

      const namingRes = await apiRequestAI(`/brands/${brandId}/naming`, {
        method: "POST",
        data: payload,
      });

      const nextCandidates = normalizeNamingCandidates(namingRes);
      if (!nextCandidates.length) {
        alert(
          "네이밍 제안을 받지 못했습니다. 백 응답 포맷(candidates)을 확인해주세요.",
        );
        return;
      }

      setCandidates(nextCandidates);
      setSelectedId(null);
      persistResult(nextCandidates, null, nextSeed);
      showToast(
        "✅ 네이밍 컨설팅 제안 3가지가 도착했어요. 아래에서 확인하고 ‘선택’을 눌러주세요.",
      );
      window.setTimeout(() => scrollToResult(), 50);
    } catch (error) {
      const status = error?.response?.status;
      console.error("Naming generate failed:", error);

      if (status === 401 || status === 403) {
        alert(
          status === 401
            ? "로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요."
            : "권한이 없습니다(403). 보통 현재 로그인한 계정의 brandId가 아닌 값으로 요청할 때 발생합니다. 기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.",
        );
        try {
          upsertPipeline({ brandId: null });
        } catch {
          // ignore
        }
        return;
      }

      const msg =
        error?.response?.data?.message ||
        error?.userMessage ||
        error?.message ||
        "요청 실패";
      setAnalyzeError(`네이밍 생성에 실패했습니다: ${msg}`);
      showToast("⚠️ 생성에 실패했어요. 아래에서 ‘다시 시도’를 눌러주세요.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectCandidate = (id) => {
    setSelectedId(id);
    persistResult(candidates, id, regenSeed);
  };

  const handleGoNext = async () => {
    if (!canGoNext) return;

    const p = readPipeline();
    const brandId =
      p?.brandId ||
      p?.brand?.id ||
      p?.diagnosisResult?.brandId ||
      p?.diagnosis?.brandId ||
      null;

    const selected =
      candidates.find((c) => c.id === selectedId) ||
      candidates.find((c) => c.id === (selectedId || "")) ||
      null;

    const selectedName =
      selected?.samples?.[0] ||
      selected?.oneLiner ||
      selected?.title ||
      selected?.name ||
      "";

    if (!brandId) {
      alert("brandId를 확인할 수 없습니다. 기업진단을 다시 진행해 주세요.");
      return;
    }
    if (!String(selectedName).trim()) {
      alert("선택된 네이밍을 찾을 수 없습니다. 후보를 다시 선택해 주세요.");
      return;
    }

    try {
      await apiRequest(`/brands/${brandId}/naming/select`, {
        method: "POST",
        data: { selectedByUser: String(selectedName) },
      });
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message || e?.userMessage || e?.message || "";

      console.warn("POST /brands/{brandId}/naming/select failed:", e);

      if (status === 401 || status === 403) {
        alert(
          status === 401
            ? "로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요."
            : "권한이 없습니다(403). 보통 현재 로그인한 계정의 brandId가 아닌 값으로 요청할 때 발생합니다. 기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.",
        );
        return;
      }

      if (!String(msg).includes("네이밍 단계")) {
        alert(`네이밍 선택 저장에 실패했습니다: ${msg || "요청 실패"}`);
        return;
      }
    }

    try {
      setBrandFlowCurrent("concept");
    } catch {
      // ignore
    }

    navigate("/brand/concept/interview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetAll = () => {
    const ok = window.confirm(
      "네이밍 입력/결과를 초기화하고(컨셉/스토리/로고도 잠깁니다) 다시 시작할까요?",
    );
    if (!ok) return;

    try {
      userRemoveItem(STORAGE_KEY, uidRef.current);
      userRemoveItem(RESULT_KEY, uidRef.current);
      userRemoveItem(LEGACY_KEY, uidRef.current);
    } catch {
      // ignore
    }

    try {
      clearStepsFrom("naming");
    } catch {
      // ignore
    }

    setForm({ ...INITIAL_FORM });
    setCandidates([]);
    setSelectedId(null);
    setRegenSeed(0);
    setSaveMsg("");
    setLastSaved("-");
  };

  return (
    <div className="diagInterview consultingInterview">
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
          <section className="diagInterviewHero" aria-label="인터뷰 안내 배너">
            <div className="diagInterviewHero__inner">
              <div className="diagInterviewHero__left">
                <h1 className="diagInterview__title">네이밍 컨설팅 인터뷰</h1>
                <p className="diagInterview__sub">
                  아래 Step 2 질문에 답하면 네이밍 제안 3안을 생성합니다. 선택한
                  1안은 다음 단계(컨셉) 생성에 사용됩니다.
                </p>

                <div className="diagInterviewHero__chips">
                  <span className="diagInterviewHero__chip">
                    <b>진행률</b>
                    <span>{progress}%</span>
                  </span>
                  <span className="diagInterviewHero__chip">
                    <b>필수 완료</b>
                    <span>
                      {completedRequired}/{requiredKeys.length}
                    </span>
                  </span>
                  <span
                    className={`diagInterviewHero__chip state ${canAnalyze ? "ready" : "pending"}`}
                  >
                    {canAnalyze
                      ? "AI 분석 요청 가능"
                      : `필수 ${remainingRequired}개 남음`}
                  </span>
                </div>
              </div>

              <div className="diagInterviewHero__right">
                <div
                  className={`diagInterviewHero__status ${canAnalyze ? "ready" : "pending"}`}
                >
                  <span
                    className="diagInterviewHero__statusDot"
                    aria-hidden="true"
                  />
                  <span>
                    {canAnalyze
                      ? "모든 필수 입력이 완료되었어요"
                      : "필수 항목을 입력하면 AI 분석 요청이 활성화돼요"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <ConsultingFlowPanel activeKey="naming" />

          <div className="diagInterview__grid">
            <section className="diagInterview__left">
              {/* (요청 반영) 상단 기업진단 자동입력 카드 제거 */}

              {/* INTERVIEW */}
              <div className="card" ref={refInterview}>
                <div className="card__head">
                  <h2>Naming Consulting</h2>
                  <p>
                    아래 항목을 입력하면 네이밍 컨설팅 제안 3가지를 생성할 수
                    있어요.
                  </p>
                </div>

                {/* 1) naming style */}
                <div className="field" id="naming-q-namingStyles">
                  <label>
                    1. 어떤 스타일의 이름을 선호하시나요?{" "}
                    <span className="req">*</span>
                  </label>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {NAMING_STYLE_OPTIONS.map((opt) => {
                      const checked =
                        (form.namingStyles?.[0] ?? "") === opt.value;

                      return (
                        <label
                          key={opt.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <input
                            type="radio"
                            name="naming_style"
                            value={opt.value}
                            checked={checked}
                            onChange={(e) =>
                              setSingleArrayValue(
                                "namingStyles",
                                e.target.value,
                              )
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {(form.namingStyles?.[0] ?? "") === "Other" ? (
                    <input
                      value={form.namingStyleOther}
                      onChange={(e) =>
                        setValue("namingStyleOther", e.target.value)
                      }
                      placeholder="원하는 네이밍 스타일을 설명해주세요"
                      style={{ marginTop: 8 }}
                    />
                  ) : null}
                </div>

                {/* 2) name length */}
                <div className="field" id="naming-q-nameLength">
                  <label>
                    2. 이름의 길이는 어느 정도가 적당한가요?{" "}
                    <span className="req">*</span>
                  </label>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {NAME_LENGTH_OPTIONS.map((opt) => {
                      const checked = (form.nameLength ?? "") === opt.value;
                      return (
                        <label
                          key={opt.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <input
                            type="radio"
                            name="name_length"
                            value={opt.value}
                            checked={checked}
                            onChange={(e) =>
                              setValue("nameLength", e.target.value)
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {(form.nameLength ?? "") === "Other" ? (
                    <input
                      value={form.nameLengthOther}
                      onChange={(e) =>
                        setValue("nameLengthOther", e.target.value)
                      }
                      placeholder="선호하는 길이를 자유롭게 설명해주세요"
                      style={{ marginTop: 8 }}
                    />
                  ) : null}
                </div>

                {/* 3) language */}
                <div className="field" id="naming-q-languagePrefs">
                  <label>
                    3. 어떤 언어 기반이어야 하나요?{" "}
                    <span className="req">*</span>
                  </label>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {LANGUAGE_OPTIONS.map((opt) => {
                      const checked =
                        (form.languagePrefs?.[0] ?? "") === opt.value;

                      return (
                        <label
                          key={opt.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <input
                            type="radio"
                            name="language_pref"
                            value={opt.value}
                            checked={checked}
                            onChange={(e) =>
                              setSingleArrayValue(
                                "languagePrefs",
                                e.target.value,
                              )
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {(form.languagePrefs?.[0] ?? "") === "Other" ? (
                    <input
                      value={form.languageOther}
                      onChange={(e) =>
                        setValue("languageOther", e.target.value)
                      }
                      placeholder="선호하는 언어나 조합을 설명해주세요"
                      style={{ marginTop: 8 }}
                    />
                  ) : null}
                </div>

                {/* 4) vibe max 2 */}
                <div className="field" id="naming-q-brandVibe">
                  <label>
                    4. 이름에서 느껴져야 할 첫인상은 무엇인가요? (최대 2개 선택){" "}
                    <span className="req">*</span>
                  </label>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {VIBE_OPTIONS.map((opt) => {
                      const checked =
                        Array.isArray(form.brandVibe) &&
                        form.brandVibe.includes(opt.value);

                      const disabled =
                        !checked &&
                        Array.isArray(form.brandVibe) &&
                        form.brandVibe.length >= 2;

                      return (
                        <label
                          key={opt.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            name="brand_vibe"
                            value={opt.value}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => {
                              setForm((prev) => {
                                const cur = Array.isArray(prev.brandVibe)
                                  ? prev.brandVibe
                                  : [];
                                const exists = cur.includes(opt.value);

                                let next = cur;

                                if (exists) {
                                  next = cur.filter((v) => v !== opt.value);
                                } else {
                                  if (cur.length >= 2) {
                                    alert("최대 2개까지 선택할 수 있어요.");
                                    return prev;
                                  }
                                  next = [...cur, opt.value];
                                }

                                const nextOther = next.includes("Other")
                                  ? prev.brandVibeOther
                                  : "";

                                return {
                                  ...prev,
                                  brandVibe: next,
                                  brandVibeOther: nextOther,
                                };
                              });
                            }}
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {Array.isArray(form.brandVibe) &&
                  form.brandVibe.includes("Other") ? (
                    <input
                      value={form.brandVibeOther}
                      onChange={(e) =>
                        setValue("brandVibeOther", e.target.value)
                      }
                      placeholder="원하는 느낌을 구체적으로 설명해주세요"
                      style={{ marginTop: 8 }}
                    />
                  ) : null}
                </div>

                {/* 5) avoid required */}
                <div className="field" id="naming-q-avoidStyle">
                  <label>
                    5. "이런 느낌만은 피해주세요" 하는 것이 있나요?{" "}
                    <span className="req">*</span>
                  </label>
                  <input
                    value={form.avoidStyle}
                    onChange={(e) => setValue("avoidStyle", e.target.value)}
                    placeholder="예: 너무 유치한 느낌, 어려운 한자어, 발음하기 어려운 것 등"
                  />
                </div>

                {/* 6) domain importance */}
                <div className="field" id="naming-q-domainConstraint">
                  <label>
                    6. .com 도메인 확보가 얼마나 중요한가요?{" "}
                    <span className="req">*</span>
                  </label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {DOMAIN_OPTIONS.map((opt) => {
                      const checked = form.domainConstraint === opt.value;
                      return (
                        <label
                          key={opt.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <input
                            type="radio"
                            name="domain_constraint"
                            value={opt.value}
                            checked={checked}
                            onChange={(e) =>
                              setValue("domainConstraint", e.target.value)
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {(form.domainConstraint ?? "") === "Other" ? (
                    <input
                      value={form.domainOther}
                      onChange={(e) => setValue("domainOther", e.target.value)}
                      placeholder="도메인 관련 요구사항을 설명해주세요"
                      style={{ marginTop: 8 }}
                    />
                  ) : null}
                </div>

                {/* 7) target emotion */}
                <div className="field" id="naming-q-targetEmotion">
                  <label>
                    7. 고객이 이름을 듣자마자 느꼈으면 하는 딱 하나의 감정은
                    무엇인가요? <span className="req">*</span>
                  </label>
                  <input
                    value={form.targetEmotion}
                    onChange={(e) => setValue("targetEmotion", e.target.value)}
                    placeholder="예: 호기심, 안심, 설렘, 편안함, 신뢰 등"
                  />
                </div>

                {/* 8) current name optional */}
                <div className="field">
                  <label>
                    8. 현재 사용 중인 브랜드 이름이 있다면 무엇인가요? (선택)
                  </label>
                  <input
                    value={form.currentName}
                    onChange={(e) => setValue("currentName", e.target.value)}
                    placeholder="현재 브랜드명을 입력해주세요"
                  />
                </div>
              </div>

              <div ref={refResult} />

              {toastMsg ? (
                <div
                  className={`aiToast ${toastVariant}${toastMuted ? " muted" : ""}`}
                  role="status"
                  aria-live="polite"
                >
                  {toastMsg}
                </div>
              ) : null}

              {analyzeError ? (
                <div className="card aiError" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>요청에 실패했어요</h2>
                    <p>{analyzeError}</p>
                  </div>
                  <div
                    className="bottomBar"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() =>
                        handleGenerateCandidates(
                          hasResult ? "regen" : "generate",
                        )
                      }
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              ) : null}

              {analyzing ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>네이밍 제안 생성 중</h2>
                    <p>입력 내용을 바탕으로 제안 3가지를 만들고 있어요.</p>
                  </div>
                  <div className="hint">잠시만 기다려주세요…</div>
                </div>
              ) : hasResult ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>네이밍 컨설팅 제안 3가지</h2>
                    <p>
                      제안 1개를 선택하면 다음 단계(컨셉)로 진행할 수 있어요.
                    </p>
                  </div>

                  <div className="candidateList">
                    {candidates.map((c) => {
                      const isSelected = selectedId === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`candidateCard ${isSelected ? "selected" : ""}`}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            !isSelected && handleSelectCandidate(c.id)
                          }
                          onKeyDown={(e) => {
                            if (isSelected) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelectCandidate(c.id);
                            }
                          }}
                        >
                          <div className="candidateHead">
                            <div>
                              <div className="candidateTitle">{c.name}</div>
                              {c.oneLiner ? (
                                <div style={{ marginTop: 6, opacity: 0.9 }}>
                                  {c.oneLiner}
                                </div>
                              ) : null}
                            </div>
                            <span className="candidateBadge">
                              {isSelected ? "선택됨" : "제안"}
                            </span>
                          </div>

                          {c.keywords?.length ? (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                                키워드
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                {c.keywords.map((kw) => (
                                  <span
                                    key={kw}
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 800,
                                      padding: "4px 10px",
                                      borderRadius: 999,
                                      background: "rgba(0,0,0,0.04)",
                                      border: "1px solid rgba(0,0,0,0.06)",
                                      color: "rgba(0,0,0,0.75)",
                                    }}
                                  >
                                    #{kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 13,
                              opacity: 0.9,
                            }}
                          >
                            {c.style ? (
                              <div>
                                <b>스타일</b> · {c.style}
                              </div>
                            ) : null}

                            {c.samples?.length ? (
                              <div style={{ marginTop: 6 }}>
                                <b>샘플</b>
                                <div
                                  style={{
                                    marginTop: 6,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 6,
                                  }}
                                >
                                  {c.samples.map((s) => (
                                    <span
                                      key={s}
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        padding: "4px 10px",
                                        borderRadius: 999,
                                        background: "rgba(0,0,0,0.04)",
                                        border: "1px solid rgba(0,0,0,0.06)",
                                        color: "rgba(0,0,0,0.75)",
                                      }}
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {c.rationale ? (
                              <div style={{ marginTop: 10, opacity: 0.85 }}>
                                <b>근거</b> · {c.rationale}
                              </div>
                            ) : null}

                            {c.checks?.length ? (
                              <div style={{ marginTop: 8, opacity: 0.85 }}>
                                <b>체크</b> · {c.checks.join(" · ")}
                              </div>
                            ) : null}

                            {c.avoid?.length ? (
                              <div style={{ marginTop: 8, opacity: 0.85 }}>
                                <b>피해야 할 요소</b> · {c.avoid.join(", ")}
                              </div>
                            ) : null}
                          </div>

                          <div className="candidateActions">
                            <button
                              type="button"
                              className={`btn primary ${isSelected ? "disabled" : ""}`}
                              disabled={isSelected}
                              onClick={() => handleSelectCandidate(c.id)}
                            >
                              {isSelected ? "선택 완료" : "선택"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
                    {canGoNext
                      ? "✅ 사이드 카드에서 ‘컨셉 단계로 이동’ 버튼을 눌러주세요."
                      : "* 제안 1개를 선택하면 사이드 카드에 다음 단계 버튼이 표시됩니다."}
                  </div>
                </div>
              ) : null}
            </section>

            <aside className="diagInterview__right">
              <div className="sideCard">
                <ConsultingFlowMini activeKey="naming" />

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
                <ul className="checkList checkList--cards">
                  {requiredKeys.map((key) => {
                    const ok = Boolean(requiredStatus[key]);
                    const label = requiredLabelMap[key] || key;

                    return (
                      <li key={key}>
                        <button
                          type="button"
                          className={`checkItemBtn ${ok ? "ok" : "todo"}`}
                          onClick={() => scrollToRequiredField(key)}
                          aria-label={`${label} 항목으로 이동`}
                        >
                          <span className="checkItemLeft">
                            <span
                              className={`checkStateIcon ${ok ? "ok" : "todo"}`}
                              aria-hidden="true"
                            >
                              {ok ? "✅" : "❗"}
                            </span>
                            <span>{label}</span>
                          </span>
                          <span className="checkItemState">
                            {ok ? "완료" : "필수"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="divider" />

                <h4 className="sideSubTitle">빠른 작업</h4>
                <button
                  type="button"
                  className={`btn primary sideAnalyze ${canAnalyze ? "ready" : "pending"} ${analyzing ? "disabled" : ""}`}
                  onClick={() =>
                    handleGenerateCandidates(hasResult ? "regen" : "generate")
                  }
                  disabled={!canAnalyze || analyzing}
                  style={{ width: "100%", marginBottom: 8 }}
                >
                  {analyzing
                    ? "생성 중..."
                    : hasResult
                      ? "AI 분석 재요청"
                      : canAnalyze
                        ? "AI 분석 요청"
                        : `AI 분석 요청 (${remainingRequired}개 남음)`}
                </button>

                <p
                  className={`hint sideActionHint ${canAnalyze ? "ready" : ""}`}
                >
                  {canAnalyze
                    ? "모든 필수 입력이 완료됐어요. AI 분석 요청을 눌러 다음 진행을 시작하세요."
                    : `필수 항목 ${remainingRequired}개를 모두 입력하면 AI 분석 요청 버튼이 활성화돼요.`}
                </p>

                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleResetAll}
                  style={{ width: "100%" }}
                >
                  네이밍 초기화
                </button>

                {analyzeError ? (
                  <div className="aiInlineError" style={{ marginTop: 10 }}>
                    {analyzeError}
                  </div>
                ) : null}

                <div className="divider" />

                <h4 className="sideSubTitle">다음 단계</h4>
                {canGoNext ? (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleGoNext}
                    style={{ width: "100%" }}
                  >
                    컨셉 단계로 이동
                  </button>
                ) : (
                  <p className="hint" style={{ marginTop: 10 }}>
                    * 제안 1개를 선택하면 다음 단계 버튼이 표시됩니다.
                  </p>
                )}
              </div>
            </aside>
          </div>

          {/* ✅ 입력 완료 안내는 하단 토스트로 표시됩니다. */}
        </div>
      </main>

      {/* ✅ 완료 안내 하단 토스트 */}
      <div
        className={`completionBottomToast ${completeToast.open ? "show" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-hidden={!completeToast.open}
      >
        <div className="completionBottomToast__card">
          <span className="completionBottomToast__icon" aria-hidden="true">
            ✅
          </span>
          <div className="completionBottomToast__text">
            <div className="completionBottomToast__title">
              모든 필수 입력 완료
            </div>
            <div className="completionBottomToast__desc">
              {completeToast.msg}
            </div>
          </div>
        </div>
      </div>
      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
