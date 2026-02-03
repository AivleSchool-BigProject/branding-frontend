// src/pages/ConceptConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import ConsultingFlowPanel from "../components/ConsultingFlowPanel.jsx";
import ConsultingFlowMini from "../components/ConsultingFlowMini.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// ✅ 사용자별 localStorage 분리(계정마다 독립 진행)
import {
  userGetItem,
  userSetItem,
  userRemoveItem,
} from "../utils/userLocalStorage.js";

import {
  ensureStrictStepAccess,
  setBrandFlowCurrent,
  markBrandFlowPendingAbort,
  consumeBrandFlowPendingAbort,
  abortBrandFlow,
  setStepResult,
  clearStepsFrom,
  readPipeline,
} from "../utils/brandPipelineStorage.js";

// ✅ 백 연동(이미 프로젝트에 존재하는 클라이언트 사용)
import { apiRequest } from "../api/client.js";

const STORAGE_KEY = "conceptInterviewDraft_homepage_v6";
const RESULT_KEY = "conceptInterviewResult_homepage_v6";
const LEGACY_KEY = "brandInterview_homepage_v1";
const NEXT_PATH = "/brand/story";

const DIAG_KEYS = ["diagnosisInterviewDraft_v1", "diagnosisInterviewDraft"];

function safeText(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function hasText(v) {
  return Boolean(String(v ?? "").trim());
}

function stageLabel(v) {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (!s) return "-";
  if (s === "idea") return "아이디어";
  if (s === "mvp") return "MVP";
  if (s === "pmf") return "PMF";
  if (s === "revenue" || s === "early_revenue") return "매출";
  if (s === "invest") return "투자";
  if (s === "scaleup" || s === "scaling") return "스케일업";
  if (s === "rebrand") return "리브랜딩";
  return String(v);
}

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** ======================
 *  ✅ 백 응답 후보 normalize (3안 형태로 통일)
 *  - 백에서 내려준 데이터만 사용
 *  ====================== */
function normalizeConceptCandidates(raw) {
  const payload = raw?.data ?? raw?.result ?? raw;

  const takeObjCandidates = (obj) => {
    const keys = [
      "concept1",
      "concept2",
      "concept3",
      "candidate1",
      "candidate2",
      "candidate3",
      "option1",
      "option2",
      "option3",
    ];
    const list = [];
    for (const k of keys) {
      const v = obj?.[k];
      if (v === undefined || v === null) continue;
      list.push(v);
    }
    return list;
  };

  // 1) 배열로 직접 온 경우
  let list = Array.isArray(payload) ? payload : null;

  // 2) candidates / concepts 키로 온 경우
  if (!list && payload && typeof payload === "object") {
    list =
      payload?.candidates ||
      payload?.concepts ||
      payload?.data?.candidates ||
      payload?.data?.concepts ||
      payload?.result?.candidates ||
      payload?.result?.concepts ||
      null;
  }

  // 3) object에 concept1/2/3 형태로 담긴 경우
  if (
    !list &&
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    list = takeObjCandidates(payload);
  }

  if (!Array.isArray(list)) return [];

  return list.slice(0, 3).map((item, idx) => {
    if (typeof item === "string") {
      const title = item.trim();
      return {
        id: `concept_${idx + 1}`,
        title,
        summary: "",
        tone: "",
        coreValues: [],
        brandArchetype: [],
        keyMessage: "",
        trustFactors: "",
        conceptVibe: "",
        keywords: [],
        slogan: "",
        oneLine: "",
        note: "",
      };
    }

    const obj = item && typeof item === "object" ? item : {};
    const id = safeText(
      obj.id || obj.candidateId || obj.conceptId || "",
      `concept_${idx + 1}`,
    );
    const title = safeText(
      obj.title ||
        obj.name ||
        obj.label ||
        obj.conceptName ||
        obj.concept ||
        "",
      "",
    );

    return {
      id,
      title,
      summary: safeText(
        obj.summary || obj.description || obj.overview || "",
        "",
      ),
      tone: safeText(obj.tone || obj.brandTone || obj.voice || "", ""),
      coreValues: Array.isArray(obj.coreValues) ? obj.coreValues : [],
      brandArchetype: Array.isArray(obj.brandArchetype)
        ? obj.brandArchetype
        : [],
      keyMessage: safeText(obj.keyMessage || obj.key_message || "", ""),
      trustFactors: safeText(obj.trustFactors || obj.trust_factors || "", ""),
      conceptVibe: safeText(obj.conceptVibe || obj.vibe || "", ""),
      keywords: Array.isArray(obj.keywords) ? obj.keywords : [],
      slogan: safeText(obj.slogan || obj.tagline || "", ""),
      oneLine: safeText(obj.oneLine || obj.one_line || obj.oneLiner || "", ""),
      note: safeText(obj.note || obj.memo || "", ""),
    };
  });
}

function readDiagnosisForm() {
  for (const k of DIAG_KEYS) {
    const parsed = safeParse(userGetItem(k));
    if (!parsed) continue;
    const form =
      parsed?.form && typeof parsed.form === "object" ? parsed.form : parsed;
    if (form && typeof form === "object") return form;
  }
  return null;
}

function isFilled(v) {
  if (Array.isArray(v)) return v.length > 0;
  return Boolean(String(v ?? "").trim());
}

/** ✅ multiple 선택용 칩 UI */
function MultiChips({ value, options, onChange, max = null }) {
  const current = Array.isArray(value) ? value : [];

  const toggle = (opt) => {
    const exists = current.includes(opt);
    let next = exists ? current.filter((x) => x !== opt) : [...current, opt];

    if (typeof max === "number" && max > 0 && next.length > max) {
      next = next.slice(0, max);
    }
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = current.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className="chip"
            aria-pressed={active}
            onClick={() => toggle(opt)}
            style={{
              fontSize: 12,
              fontWeight: 800,
              padding: "6px 10px",
              borderRadius: 999,
              background: active ? "rgba(99,102,241,0.12)" : "rgba(0,0,0,0.04)",
              border: active
                ? "1px solid rgba(99,102,241,0.25)"
                : "1px solid rgba(0,0,0,0.10)",
              color: "rgba(0,0,0,0.78)",
              cursor: "pointer",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

const CORE_VALUE_OPTIONS = ["혁신", "신뢰", "단순함"];
const BRAND_VOICE_OPTIONS = [
  "전문적인 박사님",
  "친절한 가이드",
  "위트 있는 친구",
];
const ARCHETYPE_OPTIONS = ["현자(Sage)", "영웅(Hero)", "창조자(Creator)"];

const INITIAL_FORM = {
  // ✅ 기업 진단에서 자동 반영(편집 X)
  brandName: "",
  category: "",
  stage: "",
  oneLine: "",
  targetCustomer: "",
  referenceLink: "",

  // ✅ Step 3. 브랜드 컨셉/톤 (편집 O)
  core_values: [],
  brand_voice: [],
  brand_archetype: [],
  key_message: "",
  trust_factors: "",
  concept_vibe: "",
  slogan_keywords: "",
  notes: "",
};

export default function ConceptConsultingInterview({ onLogout }) {
  const navigate = useNavigate();

  // ✅ Strict Flow 가드(컨셉 단계) + 이탈/새로고침 처리
  useEffect(() => {
    try {
      const hadPending = consumeBrandFlowPendingAbort();
      if (hadPending) {
        abortBrandFlow("interrupted");
        window.alert(
          "브랜드 컨설팅 진행이 중단되어, 네이밍부터 다시 시작합니다.",
        );
      }
    } catch {
      // ignore
    }

    const guard = ensureStrictStepAccess("concept");
    if (!guard.ok) {
      const msg =
        guard?.reason === "no_back"
          ? "이전 단계로는 돌아갈 수 없습니다. 현재 진행 중인 단계에서 계속 진행해 주세요."
          : "이전 단계를 먼저 완료해 주세요.";
      window.alert(msg);
      navigate(guard.redirectTo || "/brand/naming/interview", {
        replace: true,
      });
      return;
    }

    try {
      setBrandFlowCurrent("concept");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 새로고침/탭닫기 경고 + 다음 진입 시 네이밍부터 리셋
  useEffect(() => {
    const onBeforeUnload = (e) => {
      try {
        markBrandFlowPendingAbort("beforeunload");
      } catch {
        // ignore
      }
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ✅ 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 폼 상태
  const [form, setForm] = useState(INITIAL_FORM);

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
  const refBasic = useRef(null);
  const refConcept = useRef(null);
  const refNotes = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "concept", label: "브랜드 컨셉/톤", ref: refConcept },
      { id: "notes", label: "추가 요청", ref: refNotes },
    ],
    [],
  );

  // ✅ 필수 항목(이번 Step3 질문 기준)
  const requiredKeys = useMemo(
    () => [
      "core_values",
      "brand_voice",
      "brand_archetype",
      "key_message",
      "trust_factors",
      "concept_vibe",
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
  const hasResult = candidates.length > 0;
  const canGoNext = Boolean(hasResult && selectedId);

  const setValue = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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

  // ✅ draft 로드
  useEffect(() => {
    try {
      const raw = userGetItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.form && typeof parsed.form === "object") {
        setForm((prev) => ({ ...prev, ...parsed.form }));
      }
      if (parsed?.updatedAt) {
        const d = new Date(parsed.updatedAt);
        if (!Number.isNaN(d.getTime())) setLastSaved(d.toLocaleString());
      }
    } catch {
      // ignore
    }
  }, []);

  // ✅ 기업 진단&인터뷰 값 자동 반영
  useEffect(() => {
    try {
      const diag = readDiagnosisForm();
      if (!diag) return;

      const next = {
        brandName: safeText(
          diag.companyName || diag.brandName || diag.projectName,
          "",
        ),
        category: safeText(diag.industry || diag.category || diag.field, ""),
        stage: safeText(diag.stage, ""),
        oneLine: safeText(
          diag.oneLine ||
            diag.companyIntro ||
            diag.intro ||
            diag.serviceIntro ||
            diag.shortIntro,
          "",
        ),
        targetCustomer: safeText(
          diag.targetCustomer ||
            diag.target ||
            diag.customerTarget ||
            diag.primaryCustomer,
          "",
        ),
        referenceLink: safeText(
          diag.website || diag.homepage || diag.siteUrl,
          "",
        ),
      };

      setForm((prev) => ({
        ...prev,
        brandName: next.brandName || prev.brandName,
        category: next.category || prev.category,
        stage: next.stage || prev.stage,
        oneLine: next.oneLine || prev.oneLine,
        targetCustomer: next.targetCustomer || prev.targetCustomer,
        referenceLink: next.referenceLink || prev.referenceLink,
      }));
    } catch {
      // ignore
    }
  }, []);

  // ✅ 결과 로드(후보/선택)
  useEffect(() => {
    try {
      const raw = userGetItem(RESULT_KEY);
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
        userSetItem(STORAGE_KEY, JSON.stringify(payload));
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
      );
    } catch {
      // ignore
    }

    // ✅ legacy 저장(통합 결과/결과 리포트 페이지 호환)
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
      );
    } catch {
      // ignore
    }

    // ✅ pipeline 저장 + 이후 단계 초기화(컨셉이 바뀌면 스토리/로고는 무효)
    try {
      const selected =
        nextCandidates.find((c) => c.id === nextSelectedId) || null;
      setStepResult("concept", {
        candidates: nextCandidates,
        selectedId: nextSelectedId,
        selected,
        regenSeed: nextSeed,
        updatedAt,
      });
      clearStepsFrom("story");
    } catch {
      // ignore
    }
  };

  const handleGenerateCandidates = async (mode = "generate") => {
    setAnalyzeError("");

    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 요청이 가능합니다.");
      return;
    }

    const p = readPipeline();
    const brandId =
      p?.brandId ||
      p?.brand?.id ||
      p?.diagnosisResult?.brandId ||
      p?.diagnosis?.brandId ||
      null;

    if (!brandId) {
      alert(
        "brandId를 확인할 수 없습니다. 기업진단 → 네이밍을 먼저 진행해 주세요.",
      );
      navigate("/diagnosisinterview");
      return;
    }

    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const nextSeed = mode === "regen" ? regenSeed + 1 : regenSeed;
      if (mode === "regen") setRegenSeed(nextSeed);

      const payload = {
        ...form,
        mode,
        regenSeed: nextSeed,
        questionnaire: {
          step: "concept",
          version: "concept_v1",
          locale: "ko-KR",
        },
      };

      const res = await apiRequest(`/brands/${brandId}/concept`, {
        method: "POST",
        data: payload,
      });

      const nextCandidates = normalizeConceptCandidates(res);

      if (!nextCandidates.length) {
        alert(
          "컨셉 제안을 받지 못했습니다. 백 응답 포맷(concept1~3 또는 candidates 배열)을 확인해주세요.",
        );
        setCandidates([]);
        setSelectedId(null);
        persistResult([], null, nextSeed);
        return;
      }

      setCandidates(nextCandidates);
      setSelectedId(null);
      persistResult(nextCandidates, null, nextSeed);
      showToast(
        "✅ 컨셉 컨설팅 제안 3가지가 도착했어요. 아래에서 확인하고 ‘선택’을 눌러주세요.",
      );
      window.setTimeout(() => scrollToResult(), 50);
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message || e?.userMessage || e?.message || "";

      console.warn("POST /brands/{brandId}/concept failed:", e);

      if (status === 401 || status === 403) {
        alert(
          status === 401
            ? "로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요."
            : "권한이 없습니다(403). 현재 로그인한 계정의 brandId가 아닐 수 있어요. 기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.",
        );
        return;
      }

      setAnalyzeError(`컨셉 생성에 실패했습니다: ${msg || "요청 실패"}`);
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

    const selectedConcept =
      selected?.title ||
      selected?.conceptTitle ||
      selected?.oneLiner ||
      selected?.summary ||
      selected?.oneLine ||
      "";

    if (!brandId) {
      alert("brandId를 확인할 수 없습니다. 기업진단을 다시 진행해 주세요.");
      return;
    }
    if (!String(selectedConcept).trim()) {
      alert("선택된 컨셉을 찾을 수 없습니다. 제안을 다시 선택해 주세요.");
      return;
    }

    try {
      await apiRequest(`/brands/${brandId}/concept/select`, {
        method: "POST",
        data: { selectedByUser: String(selectedConcept) },
      });
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message || e?.userMessage || e?.message || "";

      console.warn("POST /brands/{brandId}/concept/select failed:", e);

      if (status === 401 || status === 403) {
        alert(
          status === 401
            ? "로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요."
            : "권한이 없습니다(403). 보통 현재 로그인한 계정의 brandId가 아닌 값으로 요청할 때 발생합니다. 기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.",
        );
        return;
      }

      if (!String(msg).includes("컨셉")) {
        alert(`컨셉 선택 저장에 실패했습니다: ${msg || "요청 실패"}`);
        return;
      }
    }

    navigate(NEXT_PATH);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetAll = () => {
    const ok = window.confirm("입력/결과를 모두 초기화할까요?");
    if (!ok) return;

    try {
      userRemoveItem(STORAGE_KEY);
      userRemoveItem(RESULT_KEY);
      userRemoveItem(LEGACY_KEY);
    } catch {
      // ignore
    }

    try {
      clearStepsFrom("concept");
      setBrandFlowCurrent("concept");
    } catch {
      // ignore
    }

    const diag = (() => {
      try {
        return readDiagnosisForm();
      } catch {
        return null;
      }
    })();

    const base = { ...INITIAL_FORM };
    if (diag) {
      base.brandName = safeText(
        diag.companyName || diag.brandName || diag.projectName,
        "",
      );
      base.category = safeText(
        diag.industry || diag.category || diag.field,
        "",
      );
      base.stage = safeText(diag.stage, "");
      base.oneLine = safeText(
        diag.oneLine ||
          diag.companyIntro ||
          diag.intro ||
          diag.serviceIntro ||
          diag.shortIntro,
        "",
      );
      base.targetCustomer = safeText(
        diag.targetCustomer ||
          diag.target ||
          diag.customerTarget ||
          diag.primaryCustomer,
        "",
      );
      base.referenceLink = safeText(
        diag.website || diag.homepage || diag.siteUrl,
        "",
      );
    }

    setForm(base);
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
          <div className="diagInterview__titleRow">
            <div>
              <h1 className="diagInterview__title">컨셉 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                기업 진단에서 입력한 기본 정보는 자동 반영되며, 여기서는 브랜드
                컨셉/톤(가치·말투·아키타입·키메시지·신뢰·분위기)을 입력합니다.
              </p>
            </div>

            <div className="diagInterview__topActions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate("/brandconsulting")}
              >
                브랜드 컨설팅 홈
              </button>
            </div>
          </div>

          <ConsultingFlowPanel activeKey="concept" />

          <div className="diagInterview__grid">
            <section className="diagInterview__left">
              {/* 1) BASIC (자동 반영) */}
              <div className="card" ref={refBasic}>
                <div className="card__head">
                  <h2>1. 기본 정보 (자동 반영)</h2>
                  <p>
                    기업 진단&인터뷰에서 입력한 정보를 자동으로 불러옵니다. (이
                    페이지에서 수정하지 않아요)
                  </p>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>회사/프로젝트명</label>
                    <input
                      value={form.brandName}
                      disabled
                      placeholder="기업 진단에서 자동 반영"
                    />
                  </div>

                  <div className="field">
                    <label>산업/분야</label>
                    <input
                      value={form.category}
                      disabled
                      placeholder="기업 진단에서 자동 반영"
                    />
                  </div>

                  <div className="field">
                    <label>성장 단계</label>
                    <input
                      value={stageLabel(form.stage)}
                      disabled
                      placeholder="기업 진단에서 자동 반영"
                    />
                  </div>

                  <div className="field">
                    <label>웹사이트/소개 링크</label>
                    <input
                      value={form.referenceLink}
                      disabled
                      placeholder="기업 진단에서 자동 반영"
                    />
                  </div>
                </div>

                {String(form.targetCustomer || "").trim() ? (
                  <div className="field">
                    <label>타깃(진단 기준)</label>
                    <input value={form.targetCustomer} disabled />
                  </div>
                ) : null}

                <div className="field">
                  <label>회사/서비스 한 줄 소개</label>
                  <textarea
                    value={form.oneLine}
                    disabled
                    placeholder="기업 진단에서 자동 반영"
                    rows={3}
                  />
                </div>
              </div>

              {/* 2) Step 3. 브랜드 컨셉/톤 */}
              <div className="card" ref={refConcept}>
                <div className="card__head">
                  <h2>2. 브랜드 컨셉/톤 (Concept)</h2>
                  <p>
                    브랜드의 중심 가치, 말투, 성격(아키타입)을 정하고
                    메시지/신뢰/분위기를 정리합니다.
                  </p>
                </div>

                <div className="field">
                  <label>
                    절대 포기할 수 없는 가치 2가지{" "}
                    <span className="req">*</span>
                  </label>
                  <div className="hint" style={{ marginTop: 6 }}>
                    최대 2개까지 선택되도록 저장됩니다.
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.core_values}
                      options={CORE_VALUE_OPTIONS}
                      max={2}
                      onChange={(next) => setValue("core_values", next)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>
                    고객에게 말 건다면 말투 <span className="req">*</span>
                  </label>
                  <div className="hint" style={{ marginTop: 6 }}>
                    여러 개 선택 가능 (추천: 1~2개)
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.brand_voice}
                      options={BRAND_VOICE_OPTIONS}
                      onChange={(next) => setValue("brand_voice", next)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>
                    브랜드 성격(아키타입) <span className="req">*</span>
                  </label>
                  <div className="hint" style={{ marginTop: 6 }}>
                    여러 개 선택 가능 (추천: 1개를 대표로)
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.brand_archetype}
                      options={ARCHETYPE_OPTIONS}
                      onChange={(next) => setValue("brand_archetype", next)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>
                    고객이 기억해야 할 한 문장(키 메시지){" "}
                    <span className="req">*</span>
                  </label>
                  <input
                    value={form.key_message}
                    onChange={(e) => setValue("key_message", e.target.value)}
                    placeholder="예) 우리는 당신의 결정을 더 빠르고 확실하게 만듭니다."
                  />
                </div>

                <div className="field">
                  <label>
                    고객을 안심시키는 근거(신뢰 포인트){" "}
                    <span className="req">*</span>
                  </label>
                  <input
                    value={form.trust_factors}
                    onChange={(e) => setValue("trust_factors", e.target.value)}
                    placeholder="예) 실제 데이터 기반 추천 / 검증된 파트너 / 성과 지표"
                  />
                </div>

                <div className="field">
                  <label>
                    브랜드 전체 분위기(시각/심리) <span className="req">*</span>
                  </label>
                  <input
                    value={form.concept_vibe}
                    onChange={(e) => setValue("concept_vibe", e.target.value)}
                    placeholder="예) 미니멀, 차분, 선명, 고급스러움, 따뜻함"
                  />
                </div>

                <div className="field">
                  <label>슬로건에 들어갈 핵심 단어(선택)</label>
                  <input
                    value={form.slogan_keywords}
                    onChange={(e) =>
                      setValue("slogan_keywords", e.target.value)
                    }
                    placeholder="예) 신뢰 / 실행 / 성장 / 단순"
                  />
                </div>
              </div>

              {/* 3) NOTES */}
              <div className="card" ref={refNotes}>
                <div className="card__head">
                  <h2>3. 추가 요청 (선택)</h2>
                  <p>
                    추가로 반영하고 싶은 조건이나 강조 포인트가 있으면
                    적어주세요.
                  </p>
                </div>

                <div className="field">
                  <label>추가 메모</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 너무 과장되지 않게, 1~2문장으로 짧고 선명하게"
                    rows={5}
                  />
                </div>
              </div>

              {/* 결과 영역 */}
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
                    <h2>컨셉 제안 생성 중</h2>
                    <p>입력 내용을 바탕으로 제안 3가지를 만들고 있어요.</p>
                  </div>
                  <div className="hint">잠시만 기다려주세요…</div>
                </div>
              ) : hasResult ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>컨셉 컨설팅 제안 3가지</h2>
                    <p>제안 1개를 선택하면 다음 단계로 진행할 수 있어요.</p>
                  </div>

                  <div className="candidateList">
                    {candidates.map((c, idx) => {
                      const isSelected = selectedId === c.id;

                      const title = safeText(c?.title, "");
                      const summary = safeText(c?.summary, "");
                      const oneLine = safeText(c?.oneLine, "");
                      const slogan = safeText(c?.slogan, "");
                      const keyMessage = safeText(c?.keyMessage, "");
                      const note = safeText(c?.note, "");
                      const keywords = Array.isArray(c?.keywords)
                        ? c.keywords.filter((x) => hasText(x))
                        : [];

                      const hasAnyContent =
                        hasText(title) ||
                        hasText(summary) ||
                        hasText(oneLine) ||
                        hasText(slogan) ||
                        hasText(keyMessage) ||
                        keywords.length > 0 ||
                        hasText(note);

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
                              <div className="candidateTitle">
                                {`컨설팅 제안 ${idx + 1}`}
                              </div>

                              {hasText(title) ? (
                                <div
                                  style={{
                                    marginTop: 8,
                                    opacity: 0.92,
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {title}
                                </div>
                              ) : null}

                              {/* ✅ 값이 있을 때만 노출 */}

                              {hasText(summary) ? (
                                <div
                                  style={{
                                    marginTop: 8,
                                    opacity: 0.92,
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {summary}
                                </div>
                              ) : null}

                              {hasText(oneLine) ? (
                                <div
                                  style={{
                                    marginTop: 8,
                                    opacity: 0.9,
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {oneLine}
                                </div>
                              ) : null}

                              {hasText(slogan) ? (
                                <div
                                  style={{
                                    marginTop: 10,
                                    fontSize: 13,
                                    fontWeight: 800,
                                    opacity: 0.95,
                                  }}
                                >
                                  “{slogan}”
                                </div>
                              ) : null}

                              {hasText(keyMessage) ? (
                                <div
                                  style={{
                                    marginTop: 10,
                                    fontSize: 13,
                                    opacity: 0.92,
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {keyMessage}
                                </div>
                              ) : null}

                              {keywords.length ? (
                                <div
                                  style={{
                                    marginTop: 10,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 6,
                                  }}
                                >
                                  {keywords.map((kw) => (
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
                              ) : null}

                              {hasText(note) ? (
                                <div
                                  style={{
                                    marginTop: 10,
                                    fontSize: 12,
                                    opacity: 0.8,
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {note}
                                </div>
                              ) : null}

                              {/* ✅ 아무 내용도 없으면(타이틀만 내려온 경우) 추가 라인은 아예 없음 */}
                              {!hasAnyContent ? null : null}
                            </div>

                            <span className="candidateBadge">
                              {isSelected ? "선택됨" : "제안"}
                            </span>
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
                      ? "✅ 사이드 카드에서 ‘스토리 단계로 이동’ 버튼을 눌러주세요."
                      : "* 제안 1개를 선택하면 사이드 카드에 다음 단계 버튼이 표시됩니다."}
                  </div>
                </div>
              ) : null}
            </section>

            {/* ✅ 오른쪽: 진행률 */}
            <aside className="diagInterview__right">
              <div className="sideCard">
                <ConsultingFlowMini activeKey="concept" />

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
                  <div className="sideMeta__row">
                    <span className="k">단계</span>
                    <span className="v">{stageLabel(form.stage)}</span>
                  </div>
                </div>

                {saveMsg ? <p className="saveMsg">{saveMsg}</p> : null}

                <div className="divider" />

                <h4 className="sideSubTitle">빠른 작업</h4>

                <button
                  type="button"
                  className={`btn primary ${canAnalyze && !analyzing ? "" : "disabled"}`}
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
                      : "AI 분석 요청"}
                </button>

                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleResetAll}
                  style={{ width: "100%" }}
                >
                  전체 초기화
                </button>

                {!canAnalyze ? (
                  <p className="hint" style={{ marginTop: 10 }}>
                    * 필수 항목을 채우면 분석 버튼이 활성화됩니다.
                  </p>
                ) : null}

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
                    스토리 단계로 이동
                  </button>
                ) : (
                  <p className="hint" style={{ marginTop: 10 }}>
                    * 제안 1개를 선택하면 다음 단계 버튼이 표시됩니다.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
