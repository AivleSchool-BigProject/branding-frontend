// src/pages/LogoConsultingInterview.jsx
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
  completeBrandFlow,
} from "../utils/brandPipelineStorage.js";

import {
  addBrandReport,
  createBrandReportSnapshot,
} from "../utils/reportHistory.js";

const STORAGE_KEY = "logoConsultingInterviewDraft_v1";
const RESULT_KEY = "logoConsultingInterviewResult_v1";
const LEGACY_KEY = "brandInterview_logo_v1";

const DIAG_KEYS = ["diagnosisInterviewDraft_v1", "diagnosisInterviewDraft"];

function safeText(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
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
      // 마지막 선택 기준으로 1개만 유지
      next = [opt];
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

const LOGO_STRUCTURE_OPTIONS = ["심볼형", "워드마크형", "콤비네이션"];
const BRAND_COLOR_OPTIONS = ["블루/네이비", "블랙/화이트"];
const DESIGN_STYLE_OPTIONS = ["플랫/미니멀", "3D/그라디언트"];
const VISUAL_TEXT_RATIO_OPTIONS = ["이미지 중심", "텍스트 중심", "균형"];

function generateLogoCandidates(form, seed = 0) {
  const companyName = safeText(form?.companyName, "브랜드");
  const industry = safeText(form?.industry, "분야");
  const stage = stageLabel(form?.stage);
  const target = safeText(form?.targetCustomer, "고객");
  const oneLine = safeText(form?.oneLine, "");

  const structure = Array.isArray(form?.logo_structure)
    ? form.logo_structure
    : [];
  const colors = Array.isArray(form?.brand_color) ? form.brand_color : [];
  const styles = Array.isArray(form?.design_style) ? form.design_style : [];
  const ratioArr = Array.isArray(form?.visual_text_ratio)
    ? form.visual_text_ratio
    : [];
  const ratio = ratioArr[0] || "";
  const motif = safeText(form?.visual_motif, "");
  const usage = safeText(form?.primary_usage, "");
  const ref = safeText(form?.design_reference, "");

  const pick = (arr, idx) => arr[(idx + seed) % arr.length];

  const paletteByChoice = () => {
    const p = [];
    if (colors.includes("블루/네이비"))
      p.push(["네이비", "블루", "화이트", "그레이"]);
    if (colors.includes("블랙/화이트"))
      p.push(["블랙", "오프화이트", "차콜", "그레이"]);
    if (!p.length) p.push(["네이비", "화이트", "그레이"]);
    return pick(p, 0);
  };

  const structureLine = () => {
    if (!structure.length) return "콤비네이션(심볼+워드)";
    return structure.join(" · ");
  };

  const styleLine = () => {
    if (!styles.length) return "플랫/미니멀";
    return styles.join(" · ");
  };

  const ratioGuide = () => {
    if (ratio === "이미지 중심") return "심볼 비중을 높이고, 워드는 서브로";
    if (ratio === "텍스트 중심") return "워드마크 가독성 최우선, 심볼은 보조";
    return "심볼/워드 비중을 균형 있게";
  };

  const motifGuide = motif
    ? `모티프: “${motif}”를 단순화해 상징으로 연결`
    : "모티프: (선택) 상징이 필요하면 1개만 정해서 단순화";

  const usageGuide = usage
    ? `사용처: ${usage} 기준으로 최소 크기(16~24px)에서도 식별되게`
    : "사용처: (필수) 가장 많이 쓰일 곳 기준으로 가독/식별성 설계";

  const sharedChecks = [
    "앱 아이콘/파비콘에서 식별 가능한가?",
    "작게 써도 무너지지 않는가?",
    "흑백/단색 버전에서도 유지되는가?",
    "가로/세로 락업(배치) 확장이 가능한가?",
  ];

  const mk = (id, name, mood, extra) => ({
    id,
    name,
    summary: `${industry}(${stage})에서 ${target}에게 ‘${mood}’ 인상을 주는 로고 방향`,
    structure: structureLine(),
    palette: paletteByChoice(),
    style: styleLine(),
    ratio: ratio || "균형",
    motif: motif || "(선택) 없음",
    usage: usage || "(필수) 입력 필요",
    guidance: [
      `비중 가이드: ${ratioGuide()}`,
      motifGuide,
      usageGuide,
      ref
        ? `레퍼런스 반영: 제공한 레퍼런스 톤을 과하게 따라가지 않고, 핵심만 추출`
        : null,
    ].filter(Boolean),
    doDont: sharedChecks,
    rationale: oneLine
      ? `원라인(“${oneLine}”)과 결이 맞도록 ‘형태/색/비중’을 정리했습니다.`
      : `형태/색/비중을 먼저 고정하면, 이후 시안에서 흔들리지 않아요.`,
    ...extra,
  });

  const directionA = mk("logo_1", "A · 플랫/미니멀 기본안", "단정·신뢰", {
    focus: "여백/정렬/가독성 우선",
    typography: "산세리프(굵기 600~800) · 가독 우선",
    symbolIdea:
      structure.includes("심볼형") || structure.includes("콤비네이션")
        ? "기하학(원/사각) 기반 단순 심볼 + 여백 설계"
        : "워드마크 중심으로 자간/두께 최적화",
  });

  const directionB = mk("logo_2", "B · 테크/선명 강화안", "선명·기술감", {
    focus: "라인/그리드/정확한 비례",
    typography: "모노스페이스 또는 테크 산세리프 · 정확",
    symbolIdea: motif
      ? `모티프(${motif})를 라인/포인트로 추상화`
      : "방향성/성장(화살표/로드맵) 요소를 은근히 암시",
  });

  const directionC = mk(
    "logo_3",
    "C · 3D/그라디언트 포인트안",
    "확장·프리미엄",
    {
      focus: "디지털 환경(앱/썸네일)에서 존재감",
      typography: "산세리프(세미라운드) 또는 세리프(절제) · 프리미엄",
      symbolIdea: styles.includes("3D/그라디언트")
        ? "단순 형태 + 제한된 그라디언트(1~2개)로 깊이감"
        : "단색 기반 + 포인트 컬러만 제한적으로 사용",
    },
  );

  // 사용자가 스타일을 하나만 골랐다면, 후보를 그 방향으로 더 맞춰줌
  const onlyMinimal = styles.length === 1 && styles[0] === "플랫/미니멀";
  const only3D = styles.length === 1 && styles[0] === "3D/그라디언트";

  if (onlyMinimal) {
    directionC.focus = "과한 효과 없이, 단색/미니멀 확장(서브마크) 중심";
  }
  if (only3D) {
    directionA.focus = "그라디언트/입체감을 ‘절제’해서 브랜드 일관성 유지";
  }

  return [directionA, directionB, directionC];
}

const INITIAL_FORM = {
  // ✅ 기업 진단에서 자동 반영(편집 X)
  companyName: "",
  industry: "",
  stage: "",
  website: "",
  oneLine: "",
  targetCustomer: "",

  // ✅ Step 5. 로고 방향 (Visual)
  logo_structure: [], // multiple
  visual_motif: "", // short optional
  brand_color: [], // multiple
  design_style: [], // multiple
  design_reference: "", // long optional
  primary_usage: "", // short
  visual_text_ratio: [], // multiple(실제로는 1개 선택)

  // 선택 메모
  notes: "",
};

export default function LogoConsultingInterview({ onLogout }) {
  const navigate = useNavigate();

  // ✅ Strict Flow 가드(로고 단계) + 이탈/새로고침 처리
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

    const guard = ensureStrictStepAccess("logo");
    if (!guard.ok) {
      const msg =
        guard?.reason === "no_back"
          ? "이전 단계로는 돌아갈 수 없습니다. 현재 진행 중인 단계에서 계속 진행해 주세요."
          : "이전 단계를 먼저 완료해 주세요.";
      window.alert(msg);
      navigate(guard.redirectTo || "/brand/story", { replace: true });
      return;
    }

    try {
      setBrandFlowCurrent("logo");
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
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [regenSeed, setRegenSeed] = useState(0);
  const refResult = useRef(null);

  // 섹션 ref
  const refBasic = useRef(null);
  const refVisual = useRef(null);
  const refStyle = useRef(null);
  const refUsage = useRef(null);
  const refNotes = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "visual", label: "형태/모티프", ref: refVisual },
      { id: "style", label: "색/스타일", ref: refStyle },
      { id: "usage", label: "사용처/비중", ref: refUsage },
      { id: "notes", label: "추가 요청", ref: refNotes },
    ],
    [],
  );

  // ✅ 필수 항목(Step5 기준)
  const requiredKeys = useMemo(
    () => [
      "logo_structure",
      "brand_color",
      "design_style",
      "primary_usage",
      "visual_text_ratio",
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
  const canFinish = Boolean(hasResult && selectedId);

  const setValue = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToResult = () => {
    if (!refResult?.current) return;
    refResult.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ✅ draft 로드 (+ 구버전 최소 마이그레이션)
  useEffect(() => {
    try {
      const raw = userGetItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      const loaded =
        parsed?.form && typeof parsed.form === "object" ? parsed.form : null;

      if (loaded) {
        setForm((prev) => {
          const next = { ...prev, ...loaded };

          // 구버전 필드 -> Step5 필드로 최소 매핑
          // - logoType: symbol/wordmark/combo
          if (
            !Array.isArray(next.logo_structure) ||
            next.logo_structure.length === 0
          ) {
            const lt = String(loaded.logoType || "").trim();
            if (lt === "symbol") next.logo_structure = ["심볼형"];
            if (lt === "wordmark") next.logo_structure = ["워드마크형"];
            if (lt === "combo") next.logo_structure = ["콤비네이션"];
          }

          // - useCase -> primary_usage
          if (
            !String(next.primary_usage || "").trim() &&
            String(loaded.useCase || "").trim()
          ) {
            next.primary_usage = loaded.useCase;
          }

          // - references -> design_reference
          if (
            !String(next.design_reference || "").trim() &&
            String(loaded.references || "").trim()
          ) {
            next.design_reference = loaded.references;
          }

          return next;
        });
      }

      if (parsed?.updatedAt) {
        const d = new Date(parsed.updatedAt);
        if (!Number.isNaN(d.getTime())) setLastSaved(d.toLocaleString());
      }
    } catch {
      // ignore
    }
  }, []);

  // ✅ 기업 진단&인터뷰 값 자동 반영(중복 질문 제거)
  useEffect(() => {
    try {
      const diag = readDiagnosisForm();
      if (!diag) return;

      const next = {
        companyName: safeText(
          diag.companyName || diag.brandName || diag.projectName,
          "",
        ),
        industry: safeText(diag.industry || diag.category || diag.field, ""),
        stage: safeText(diag.stage, ""),
        website: safeText(diag.website || diag.homepage || diag.siteUrl, ""),
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
      };

      setForm((prev) => ({
        ...prev,
        companyName: next.companyName || prev.companyName,
        industry: next.industry || prev.industry,
        stage: next.stage || prev.stage,
        website: next.website || prev.website,
        oneLine: next.oneLine || prev.oneLine,
        targetCustomer: next.targetCustomer || prev.targetCustomer,
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

    // ✅ pipeline 저장(로고 단계 결과)
    try {
      const selected =
        nextCandidates.find((c) => c.id === nextSelectedId) || null;
      setStepResult("logo", {
        candidates: nextCandidates,
        selectedId: nextSelectedId,
        selected,
        regenSeed: nextSeed,
        updatedAt,
      });
    } catch {
      // ignore
    }
  };

  const handleGenerateCandidates = async (mode = "generate") => {
    // 🔌 BACKEND 연동 포인트 (로고 컨설팅 - AI 분석 요청 버튼)
    // - 백엔드 연동 시(명세서 기준):
    //   A) 인터뷰 저장(공통): POST /brands/interview
    //   B) 로고 가이드:     POST /brands/logo (또는 유사)
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 요청이 가능합니다.");
      return;
    }

    setAnalyzing(true);
    try {
      const nextSeed = mode === "regen" ? regenSeed + 1 : regenSeed;
      if (mode === "regen") setRegenSeed(nextSeed);

      await new Promise((r) => setTimeout(r, 450));
      const nextCandidates = generateLogoCandidates(form, nextSeed);

      setCandidates(nextCandidates);
      setSelectedId(null);
      persistResult(nextCandidates, null, nextSeed);
      scrollToResult();
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectCandidate = (id) => {
    setSelectedId(id);
    persistResult(candidates, id, regenSeed);
  };

  const handleFinish = () => {
    try {
      // ✅ 완료 시점의 결과 스냅샷을 히스토리에 저장(카드가 쌓이는 구조)
      addBrandReport(createBrandReportSnapshot());
    } catch {
      // ignore
    }
    try {
      completeBrandFlow();
    } catch {
      // ignore
    }
    navigate("/mypage");
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

    // ✅ pipeline에서도 현재 단계(로고) 초기화
    try {
      clearStepsFrom("logo");
      setBrandFlowCurrent("logo");
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
      base.companyName = safeText(
        diag.companyName || diag.brandName || diag.projectName,
        "",
      );
      base.industry = safeText(
        diag.industry || diag.category || diag.field,
        "",
      );
      base.stage = safeText(diag.stage, "");
      base.website = safeText(
        diag.website || diag.homepage || diag.siteUrl,
        "",
      );
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
              <h1 className="diagInterview__title">로고 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                기업 진단에서 입력한 기본 정보는 자동 반영되며, 여기서는 로고
                방향(형태·색·스타일·사용처·이미지/텍스트 비중)을 입력합니다.
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

          <ConsultingFlowPanel activeKey="logo" />

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
                      value={form.companyName}
                      disabled
                      placeholder="기업 진단에서 자동 반영"
                    />
                  </div>

                  <div className="field">
                    <label>산업/분야</label>
                    <input
                      value={form.industry}
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
                      value={form.website}
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
                  <label>회사/서비스 소개</label>
                  <textarea
                    value={form.oneLine}
                    disabled
                    placeholder="기업 진단에서 자동 반영"
                    rows={3}
                  />
                </div>
              </div>

              {/* 2) VISUAL */}
              <div className="card" ref={refVisual}>
                <div className="card__head">
                  <h2>2. 로고 형태</h2>
                  <p>로고 구성(심볼/워드/조합)과 모티프를 정리합니다.</p>
                </div>

                <div className="field">
                  <label>
                    원하는 로고 형태 <span className="req">*</span>
                  </label>
                  <div className="hint" style={{ marginTop: 6 }}>
                    여러 개 선택 가능 (실제로는 1~2개 정도가 현실적이에요)
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.logo_structure}
                      options={LOGO_STRUCTURE_OPTIONS}
                      onChange={(next) => setValue("logo_structure", next)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>형상화 모티프(선택)</label>
                  <input
                    value={form.visual_motif}
                    onChange={(e) => setValue("visual_motif", e.target.value)}
                    placeholder="예) 나침반, 지도 핀, 방패, 체크, 성장 그래프 등"
                  />
                </div>
              </div>

              {/* 3) STYLE */}
              <div className="card" ref={refStyle}>
                <div className="card__head">
                  <h2>3. 색상/스타일</h2>
                  <p>대표 색상과 선호 스타일을 선택합니다.</p>
                </div>

                <div className="field">
                  <label>
                    대표 색상 <span className="req">*</span>
                  </label>
                  <div className="hint" style={{ marginTop: 6 }}>
                    여러 개 선택 가능
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.brand_color}
                      options={BRAND_COLOR_OPTIONS}
                      onChange={(next) => setValue("brand_color", next)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>
                    선호 디자인 스타일 <span className="req">*</span>
                  </label>
                  <div className="hint" style={{ marginTop: 6 }}>
                    여러 개 선택 가능
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.design_style}
                      options={DESIGN_STYLE_OPTIONS}
                      onChange={(next) => setValue("design_style", next)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>좋아하는 로고 레퍼런스 + 이유(선택)</label>
                  <textarea
                    value={form.design_reference}
                    onChange={(e) =>
                      setValue("design_reference", e.target.value)
                    }
                    placeholder="링크/브랜드명 + 어떤 점이 좋은지(가독, 고급, 친근, 상징성 등)"
                    rows={4}
                  />
                </div>
              </div>

              {/* 4) USAGE */}
              <div className="card" ref={refUsage}>
                <div className="card__head">
                  <h2>4. 사용처/비중</h2>
                  <p>
                    로고를 어디에 가장 많이 쓰는지와 이미지/텍스트 비중을
                    정합니다.
                  </p>
                </div>

                <div className="field">
                  <label>
                    로고가 가장 많이 쓰일 곳 <span className="req">*</span>
                  </label>
                  <input
                    value={form.primary_usage}
                    onChange={(e) => setValue("primary_usage", e.target.value)}
                    placeholder="예) 앱 아이콘/파비콘, 웹 헤더, 명함, IR/피치덱, 썸네일 등"
                  />
                </div>

                <div className="field">
                  <label>
                    이미지 vs 텍스트 중요도 <span className="req">*</span>
                  </label>
                  <div className="hint" style={{ marginTop: 6 }}>
                    1개만 선택
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.visual_text_ratio}
                      options={VISUAL_TEXT_RATIO_OPTIONS}
                      max={1}
                      onChange={(next) => setValue("visual_text_ratio", next)}
                    />
                  </div>
                </div>
              </div>

              {/* 5) NOTES */}
              <div className="card" ref={refNotes}>
                <div className="card__head">
                  <h2>5. 추가 요청 (선택)</h2>
                  <p>
                    필요한 버전(단색/가로/세로/아이콘) 등 요청이 있으면
                    적어주세요.
                  </p>
                </div>

                <div className="field">
                  <label>추가 메모</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 단색 버전 필수, 심볼만/워드만 버전도 필요, 너무 귀엽지 않게"
                    rows={4}
                  />
                </div>
              </div>

              {/* 결과 영역 */}
              <div ref={refResult} />

              {analyzing ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>로고 방향 후보 생성 중</h2>
                    <p>입력 내용을 바탕으로 후보 3안을 만들고 있어요.</p>
                  </div>
                  <div className="hint">잠시만 기다려주세요…</div>
                </div>
              ) : hasResult ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>로고 방향 후보 3안</h2>
                    <p>
                      후보 1개를 선택하면 결과 히스토리로 이동할 수 있어요.
                      (현재는 더미 생성)
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {candidates.map((c) => {
                      const isSelected = selectedId === c.id;
                      return (
                        <div
                          key={c.id}
                          style={{
                            borderRadius: 16,
                            padding: 14,
                            border: isSelected
                              ? "1px solid rgba(99,102,241,0.45)"
                              : "1px solid rgba(0,0,0,0.08)",
                            boxShadow: isSelected
                              ? "0 12px 30px rgba(99,102,241,0.10)"
                              : "none",
                            background: "rgba(255,255,255,0.6)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 900, fontSize: 15 }}>
                                {c.name}
                              </div>
                              <div style={{ marginTop: 6, opacity: 0.9 }}>
                                {c.summary}
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: isSelected
                                  ? "rgba(99,102,241,0.12)"
                                  : "rgba(0,0,0,0.04)",
                                border: isSelected
                                  ? "1px solid rgba(99,102,241,0.25)"
                                  : "1px solid rgba(0,0,0,0.06)",
                                color: "rgba(0,0,0,0.75)",
                                height: "fit-content",
                              }}
                            >
                              {isSelected ? "선택됨" : "후보"}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 13,
                              opacity: 0.92,
                              lineHeight: 1.55,
                            }}
                          >
                            <div>
                              <b>형태</b> · {c.structure}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>모티프</b> · {c.motif}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>색상 팔레트</b> ·{" "}
                              {Array.isArray(c.palette)
                                ? c.palette.join(" / ")
                                : String(c.palette)}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>스타일</b> · {c.style}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>비중</b> · {c.ratio}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>사용처</b> · {c.usage}
                            </div>

                            <div style={{ marginTop: 10 }}>
                              <b>가이드</b>
                              <ul style={{ margin: "6px 0 0 18px" }}>
                                {(c.guidance || []).map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </div>

                            <div style={{ marginTop: 10 }}>
                              <b>사용성 체크</b>
                              <ul style={{ margin: "6px 0 0 18px" }}>
                                {(c.doDont || []).map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </div>

                            <div style={{ marginTop: 10, opacity: 0.9 }}>
                              <b>근거</b> · {c.rationale}
                            </div>
                          </div>

                          <div
                            style={{ marginTop: 12, display: "flex", gap: 8 }}
                          >
                            <button
                              type="button"
                              className={`btn primary ${isSelected ? "disabled" : ""}`}
                              disabled={isSelected}
                              onClick={() => handleSelectCandidate(c.id)}
                            >
                              {isSelected ? "선택 완료" : "이 방향 선택"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
                    {canFinish
                      ? "✅ 사이드 카드에서 ‘완료(히스토리로)’ 버튼을 눌러주세요."
                      : "* 후보 1개를 선택하면 사이드 카드에 완료 버튼이 표시됩니다."}
                  </div>
                </div>
              ) : null}
            </section>

            {/* ✅ 오른쪽: 진행률 */}
            <aside className="diagInterview__right">
              <div className="sideCard">
                <ConsultingFlowMini activeKey="logo" />

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

                <div className="divider" />

                <h4 className="sideSubTitle">마무리</h4>
                {canFinish ? (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleFinish}
                    style={{ width: "100%" }}
                  >
                    완료(히스토리로)
                  </button>
                ) : (
                  <p className="hint" style={{ marginTop: 10 }}>
                    * 후보 1개를 선택하면 완료 버튼이 표시됩니다.
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
