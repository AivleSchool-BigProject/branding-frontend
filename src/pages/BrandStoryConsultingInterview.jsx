// src/pages/BrandStoryConsultingInterview.jsx
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
  userGetItem,
  userSetItem,
  userRemoveItem,
} from "../utils/userLocalStorage.js";

import {
  ensureStrictStepAccess,
  migrateLegacyToPipelineIfNeeded,
  setBrandFlowCurrent,
  setStepResult,
  clearStepsFrom,
  readPipeline,
  startBrandFlow,
} from "../utils/brandPipelineStorage.js";

// ✅ 백 연동(이미 프로젝트에 존재하는 클라이언트 사용)
import { apiRequest, apiRequestAI } from "../api/client.js";

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

/** ✅ multiple 선택용 칩 UI (value는 배열) */
function MultiChips({ value, options, onChange, max = null }) {
  const current = Array.isArray(value) ? value : [];

  const normOpt = (opt) => {
    if (typeof opt === "string") return { value: opt, label: opt };
    return {
      value: opt?.value,
      label: opt?.label ?? opt?.text ?? String(opt?.value ?? ""),
    };
  };

  const toggle = (optRaw) => {
    const opt = normOpt(optRaw);
    if (!opt.value) return;

    const exists = current.includes(opt.value);
    let next = exists
      ? current.filter((x) => x !== opt.value)
      : [...current, opt.value];

    if (typeof max === "number" && max > 0 && next.length > max) {
      // ✅ 최대 선택 수를 넘으면 "마지막으로 누른 것"이 들어가도록 유지
      const last = opt.value;
      next = next.filter((x) => x !== last);
      next = [...next.slice(0, Math.max(0, max - 1)), last];
    }
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((optRaw) => {
        const opt = normOpt(optRaw);
        const active = current.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(optRaw)}
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
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const STORY_PLOT_OPTIONS = [
  {
    id: "plot_problem",
    text: "문제 해결형",
    value: "Problem-Solution",
    description: "고객의 문제를 발견하고 해결책을 제시하는 구조",
    example: "많은 사람들이 OO 때문에 고통받았다 → 우리가 XX로 해결했다",
  },
  {
    id: "plot_vision",
    text: "비전 제시형",
    value: "Visionary",
    description: "미래의 더 나은 세상을 제시하는 구조",
    example: "우리는 OO한 세상을 꿈꾼다 → 함께 만들어가자",
  },
  {
    id: "plot_hero",
    text: "영웅의 여정형",
    value: "Hero's Journey",
    description: "도전과 성장의 과정을 담은 구조",
    example: "작은 시작 → 시련 극복 → 변화 창출",
  },
  {
    id: "plot_myth",
    text: "탄생 신화형",
    value: "Founding Myth",
    description: "브랜드가 어떻게 탄생했는지 신화처럼 풀어내는 구조",
    example: "한 사람의 작은 아이디어가 세상을 바꾸기 시작했다",
  },
  {
    id: "plot_other",
    text: "기타",
    value: "Other",
    has_text_input: true,
    text_input_placeholder: "원하는 스토리 구조를 설명해주세요",
  },
];

const STORY_EMOTION_OPTIONS = [
  {
    id: "emo_relief",
    text: "안도감",
    value: "Relief",
    description: "이제 걱정 안 해도 된다는 느낌",
  },
  {
    id: "emo_curiosity",
    text: "호기심",
    value: "Curiosity",
    description: "더 알고 싶고 경험해보고 싶은 느낌",
  },
  {
    id: "emo_excitement",
    text: "설렘",
    value: "Excitement",
    description: "새로운 가능성에 대한 기대",
  },
  {
    id: "emo_empowerment",
    text: "자신감",
    value: "Empowerment",
    description: "나도 할 수 있다는 힘",
  },
  {
    id: "emo_belonging",
    text: "소속감",
    value: "Belonging",
    description: "우리는 연결되어 있다는 느낌",
  },
  {
    id: "emo_nostalgia",
    text: "향수",
    value: "Nostalgia",
    description: "따뜻한 과거를 떠올리는 감정",
  },
  {
    id: "emo_other",
    text: "기타",
    value: "Other",
    has_text_input: true,
    text_input_placeholder: "자극하고 싶은 감정을 설명해주세요",
  },
];

const PLOT_LABEL = Object.fromEntries(
  STORY_PLOT_OPTIONS.map((o) => [o.value, o.text]),
);
const EMO_LABEL = Object.fromEntries(
  STORY_EMOTION_OPTIONS.map((o) => [o.value, o.text]),
);

function plotLabelValue(plotValue, plotOther) {
  if (plotValue === "Other") {
    const t = safeText(plotOther, "");
    return t ? `기타(${t})` : "기타";
  }
  return PLOT_LABEL[plotValue] || safeText(plotValue, "-");
}

function emotionLabels(values, otherText) {
  const list = Array.isArray(values) ? values : [];
  const mapped = list.map((v) =>
    v === "Other"
      ? safeText(otherText)
        ? `기타(${safeText(otherText)})`
        : "기타"
      : EMO_LABEL[v] || v,
  );
  return mapped.filter(Boolean);
}

function generateStoryCandidates(form, seed = 0) {
  const companyName = safeText(form?.companyName, "우리");
  const industry = safeText(form?.industry, "분야");
  const stage = stageLabel(form?.stage);
  const target = safeText(form?.targetCustomer, "고객");
  const oneLine = safeText(form?.oneLine, "");

  const founding = safeText(form?.founding_story, "");
  const transformation = safeText(form?.customer_transformation, "");
  const aha = safeText(form?.aha_moment, "");
  const mission = safeText(form?.brand_mission, "");
  const conflict = safeText(form?.customer_conflict, "");
  const ultimate = safeText(form?.ultimate_goal, "");

  const founderPersonality = safeText(form?.founder_personality, "");
  const flagshipCase = safeText(form?.flagship_case, "");

  const plotValue = safeText(form?.story_plot, "");
  const plotOther = safeText(form?.story_plot_other, "");
  const plotLabel = plotLabelValue(plotValue, plotOther);

  const emoValues = Array.isArray(form?.story_emotion)
    ? form.story_emotion
    : [];
  const emoOther = safeText(form?.story_emotion_other, "");
  const emotions = emotionLabels(emoValues, emoOther);

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
    plot: plotLabel || "-",
  });

  const block = (title, content, fallback) => {
    const c = safeText(content, "");
    return c ? `【${title}】\n${c}` : `【${title}】\n${fallback}`;
  };

  const buildStory = (plotTypeValue, variantSeed = 0) => {
    const hook = pick(hooks, variantSeed);
    const end = pick(endings, variantSeed);

    const pFounding = block(
      "창업 계기",
      founding,
      `시작은 작은 질문에서 출발했습니다. “${hook}”`,
    );
    const pConflict = block(
      "고객의 결핍/방해물",
      conflict,
      `${target}은(는) 중요한 순간에 ‘정보/시간/확신’의 결핍으로 흔들립니다.`,
    );
    const pTransform = block(
      "사용 전/후 변화",
      transformation,
      `사용 전에는 고민이 길어지고 실행이 끊기지만, 사용 후에는 선택이 빨라지고 실행이 이어집니다.`,
    );
    const pAha = block(
      "감탄의 순간",
      aha,
      `고객이 “와, 이렇게 간단할 수가!”라고 느끼는 순간을 만들어냅니다.`,
    );
    const pMission = block(
      "미션",
      mission,
      `우리는 수익을 넘어, 고객이 더 나은 결정을 내리고 지속적으로 성장하도록 돕고자 합니다.`,
    );
    const pUltimate = block(
      "궁극적 목표",
      ultimate,
      `우리는 ‘더 쉽고 더 신뢰할 수 있는 선택’이 당연한 세상을 만들고자 합니다.`,
    );

    const pFounder = founderPersonality
      ? `【팀/창업자 성격】\n${founderPersonality}`
      : "";

    const pCase = flagshipCase ? `【대표 고객 사례】\n${flagshipCase}` : "";

    const emoLine = `【자극하고 싶은 감정】 ${(emotions.length ? emotions : ["안도감"]).join(" · ")}`;
    const plotLine = `【스토리 구조】 ${plotLabel || plotTypeValue || "-"}`;

    // ✅ 4가지 플롯 지원
    if (plotTypeValue === "Problem-Solution") {
      return {
        plot: plotLabel,
        story: [
          `【훅】 ${hook}`,
          plotLine,
          pConflict,
          pFounding,
          pTransform,
          pAha,
          pMission,
          pUltimate,
          pFounder,
          pCase,
          emoLine,
          `【마무리】 ${end}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        ending: end,
      };
    }

    if (plotTypeValue === "Visionary") {
      return {
        plot: plotLabel,
        story: [
          `【훅】 우리가 꿈꾸는 미래는 분명합니다.`,
          plotLine,
          pUltimate,
          pMission,
          pConflict,
          pTransform,
          pAha,
          pFounding,
          pFounder,
          pCase,
          emoLine,
          `【마무리】 ${end}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        ending: end,
      };
    }

    if (plotTypeValue === "Hero's Journey") {
      return {
        plot: plotLabel,
        story: [
          `【훅】 이 이야기는 ‘도전 → 변화 → 새로운 일상’의 여정입니다.`,
          plotLine,
          `【부름(문제의 등장)】\n${safeText(conflict, `${target}은(는) 중요한 순간마다 방해물에 부딪힙니다.`)}`,
          `【시련(해결의 탐색)】\n${safeText(founding, `우리는 그 불편을 외면하지 않고 끝까지 파고들었습니다.`)}`,
          `【변화(전환점)】\n${safeText(transformation, `사용 전에는 망설임이 길었지만, 사용 후에는 확신이 생깁니다.`)}`,
          `【감탄(결정적 순간)】\n${safeText(aha, `고객이 “이제 됐다”라고 느끼는 순간이 생깁니다.`)}`,
          pMission,
          pUltimate,
          pFounder,
          pCase,
          emoLine,
          `【마무리】 ${end}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        ending: end,
      };
    }

    // Founding Myth / Other
    return {
      plot: plotLabel,
      story: [
        `【훅】 이 이야기는 ‘왜 시작했는가’에서 시작합니다.`,
        plotLine,
        pFounding,
        pMission,
        pConflict,
        pTransform,
        pAha,
        pUltimate,
        pFounder,
        pCase,
        emoLine,
        `【마무리】 ${end}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      ending: end,
    };
  };

  const base = baseMeta();
  const plotToUse = plotValue || "Founding Myth";

  const mk = (id, name, variantSeed) => {
    const { story, ending } = buildStory(plotToUse, variantSeed);

    const keywords = Array.from(
      new Set([
        industry,
        stage,
        base.plot,
        ...(base.emotions || []),
        "스토리",
        "브랜드",
        companyName,
      ]),
    ).slice(0, 10);

    // oneLiner는 첫 문장(또는 훅) 기반으로
    const firstLine =
      story
        .split("\n")
        .find((ln) => ln.trim() && !ln.trim().startsWith("【")) // 첫 일반 문장 우선
        ?.trim() ||
      story
        .split("\n")
        .find((ln) => ln.trim())
        ?.trim() ||
      "";

    return {
      id,
      name,
      oneLiner:
        firstLine.length > 60
          ? `${firstLine.slice(0, 60)}…`
          : base.oneLiner || firstLine,
      meta: base.meta,
      plot: base.plot,
      emotions: base.emotions,
      story,
      ending,
      keywords,
      raw: story,
    };
  };

  // ✅ 3안은 같은 플롯에서 문장/구성만 다르게(변형 seed)
  return [
    mk("story_1", `A · ${plotLabel || "스토리"} 1안`, 0),
    mk("story_2", `B · ${plotLabel || "스토리"} 2안`, 1),
    mk("story_3", `C · ${plotLabel || "스토리"} 3안`, 2),
  ];
}

const INITIAL_FORM = {
  companyName: "",
  industry: "",
  stage: "",
  website: "",
  oneLine: "",
  targetCustomer: "",

  // Step 4 fields
  founding_story: "",
  customer_transformation: "",
  aha_moment: "",
  brand_mission: "",
  story_plot: "", // single_choice value
  story_plot_other: "",

  customer_conflict: "",
  story_emotion: [], // multiple_choice values (max 2)
  story_emotion_other: "",

  ultimate_goal: "",

  // optional
  founder_personality: "",
  flagship_case: "",

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

  const metaParts = [
    safeText(form?.industry, ""),
    stageLabel(form?.stage),
    safeText(form?.targetCustomer, ""),
  ].filter((v) => v && v !== "-");
  const meta = metaParts.join(" · ");

  const emotions = emotionLabels(
    form?.story_emotion,
    form?.story_emotion_other,
  );
  const plot = plotLabelValue(form?.story_plot, form?.story_plot_other) || "-";

  // ✅ 케이스 0) { story1, story2, story3 }
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const values = ["story1", "story2", "story3"]
      .map((k) => pickStr(payload?.[k]))
      .filter(Boolean);

    if (values.length) {
      return values.slice(0, 3).map((story, idx) => {
        const firstLine =
          story
            .split("\n")
            .find((ln) => ln.trim())
            ?.trim() || story;
        return {
          id: `story_${idx + 1}`,
          name: `컨설팅 제안 ${idx + 1}`,
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
      name: `컨설팅 제안 ${idx + 1}`,
      oneLiner: story.length > 60 ? `${story.slice(0, 60)}…` : story,
      meta,
      story,
      plot,
      emotions,
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
      name: item?.name || item?.title || `컨설팅 제안 ${idx + 1}`,
      oneLiner:
        item?.oneLiner ||
        (firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine),
      meta: item?.meta || meta,
      story,
      plot: item?.plot || plot,
      emotions: Array.isArray(item?.emotions) ? item.emotions : emotions,
      ending: item?.ending || "-",
      keywords: Array.isArray(item?.keywords) ? item.keywords : [],
      raw: story,
    };
  });
}

export default function BrandStoryConsultingInterview({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ (최우선) strict 접근 제어 + flow 현재 단계 고정(절대 뒤로가기 금지)
  useEffect(() => {
    try {
      migrateLegacyToPipelineIfNeeded();

      const access = ensureStrictStepAccess("story");
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
      setBrandFlowCurrent("story");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      "aha_moment",
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

          // legacy 매핑(이전 필드명 호환)
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

      const payload = { ...form, step: "story", mode, regenSeed: nextSeed };

      const raw = await apiRequestAI(`/brands/${brandId}/story`, {
        method: "POST",
        data: payload,
      });

      const nextCandidates = normalizeStoryCandidates(raw, form);

      // 백이 비어주면 로컬 후보 생성(보험)
      const fallbackCandidates = nextCandidates.length
        ? nextCandidates
        : generateStoryCandidates(form, nextSeed);

      if (!fallbackCandidates.length) {
        alert("스토리 제안을 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setCandidates(fallbackCandidates);
      setSelectedId(null);
      persistResult(fallbackCandidates, null, nextSeed);
      showToast(
        "✅ 스토리 컨설팅 제안 3가지가 도착했어요. 아래에서 확인하고 ‘선택’을 눌러주세요.",
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

    const p = readPipeline();
    const brandId =
      p?.brandId ||
      p?.brand?.id ||
      p?.diagnosisResult?.brandId ||
      p?.diagnosis?.brandId ||
      null;

    const selected = candidates.find((c) => c.id === selectedId) || null;
    const selectedStory = selected?.raw || selected?.story || "";

    if (!brandId) {
      alert(
        "brandId를 확인할 수 없습니다. 기업진단/이전 단계를 다시 진행해 주세요.",
      );
      return;
    }
    if (!String(selectedStory).trim()) {
      alert("선택된 스토리를 찾을 수 없습니다. 제안을 다시 선택해 주세요.");
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

      // 이미 단계가 넘어간 경우에는 다음 진행 허용
      if (!String(msg).includes("스토리 단계")) {
        alert(`스토리 선택 저장에 실패했습니다: ${msg || "요청 실패"}`);
        return;
      }
    }

    try {
      setBrandFlowCurrent("logo");
    } catch {
      // ignore
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

    try {
      clearStepsFrom("story");
      setBrandFlowCurrent("story");
    } catch {}

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

  // ✅ plot 선택 핸들러 (Other일 때 입력 유지)
  const selectPlot = (value) => {
    setForm((prev) => {
      const next = { ...prev, story_plot: value };
      if (value !== "Other") next.story_plot_other = "";
      return next;
    });
  };

  // ✅ emotion 선택 핸들러 (max 2는 MultiChips가 보장)
  const setEmotions = (next) => {
    setForm((prev) => {
      const hasOther = Array.isArray(next) && next.includes("Other");
      const updated = { ...prev, story_emotion: next };
      if (!hasOther) updated.story_emotion_other = "";
      return updated;
    });
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
                기업 진단에서 입력한 기본 정보는 자동 반영됩니다. 여기서는 Step
                4 질문지 기준으로 “계기·변화·감탄·미션·플롯·갈등·감정·궁극
                목표(선택: 팀 성격/사례)”를 입력합니다.
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

              {/* 2) Brand Story (Step 4) - Required */}
              <div className="card">
                <div className="card__head">
                  <h2>2. Brand Story 필수 질문</h2>
                  <p>
                    Step 4 질문지 기준(필수)입니다. 사실/재료가 구체적일수록
                    결과가 좋아요.
                  </p>
                </div>

                <div className="field">
                  <label>
                    창업자가 이 사업을 시작하게 된 결정적인 ‘계기’나 ‘사건’{" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.founding_story}
                    onChange={(e) => setValue("founding_story", e.target.value)}
                    placeholder="개인적인 경험, 문제 인식, 영감을 받은 순간 등을 구체적으로 작성해주세요"
                    rows={5}
                  />
                </div>

                <div className="field">
                  <label>
                    우리 서비스를 이용하기 전/후 고객의 삶은 어떻게 달라지나요?{" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.customer_transformation}
                    onChange={(e) =>
                      setValue("customer_transformation", e.target.value)
                    }
                    placeholder="구체적인 변화를 Before/After로 작성해주세요"
                    rows={5}
                  />
                </div>

                <div className="field">
                  <label>
                    고객이 우리만의 서비스를 이용하면서 감탄하는 순간은
                    언제인가요? <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.aha_moment}
                    onChange={(e) => setValue("aha_moment", e.target.value)}
                    placeholder="예: 첫 주문이 10분 만에 도착했을 때, 복잡한 작업이 클릭 한 번으로 해결되었을 때"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>
                    수익 창출 외에, 우리가 세상에 기여하고자 하는 것은
                    무엇인가요? <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.brand_mission}
                    onChange={(e) => setValue("brand_mission", e.target.value)}
                    placeholder="사회적 가치, 환경적 영향, 문화적 변화 등"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>
                    고객이 현재 겪고 있는 가장 큰 결핍이나 방해물은 무엇인가요?{" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.customer_conflict}
                    onChange={(e) =>
                      setValue("customer_conflict", e.target.value)
                    }
                    placeholder="시간 부족, 정보 과부하, 높은 비용, 복잡한 과정 등"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>
                    브랜드가 궁극적으로 만들고자 하는 세상의 모습은 무엇인가요?{" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.ultimate_goal}
                    onChange={(e) => setValue("ultimate_goal", e.target.value)}
                    placeholder="10년 후, 우리의 브랜드가 있는 세상은 어떻게 변해 있을까요?"
                    rows={4}
                  />
                </div>
              </div>

              {/* 3) story_plot (single choice) */}
              <div className="card">
                <div className="card__head">
                  <h2>3. 스토리텔링 구조 선택</h2>
                  <p>
                    Step 4 질문지 기준: 하나만 선택해 주세요. (기타 선택 시 직접
                    입력)
                  </p>
                </div>

                <div className="field">
                  <label>
                    어떤 스타일의 스토리텔링을 원하나요?{" "}
                    <span className="req">*</span>
                  </label>

                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {STORY_PLOT_OPTIONS.map((opt) => {
                      const selected = form.story_plot === opt.value;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className="btn"
                          onClick={() => selectPlot(opt.value)}
                          style={{
                            textAlign: "left",
                            padding: "12px 12px",
                            borderRadius: 12,
                            border: selected
                              ? "1px solid rgba(99,102,241,0.40)"
                              : "1px solid rgba(0,0,0,0.10)",
                            background: selected
                              ? "rgba(99,102,241,0.08)"
                              : "rgba(255,255,255,0.9)",
                            cursor: "pointer",
                          }}
                          aria-pressed={selected}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 999,
                                border: "2px solid rgba(0,0,0,0.35)",
                                background: selected
                                  ? "rgba(99,102,241,0.9)"
                                  : "transparent",
                                boxShadow: selected
                                  ? "0 0 0 3px rgba(99,102,241,0.15)"
                                  : "none",
                              }}
                            />
                            <div style={{ fontWeight: 900 }}>{opt.text}</div>
                          </div>

                          {opt.description ? (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                opacity: 0.8,
                              }}
                            >
                              {opt.description}
                            </div>
                          ) : null}
                          {opt.example ? (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                opacity: 0.75,
                              }}
                            >
                              <span style={{ fontWeight: 800 }}>예:</span>{" "}
                              {opt.example}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {form.story_plot === "Other" ? (
                    <div className="field" style={{ marginTop: 10 }}>
                      <label>기타(직접 입력)</label>
                      <input
                        value={form.story_plot_other}
                        onChange={(e) =>
                          setValue("story_plot_other", e.target.value)
                        }
                        placeholder="원하는 스토리 구조를 설명해주세요"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 4) story_emotion (multiple choice max 2) */}
              <div className="card">
                <div className="card__head">
                  <h2>4. 스토리 감정 선택</h2>
                  <p>
                    Step 4 질문지 기준: 최대 2개 선택(기타 선택 시 직접 입력)
                  </p>
                </div>

                <div className="field">
                  <label>
                    스토리를 통해 고객의 어떤 감정을 자극하고 싶나요? (최대 2개){" "}
                    <span className="req">*</span>
                  </label>

                  <div className="hint" style={{ marginTop: 6 }}>
                    2개를 넘기면 마지막으로 선택한 항목이 유지돼요.
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.story_emotion}
                      options={STORY_EMOTION_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.text,
                      }))}
                      onChange={setEmotions}
                      max={2}
                    />
                  </div>

                  {Array.isArray(form.story_emotion) &&
                  form.story_emotion.includes("Other") ? (
                    <div className="field" style={{ marginTop: 10 }}>
                      <label>기타(직접 입력)</label>
                      <input
                        value={form.story_emotion_other}
                        onChange={(e) =>
                          setValue("story_emotion_other", e.target.value)
                        }
                        placeholder="자극하고 싶은 감정을 설명해주세요"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 5) Optional */}
              <div className="card">
                <div className="card__head">
                  <h2>5. 선택 질문 & 추가 요청</h2>
                </div>

                <div className="field">
                  <label>창업자(또는 팀)의 성격/스타일 (선택)</label>
                  <textarea
                    value={form.founder_personality}
                    onChange={(e) =>
                      setValue("founder_personality", e.target.value)
                    }
                    placeholder="예: 집요하게 파고드는 엔지니어, 사람 얘기를 잘 들어주는 팀장 등"
                    rows={3}
                  />
                </div>

                <div className="field">
                  <label>기억에 남는 고객 사례 1개 (선택)</label>
                  <textarea
                    value={form.flagship_case}
                    onChange={(e) => setValue("flagship_case", e.target.value)}
                    placeholder="어떤 고객이었고, 어떤 문제가 있었으며, 우리 서비스를 통해 어떻게 달라졌는지"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>추가 메모 (선택)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 랜딩페이지용 6~8문장 버전 + 2문장 요약도 같이"
                    rows={3}
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
                    <h2>스토리 제안 생성 중</h2>
                    <p>입력 내용을 바탕으로 제안 3가지를 만들고 있어요.</p>
                  </div>
                  <div className="hint">잠시만 기다려주세요…</div>
                </div>
              ) : hasResult ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>스토리 컨설팅 제안 3가지</h2>
                    <p>제안 1개를 선택하면 다음 단계로 진행할 수 있어요.</p>
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
                              {c.plot ? (
                                <div
                                  style={{
                                    marginTop: 6,
                                    opacity: 0.75,
                                    fontSize: 12,
                                  }}
                                >
                                  <b>플롯:</b> {c.plot}
                                  {Array.isArray(c.emotions) &&
                                  c.emotions.length ? (
                                    <>
                                      {" "}
                                      · <b>감정:</b> {c.emotions.join(" · ")}
                                    </>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <span className="candidateBadge">
                              {isSelected ? "선택됨" : "제안"}
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
                      : "* 제안 1개를 선택하면 사이드 카드에 다음 단계 버튼이 표시됩니다."}
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
