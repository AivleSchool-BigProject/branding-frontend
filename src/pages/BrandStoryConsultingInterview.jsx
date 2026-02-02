// src/pages/BrandStoryConsultingInterview.jsx
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
  resetBrandConsultingToDiagnosisStart,
  setStepResult,
  clearStepsFrom,
  readPipeline,
} from "../utils/brandPipelineStorage.js";

// ✅ 백 연동(이미 프로젝트에 존재하는 클라이언트 사용)
import { apiRequest } from "../api/client.js";

const STORAGE_KEY = "brandStoryConsultingInterviewDraft_v1";
const RESULT_KEY = "brandStoryConsultingInterviewResult_v1";
const LEGACY_KEY = "brandInterview_story_v1";
const NEXT_PATH = "/brand/logo/interview";

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

const STORY_PLOT_OPTIONS = ["문제 해결형", "비전 제시형", "탄생 신화형"];
const STORY_EMOTION_OPTIONS = ["안도감", "호기심"];

function generateStoryCandidates(form, seed = 0) {
  const companyName = safeText(form?.companyName, "우리");
  const industry = safeText(form?.industry, "분야");
  const stage = stageLabel(form?.stage);
  const target = safeText(form?.targetCustomer, "고객");
  const oneLine = safeText(form?.oneLine, "");

  const founding = safeText(form?.founding_story, "");
  const transformation = safeText(form?.customer_transformation, "");
  const mission = safeText(form?.brand_mission, "");
  const conflict = safeText(form?.customer_conflict, "");
  const ultimate = safeText(form?.ultimate_goal, "");

  const plots = Array.isArray(form?.story_plot) ? form.story_plot : [];
  const emotions = Array.isArray(form?.story_emotion) ? form.story_emotion : [];

  const pick = (arr, idx) => arr[(idx + seed) % arr.length];

  const hooks = [
    "왜 좋은 선택이 늘 어려울까요?",
    "고객의 하루는 늘 방해물로 가득합니다.",
    "우리는 ‘당연한 불편’을 당연하게 넘기지 않았습니다.",
    "작은 결핍이 큰 포기로 이어지는 순간이 있습니다.",
  ];

  const endings = [
    "우리는 오늘도 고객이 더 쉽게, 더 확신 있게 앞으로 나아가도록 돕습니다.",
    "우리는 고객이 멈추는 지점에서 다시 움직이게 만드는 브랜드가 되겠습니다.",
    "우리는 더 나은 내일을 ‘실행 가능한 이야기’로 만들겠습니다.",
  ];

  const baseMeta = () => ({
    oneLiner: oneLine
      ? `“${oneLine}”`
      : `“${ultimate || mission || "브랜드 스토리"}”`,
    meta: `${industry} · ${stage} · 타깃: ${target}`,
    emotions: emotions.length ? emotions : ["안도감"],
  });

  const buildStory = (plotType) => {
    const hook = pick(hooks, 0);
    const end = pick(endings, 1);

    const pFounding = founding
      ? `【창업 계기】\n${founding}`
      : `【창업 계기】\n시작은 작은 질문에서 출발했습니다. “${hook}”`;

    const pConflict = conflict
      ? `【고객의 결핍/방해물】\n${conflict}`
      : `【고객의 결핍/방해물】\n${target}은(는) 중요한 순간에 ‘정보/시간/확신’의 결핍으로 흔들립니다.`;

    const pTransform = transformation
      ? `【사용 전/후 변화】\n${transformation}`
      : `【사용 전/후 변화】\n사용 전에는 고민이 길어지고 실행이 끊기지만, 사용 후에는 선택이 빨라지고 실행이 이어집니다.`;

    const pMission = mission
      ? `【미션】\n${mission}`
      : `【미션】\n우리는 수익을 넘어, 고객이 더 나은 결정을 내리고 지속적으로 성장하도록 돕고자 합니다.`;

    const pUltimate = ultimate
      ? `【궁극적 목표】\n${ultimate}`
      : `【궁극적 목표】\n우리는 ‘더 쉽고 더 신뢰할 수 있는 선택’이 당연한 세상을 만들고자 합니다.`;

    const emoLine = `【자극하고 싶은 감정】 ${(emotions.length
      ? emotions
      : ["안도감"]
    ).join(" · ")}`;

    if (plotType === "문제 해결형") {
      return {
        plot: plotType,
        story: [
          `【훅】 ${hook}`,
          pConflict,
          pFounding,
          pTransform,
          pMission,
          pUltimate,
          emoLine,
          `【마무리】 ${end}`,
        ].join("\n\n"),
        ending: end,
      };
    }

    if (plotType === "비전 제시형") {
      return {
        plot: plotType,
        story: [
          `【훅】 우리가 꿈꾸는 미래는 분명합니다.`,
          pUltimate,
          pMission,
          pConflict,
          pTransform,
          pFounding,
          emoLine,
          `【마무리】 ${end}`,
        ].join("\n\n"),
        ending: end,
      };
    }

    return {
      plot: plotType,
      story: [
        `【훅】 이 이야기는 ‘왜 시작했는가’에서 시작합니다.`,
        pFounding,
        pMission,
        pConflict,
        pTransform,
        pUltimate,
        emoLine,
        `【마무리】 ${end}`,
      ].join("\n\n"),
      ending: end,
    };
  };

  const plotPool = plots.length ? plots : STORY_PLOT_OPTIONS;

  const p1 = pick(plotPool, 0);
  const p2 = pick(plotPool, 1);
  const p3 = pick(plotPool, 2);

  const mk = (id, name, plotType, variantSeed) => {
    const { plot, story, ending } = buildStory(plotType);
    const meta = baseMeta();

    const keywords = Array.from(
      new Set([
        industry,
        stage,
        plot,
        ...(meta.emotions || []),
        "스토리",
        "브랜드",
        companyName,
      ]),
    ).slice(0, 10);

    const altHook = pick(hooks, variantSeed);
    const altEnd = pick(endings, variantSeed);

    const story2 =
      variantSeed === 0
        ? story
        : story.replace(/【훅】.*\n?/m, (m) =>
            m.replace(/【훅】.*/, `【훅】 ${altHook}`),
          );

    return {
      id,
      name,
      oneLiner: meta.oneLiner,
      meta: meta.meta,
      plot,
      emotions: meta.emotions,
      story: story2,
      ending: variantSeed === 0 ? ending : altEnd,
      keywords,
    };
  };

  return [
    mk("story_1", "A · 문제 해결형", p1, 0),
    mk("story_2", "B · 비전 제시형", p2, 1),
    mk("story_3", "C · 탄생 신화형", p3, 2),
  ];
}

const INITIAL_FORM = {
  companyName: "",
  industry: "",
  stage: "",
  website: "",
  oneLine: "",
  targetCustomer: "",

  founding_story: "",
  customer_transformation: "",
  brand_mission: "",
  story_plot: [],
  customer_conflict: "",
  story_emotion: [],
  ultimate_goal: "",

  notes: "",
};

/** ======================
 *  백 응답 후보 normalize (스토리)
 *  - 백이 어떤 포맷을 주더라도 UI에서 쓰기 쉽게 3안 형태로 맞춤
 *  - 현재 백(Mock): { story1, story2, story3 }
 *  ====================== */
function normalizeStoryCandidates(raw, form = {}) {
  const payload = raw?.data ?? raw?.result ?? raw;

  const pickStr = (v) => (typeof v === "string" ? v.trim() : "");
  const tryKeys = (obj, keys) => {
    for (const k of keys) {
      const v = pickStr(obj?.[k]);
      if (v) return v;
    }
    return "";
  };

  // ✅ 케이스 0) { story1, story2, story3 }
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const values = ["story1", "story2", "story3"]
      .map((k) => pickStr(payload?.[k]))
      .filter(Boolean);

    if (values.length) {
      const metaParts = [
        safeText(form?.industry, ""),
        stageLabel(form?.stage),
        safeText(form?.targetCustomer, ""),
      ].filter((v) => v && v !== "-");

      const meta = metaParts.join(" · ");
      const emotions = Array.isArray(form?.story_emotion)
        ? form.story_emotion
        : [];
      const plot = safeText(form?.story_plot, "") || "-";

      return values.slice(0, 3).map((story, idx) => {
        const firstLine =
          story
            .split("\n")
            .find((ln) => ln.trim())
            ?.trim() || story;
        return {
          id: `story_${idx + 1}`,
          name: `안 ${idx + 1}`,
          oneLiner:
            firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine,
          meta,
          story,
          plot,
          emotions,
          ending: "-",
          keywords: [],
          raw: story,
        };
      });
    }
  }

  // ✅ 케이스 1) 배열 / candidates 배열
  const list = Array.isArray(payload)
    ? payload
    : payload?.candidates ||
      payload?.stories ||
      payload?.data?.candidates ||
      payload?.result?.candidates;

  if (!Array.isArray(list)) return [];

  // ["스토리1","스토리2"] 형태
  if (list.length && typeof list[0] === "string") {
    return list.slice(0, 3).map((story, idx) => ({
      id: `story_${idx + 1}`,
      name: `안 ${idx + 1}`,
      oneLiner: story.length > 60 ? `${story.slice(0, 60)}…` : story,
      meta: "",
      story,
      plot: "-",
      emotions: [],
      ending: "-",
      keywords: [],
      raw: story,
    }));
  }

  // 객체 배열(유연 대응)
  return list.slice(0, 3).map((item, idx) => {
    const id = item?.id || item?.candidateId || `story_${idx + 1}`;
    const story =
      pickStr(item?.story) ||
      pickStr(item?.text) ||
      pickStr(item?.content) ||
      pickStr(item?.value) ||
      tryKeys(item, ["story1", "story2", "story3"]) ||
      "";

    const firstLine =
      story
        .split("\n")
        .find((ln) => ln.trim())
        ?.trim() || story;

    return {
      id,
      name: item?.name || item?.title || `안 ${idx + 1}`,
      oneLiner:
        item?.oneLiner ||
        (firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine),
      meta: item?.meta || "",
      story,
      plot: item?.plot || "-",
      emotions: Array.isArray(item?.emotions) ? item.emotions : [],
      ending: item?.ending || "-",
      keywords: Array.isArray(item?.keywords) ? item.keywords : [],
      raw: story,
    };
  });
}
export default function BrandStoryConsultingInterview({ onLogout }) {
  const navigate = useNavigate();

  // ✅ Strict Flow 가드(스토리 단계) + 이탈/새로고침 처리
  useEffect(() => {
    try {
      const hadPending = consumeBrandFlowPendingAbort();
      if (hadPending) {
        try {
          resetBrandConsultingToDiagnosisStart("interrupted");
        } catch {
          // ignore
        }

        window.alert(
          "브랜드 컨설팅이 중단되었습니다. 기업진단부터 다시 진행해주세요.",
        );
        navigate("/diagnosis", { replace: true });
        return;
      }
    } catch {
      // ignore
    }

    const guard = ensureStrictStepAccess("story");
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
      setBrandFlowCurrent("story");
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

  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  const [form, setForm] = useState(INITIAL_FORM);

  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");

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
  const [expandedCandidates, setExpandedCandidates] = useState({});
  const [regenSeed, setRegenSeed] = useState(0);
  const refResult = useRef(null);

  const requiredKeys = useMemo(
    () => [
      "founding_story",
      "customer_transformation",
      "brand_mission",
      "story_plot",
      "customer_conflict",
      "story_emotion",
      "ultimate_goal",
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

  const shouldShowMore = (text) => {
    const t = String(text || "").trim();
    if (!t) return false;
    const lines = t.split("\n").filter(Boolean);
    return t.length > 220 || lines.length > 6;
  };

  const toggleExpanded = (id) => {
    setExpandedCandidates((prev) => ({ ...prev, [id]: !prev?.[id] }));
  };

  // draft 로드
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

          if (
            !String(next.founding_story || "").trim() &&
            String(loaded.originStory || "").trim()
          ) {
            next.founding_story = loaded.originStory;
          }
          if (
            !String(next.customer_conflict || "").trim() &&
            String(loaded.problemStory || "").trim()
          ) {
            next.customer_conflict = loaded.problemStory;
          }
          if (
            !String(next.customer_transformation || "").trim() &&
            String(loaded.solutionStory || "").trim()
          ) {
            next.customer_transformation = loaded.solutionStory;
          }
          if (
            !String(next.ultimate_goal || "").trim() &&
            String(loaded.goal || "").trim()
          ) {
            next.ultimate_goal = loaded.goal;
          }
          if (
            !String(next.brand_mission || "").trim() &&
            String(loaded.brandCore || "").trim()
          ) {
            next.brand_mission = loaded.brandCore;
          }

          return next;
        });
      }
      if (parsed?.updatedAt) {
        const d = new Date(parsed.updatedAt);
        if (!Number.isNaN(d.getTime())) setLastSaved(d.toLocaleString());
      }
    } catch {}
  }, []);

  // 기업진단 자동 반영
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
    } catch {}
  }, []);

  // 결과 로드
  useEffect(() => {
    try {
      const raw = userGetItem(RESULT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.candidates)) setCandidates(parsed.candidates);
      if (parsed?.selectedId) setSelectedId(parsed.selectedId);
      if (typeof parsed?.regenSeed === "number") setRegenSeed(parsed.regenSeed);
    } catch {}
  }, []);

  // 자동 저장
  useEffect(() => {
    setSaveMsg("");
    const t = setTimeout(() => {
      try {
        const payload = { form, updatedAt: Date.now() };
        userSetItem(STORAGE_KEY, JSON.stringify(payload));
        setLastSaved(new Date(payload.updatedAt).toLocaleString());
        setSaveMsg("자동 저장됨");
      } catch {}
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
    } catch {}

    // legacy 저장
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
    } catch {}

    // ✅ pipeline 저장 + 이후 단계 초기화(스토리가 바뀌면 로고는 무효)
    try {
      const selected =
        nextCandidates.find((c) => c.id === nextSelectedId) || null;
      setStepResult("story", {
        candidates: nextCandidates,
        selectedId: nextSelectedId,
        selected,
        regenSeed: nextSeed,
        updatedAt,
      });
      clearStepsFrom("logo");
    } catch {
      // ignore
    }
  };

  const handleGenerateCandidates = async (mode = "generate") => {
    setAnalyzeError("");

    // 🔌 BACKEND 연동: 스토리 생성
    // - POST /brands/{brandId}/story
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
        "brandId를 확인할 수 없습니다. 기업진단/이전 단계를 다시 진행해 주세요.",
      );
      return;
    }

    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const nextSeed = mode === "regen" ? regenSeed + 1 : regenSeed;
      if (mode === "regen") setRegenSeed(nextSeed);

      const payload = {
        ...form,
        step: "story",
        mode,
        regenSeed: nextSeed,
      };

      const raw = await apiRequest(`/brands/${brandId}/story`, {
        method: "POST",
        data: payload,
      });

      const nextCandidates = normalizeStoryCandidates(raw, form);

      if (!nextCandidates.length) {
        alert("스토리 후보를 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setCandidates(nextCandidates);
      setSelectedId(null);
      persistResult(nextCandidates, null, nextSeed);
      showToast(
        "✅ 스토리 후보 3안이 도착했어요. 아래에서 확인하고 ‘선택’을 눌러주세요.",
      );
      window.setTimeout(() => scrollToResult(), 50);
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message ||
        e?.userMessage ||
        e?.message ||
        "요청 실패";

      console.warn("POST /brands/{brandId}/story failed:", e);

      if (status === 401) {
        alert("로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요.");
        return;
      }
      if (status === 403) {
        alert(
          "권한이 없습니다(403). 보통 현재 로그인한 계정의 brandId가 아닌 값으로 요청할 때 발생합니다. 기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.",
        );
        return;
      }

      // ✅ 백이 '스토리 단계가 아닙니다'를 내려주는 경우가 많아 안내 강화
      if (String(msg).includes("스토리 단계")) {
        alert(
          `스토리 생성이 거절되었습니다: ${msg}

컨셉 단계에서 '선택'을 완료한 뒤 다시 시도해 주세요.`,
        );
        return;
      }

      setAnalyzeError(`스토리 생성에 실패했습니다: ${msg}`);
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

    // ✅ 선택한 스토리를 백에 저장(스토리 -> 로고 단계로 이동)
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

    const selectedStory = selected?.raw || selected?.story || "";

    if (!brandId) {
      alert(
        "brandId를 확인할 수 없습니다. 기업진단/이전 단계를 다시 진행해 주세요.",
      );
      return;
    }
    if (!String(selectedStory).trim()) {
      alert("선택된 스토리를 찾을 수 없습니다. 후보를 다시 선택해 주세요.");
      return;
    }

    try {
      await apiRequest(`/brands/${brandId}/story/select`, {
        method: "POST",
        data: { selectedByUser: String(selectedStory) },
      });
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message || e?.userMessage || e?.message || "";

      console.warn("POST /brands/{brandId}/story/select failed:", e);

      if (status === 401 || status === 403) {
        alert(
          status === 401
            ? "로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요."
            : "권한이 없습니다(403). 보통 현재 로그인한 계정의 brandId가 아닌 값으로 요청할 때 발생합니다. 기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.",
        );
        return;
      }

      // 이미 단계가 넘어간 경우(예: 재진입)에는 다음으로 진행 허용
      if (!String(msg).includes("스토리 단계")) {
        alert(`스토리 선택 저장에 실패했습니다: ${msg || "요청 실패"}`);
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
    } catch {}

    // ✅ pipeline에서도 현재 단계(스토리)부터 초기화
    try {
      clearStepsFrom("story");
      setBrandFlowCurrent("story");
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
    <div className="diagInterview consultingInterview brandStoryInterview">
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
                기업 진단에서 입력한 기본 정보는 자동 반영되며, 여기서는 브랜드
                스토리(계기·갈등·전환·미션·플롯·감정·궁극 목표)를 입력합니다.
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

          <ConsultingFlowPanel activeKey="story" />

          <div className="diagInterview__grid">
            <section className="diagInterview__left">
              {/* 1) BASIC */}
              <div className="card">
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

              {/* 2) MATERIAL */}
              <div className="card">
                <div className="card__head">
                  <h2>2. 스토리 재료</h2>
                  <p>
                    스토리의 사실/재료를 먼저 채우면, 플롯에 맞게 문장이
                    깔끔해져요.
                  </p>
                </div>

                <div className="field">
                  <label>
                    창업 계기/사건 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.founding_story}
                    onChange={(e) => setValue("founding_story", e.target.value)}
                    placeholder="어떤 사건/불편/계기로 시작했나요?"
                    rows={5}
                  />
                </div>

                <div className="field">
                  <label>
                    고객이 겪는 가장 큰 결핍/방해물{" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.customer_conflict}
                    onChange={(e) =>
                      setValue("customer_conflict", e.target.value)
                    }
                    placeholder="고객이 지금 막히는 지점은 무엇인가요?"
                    rows={5}
                  />
                </div>

                <div className="field">
                  <label>
                    사용 전/후 고객의 변화 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.customer_transformation}
                    onChange={(e) =>
                      setValue("customer_transformation", e.target.value)
                    }
                    placeholder="사용 전에는 어떤 상태였고, 사용 후에는 무엇이 달라지나요?"
                    rows={5}
                  />
                </div>
              </div>

              {/* 3) STYLE */}
              <div className="card">
                <div className="card__head">
                  <h2>3. 원하는 플롯/감정</h2>
                  <p>선택한 유형을 우선 반영해 후보를 만들어요.</p>
                </div>

                <div className="field">
                  <label>
                    원하는 스토리텔링 스타일 <span className="req">*</span>
                  </label>
                  <div className="hint" style={{ marginTop: 6 }}>
                    여러 개 선택 가능
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.story_plot}
                      options={STORY_PLOT_OPTIONS}
                      onChange={(next) => setValue("story_plot", next)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>
                    스토리로 자극하고 싶은 감정 <span className="req">*</span>
                  </label>
                  <div className="hint" style={{ marginTop: 6 }}>
                    여러 개 선택 가능
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.story_emotion}
                      options={STORY_EMOTION_OPTIONS}
                      onChange={(next) => setValue("story_emotion", next)}
                    />
                  </div>
                </div>
              </div>

              {/* 4) VISION */}
              <div className="card">
                <div className="card__head">
                  <h2>4. 미션/궁극적 목표</h2>
                </div>

                <div className="field">
                  <label>
                    수익 외에 세상에 기여하려는 바(미션){" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.brand_mission}
                    onChange={(e) => setValue("brand_mission", e.target.value)}
                    placeholder="예) 누구나 더 쉽게, 더 확신 있게 결정할 수 있도록 돕는다"
                    rows={5}
                  />
                </div>

                <div className="field">
                  <label>
                    궁극적으로 만들고 싶은 세상의 모습{" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.ultimate_goal}
                    onChange={(e) => setValue("ultimate_goal", e.target.value)}
                    placeholder="예) 좋은 선택이 정보 격차에 의해 좌우되지 않는 세상"
                    rows={5}
                  />
                </div>
              </div>

              {/* 5) NOTES */}
              <div className="card">
                <div className="card__head">
                  <h2>5. 추가 요청 (선택)</h2>
                </div>

                <div className="field">
                  <label>추가 메모</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 랜딩페이지용으로 6~8문장 버전 + 2문장 요약도 같이"
                    rows={4}
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
                    <h2>스토리 후보 생성 중</h2>
                    <p>입력 내용을 바탕으로 후보 3안을 만들고 있어요.</p>
                  </div>
                  <div className="hint">잠시만 기다려주세요…</div>
                </div>
              ) : hasResult ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>스토리 후보 3안</h2>
                    <p>후보 1개를 선택하면 다음 단계로 진행할 수 있어요.</p>
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
                              <div style={{ marginTop: 6, opacity: 0.9 }}>
                                {c.oneLiner}
                              </div>
                              <div
                                style={{
                                  marginTop: 6,
                                  opacity: 0.8,
                                  fontSize: 12,
                                }}
                              >
                                {c.meta}
                              </div>
                            </div>
                            <span className="candidateBadge">
                              {isSelected ? "선택됨" : "후보"}
                            </span>
                          </div>

                          <div>
                            <div
                              className={`candidateBody ${expandedCandidates?.[c.id] ? "expanded" : "clamped"}`}
                            >
                              {c.story}
                            </div>

                            {shouldShowMore(c.story) ? (
                              <button
                                type="button"
                                className="candidateMore"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpanded(c.id);
                                }}
                              >
                                {expandedCandidates?.[c.id]
                                  ? "접기"
                                  : "더 보기"}
                              </button>
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
                      ? "✅ 사이드 카드에서 ‘로고 단계로 이동’ 버튼을 눌러주세요."
                      : "* 후보 1개를 선택하면 사이드 카드에 다음 단계 버튼이 표시됩니다."}
                  </div>
                </div>
              ) : null}
            </section>

            {/* 오른쪽 사이드 카드 */}
            <aside className="diagInterview__right">
              <div className="sideCard">
                <ConsultingFlowMini activeKey="story" />

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
                    로고 단계로 이동
                  </button>
                ) : (
                  <p className="hint" style={{ marginTop: 10 }}>
                    * 후보 1개를 선택하면 다음 단계 버튼이 표시됩니다.
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
