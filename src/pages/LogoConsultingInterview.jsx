// src/pages/LogoConsultingInterview.jsx
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

// ✅ 파이프라인(단계 잠금/결과 저장)
import {
  ensureStrictStepAccess,
  migrateLegacyToPipelineIfNeeded,
  readPipeline,
  setStepResult,
  clearStepsFrom,
  getSelected,
  setBrandFlowCurrent,
  startBrandFlow,
  completeBrandFlow,
} from "../utils/brandPipelineStorage.js";

// ✅ 백 연동(이미 프로젝트에 존재하는 클라이언트 사용)
import { apiRequest, apiRequestAI } from "../api/client.js";

// 2026-02-06
// 컬러 피커 - react-colorful import
import { HexColorPicker } from "react-colorful";

import exNetflix from "../Image/logo_example_image/logo-Netflix.jpg";
import exdunkin from "../Image/logo_example_image/logo_dunkin.png";
import exBurgerKing from "../Image/logo_example_image/burgerking_logo.png";
import exNike from "../Image/logo_example_image/nike-logos-swoosh-white.jpg";
import exCocaCola from "../Image/logo_example_image/coca-cola-logo.webp";
import exHarley from "../Image/logo_example_image/logo_Harley.png";
import exNFL from "../Image/logo_example_image/logo_nfl.png";
import exSnapchat from "../Image/logo_example_image/logo_snapchat.png";

const STORAGE_KEY = "logoConsultingInterviewDraft_v1";
const RESULT_KEY = "logoConsultingInterviewResult_v1";
const LEGACY_KEY = "brandInterview_logo_v1";

// ✅ 마이페이지 로고 표시 fallback용(백 저장이 지연/누락될 때)
const SELECTED_LOGO_MAP_KEY = "selectedLogoUrlByBrand_v1";

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

function getStoredAccessToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isJwtExpired(token, skewSeconds = 30) {
  const payload = parseJwtPayload(token);
  const exp = payload?.exp;
  if (!exp) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= Number(exp) - Number(skewSeconds || 0);
}

function upsertSelectedLogoFallback(brandId, logoUrl) {
  const bid = String(brandId ?? "").trim();
  const url = String(logoUrl ?? "").trim();
  if (!bid || !url) return;

  try {
    const raw = userGetItem(SELECTED_LOGO_MAP_KEY);
    const parsed = safeParse(raw);
    const map =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    map[bid] = url;
    userSetItem(SELECTED_LOGO_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
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

function normalizeOpt(opt) {
  if (typeof opt === "string") return { value: opt, label: opt };
  return {
    value: opt?.value,
    label: opt?.label ?? opt?.text ?? String(opt?.value ?? ""),
  };
}

/** ✅ multiple 선택용 칩 UI (max 지원, options: string | {value,label/text}) */
function MultiChips({ value, options, onChange, max = null }) {
  const current = Array.isArray(value) ? value : [];

  const toggle = (optRaw) => {
    const opt = normalizeOpt(optRaw);
    if (!opt.value) return;

    const exists = current.includes(opt.value);
    let next = exists
      ? current.filter((x) => x !== opt.value)
      : [...current, opt.value];

    if (typeof max === "number" && max > 0 && next.length > max) {
      // 마지막으로 누른 값이 남도록 유지
      const last = opt.value;
      next = next.filter((x) => x !== last);
      next = [...next.slice(0, Math.max(0, max - 1)), last];
    }
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((optRaw) => {
        const opt = normalizeOpt(optRaw);
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

function ChoiceCard({ selected, title, desc, examples = [], onClick }) {
  const hasExamples = Array.isArray(examples) && examples.length > 0;
  const EX_COL_W = 220;

  return (
    <button
      type="button"
      className="btn"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: 16,
        border: selected
          ? "1px solid rgba(99,102,241,0.40)"
          : "1px solid rgba(0,0,0,0.10)",
        background: selected
          ? "rgba(99,102,241,0.06)"
          : "rgba(255,255,255,0.92)",
        cursor: "pointer",
        display: "block",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          justifyContent: "space-between",
          gap: 18,
          width: "100%",
        }}
      >
        {/* LEFT */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: "1 1 auto",
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              border: "2px solid rgba(0,0,0,0.35)",
              background: selected ? "rgba(99,102,241,0.9)" : "transparent",
              boxShadow: selected ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
              flex: "0 0 auto",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 12, lineHeight: 1.15 }}>
              {title}
            </div>
            {desc ? (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  opacity: 0.78,
                  lineHeight: 1.45,
                }}
              >
                {desc}
              </div>
            ) : null}
          </div>
        </div>

        {/* 오른쪽 */}
        {hasExamples ? (
          <div
            style={{
              width: EX_COL_W,
              flex: `0 0 ${EX_COL_W}px`,
              marginLeft: "auto",
              textAlign: "right",
            }}
          >
            {/* ✅ 썸네일 row 기준으로 라벨을 붙이기 위한 wrapper */}
            <div style={{ display: "inline-block" }}>
              {/* ✅ 라벨 + 썸네일을 같이 묶어서 "왼쪽 기준"을 동일하게 만든다 */}
              <div
                style={{
                  position: "relative", // ✅ 라벨 absolute 기준점
                  paddingTop: 18, // ✅ 라벨 자리 확보
                  display: "inline-block", // ✅ 내용(썸네일 2개) 폭만큼만 wrapper 폭이 잡힘
                }}
              >
                {/* ✅ 예시: 첫 썸네일 카드의 '정확한 왼쪽' */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0, // ✅ 이제 left=0이 "썸네일 묶음의 left"가 됨
                    fontSize: 12,
                    fontWeight: 900,
                    opacity: 0.6,
                    lineHeight: 1,
                    textAlign: "left",
                    pointerEvents: "none",
                  }}
                >
                  예시
                </div>

                {/* ✅ 썸네일 row */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  {examples.slice(0, 2).map((ex, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: 85,
                        height: 65,
                        borderRadius: 14,
                        border: "1px solid rgba(0,0,0,0.10)",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flex: "0 0 auto",
                      }}
                    >
                      <img
                        src={ex.src}
                        alt={ex.alt || "example"}
                        style={{
                          maxWidth: "82%",
                          maxHeight: "82%",
                          objectFit: "contain",
                        }}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                opacity: 0.55,
                textAlign: "right",
              }}
            >
              * 참고용 예시입니다.
            </div>
          </div>
        ) : null}
      </div>
    </button>
  );
}

// 2026-02-06
// 컬러 피커 추가
function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, x));
}

function normalizeHex(input, fallback = "#000000") {
  let s = String(input || "").trim();
  if (!s) return fallback;
  if (s[0] !== "#") s = "#" + s;
  // #RGB -> #RRGGBB
  if (/^#([0-9a-fA-F]{3})$/.test(s)) {
    const m = s.slice(1);
    s =
      "#" +
      m
        .split("")
        .map((c) => c + c)
        .join("");
  }
  if (!/^#([0-9a-fA-F]{6})$/.test(s)) return fallback;
  return s.toUpperCase();
}

/** ======================
 * ✅ “선택 사항 입력란 제거” 정책:
 * - 기타(Other) 옵션 삭제
 * - 조건부 입력(input_prompt) 삭제
 * - 선택(옵션) 텍스트 입력(추가 요청/피하고 싶은 방향) 제거
 * ====================== */

const LOGO_STRUCTURE_OPTIONS = [
  {
    id: "shape_symbol",
    text: "심볼형 (Symbol Only)",
    value: "Symbol Only",
    description: "이미지/아이콘만으로 구성",
  },
  {
    id: "shape_wordmark",
    text: "워드마크형 (Wordmark)",
    value: "Wordmark",
    description: "텍스트(브랜드명)만으로 구성",
  },
  {
    id: "shape_combination",
    text: "콤비네이션 (Combination)",
    value: "Combination",
    description: "심볼 + 텍스트 결합",
  },
  {
    id: "shape_emblem",
    text: "엠블럼형 (Emblem)",
    value: "Emblem",
    description: "텍스트가 심볼 안에 들어간 형태",
  },
];

const LOGO_EXAMPLES_BY_STRUCTURE = {
  "Symbol Only": [
    { src: exNike, alt: "Nike" },
    { src: exSnapchat, alt: "SnapChat" },
  ],
  Wordmark: [
    { src: exNetflix, alt: "Netflix" },
    { src: exCocaCola, alt: "Coca-Cola" },
  ],
  Combination: [
    { src: exdunkin, alt: "Dunkin" },
    { src: exBurgerKing, alt: "Burger King" },
  ],
  Emblem: [
    { src: exNFL, alt: "NFL" },
    { src: exHarley, alt: "Harley" },
  ],
};

const VISUAL_MOTIF_OPTIONS = [
  {
    id: "motif_object",
    text: "구체적인 사물",
    value: "Concrete Object",
    description: "동물, 식물, 도구 등 알아볼 수 있는 것",
  },
  {
    id: "motif_abstract",
    text: "추상적 개념",
    value: "Abstract Concept",
    description: "성장, 연결, 속도 등을 상징하는 이미지",
  },
  {
    id: "motif_geometric",
    text: "기하학적 도형",
    value: "Geometric Shape",
    description: "원, 삼각형, 선 등 단순한 도형",
  },
  {
    id: "motif_letter",
    text: "문자 조합",
    value: "Letter Based",
    description: "이니셜이나 글자를 활용한 디자인",
  },
  {
    id: "motif_none",
    text: "특정 이미지 없음 (AI 추천)",
    value: "None",
    description: "브랜드에 가장 잘 맞는 모티프를 AI가 제안",
  },
];

const DESIGN_STYLE_OPTIONS = [
  {
    id: "style_minimal",
    text: "플랫/미니멀",
    value: "Flat/Minimalist",
    description: "단순하고 깔끔한",
    visual_note: "2D, 단색, 여백",
  },
  {
    id: "style_3d",
    text: "3D/그라디언트",
    value: "3D/Gradient",
    description: "입체감과 깊이감",
    visual_note: "그림자, 그라데이션",
  },
  {
    id: "style_hand",
    text: "핸드메이드/일러스트",
    value: "Handmade/Illustrated",
    description: "따뜻하고 인간적인 손맛",
    visual_note: "손그림, 스케치",
  },
  {
    id: "style_geometric",
    text: "기하학적/테크",
    value: "Geometric/Tech",
    description: "정확하고 현대적인",
    visual_note: "선명 라인, 각진 형태",
  },
  {
    id: "style_vintage",
    text: "빈티지/레트로",
    value: "Vintage/Retro",
    description: "향수를 불러일으키는 클래식",
    visual_note: "텍스처, 레트로 폰트",
  },
  {
    id: "style_playful",
    text: "플레이풀/위트",
    value: "Playful/Witty",
    description: "재미있고 독특한",
    visual_note: "유니크, 장난스러움",
  },
];

const LOGO_FLEXIBILITY_OPTIONS = [
  {
    id: "flex_scalable",
    text: "축소 가능성",
    value: "Scalability",
    description: "작게 축소해도 알아볼 수 있어야 함",
  },
  {
    id: "flex_versatile",
    text: "배경 적응성",
    value: "Versatility",
    description: "다양한 배경색에서도 사용 가능",
  },
  {
    id: "flex_animated",
    text: "애니메이션 확장성",
    value: "Animation Potential",
    description: "움직이는 로고로 확장 가능",
  },
  {
    id: "flex_monochrome",
    text: "흑백 전환",
    value: "Monochrome Adaptability",
    description: "흑백에서도 효과적",
  },
  {
    id: "flex_memorable",
    text: "기억 용이성",
    value: "Memorability",
    description: "한번 보면 기억에 남음",
  },
];

const VISUAL_TEXT_RATIO_OPTIONS = [
  {
    id: "ratio_img",
    text: "이미지 중심 (70:30)",
    value: "Image Driven",
    description: "심볼이 강조되고 텍스트는 보조적",
  },
  {
    id: "ratio_bal",
    text: "균형 (50:50)",
    value: "Balanced",
    description: "이미지와 텍스트가 동등",
  },
  {
    id: "ratio_txt",
    text: "텍스트 중심 (70:30)",
    value: "Text Driven",
    description: "브랜드명이 강조되고 이미지는 보조적",
  },
];

const MAIN_USAGE_CHANNELS_OPTIONS = [
  {
    id: "channel_app_icon",
    text: "모바일 앱 아이콘",
    value: "Mobile App Icon",
    description: "작고 단순한 형태 중요",
  },
  {
    id: "channel_web_screen",
    text: "웹사이트·SaaS 화면",
    value: "Web/SaaS Screen",
    description: "헤더/사이드바/버튼 등 다양한 크기",
  },
  {
    id: "channel_offline_signage",
    text: "오프라인 간판·인쇄물",
    value: "Offline Signage/Print",
    description: "대형 간판/명함/포스터 등",
  },
  {
    id: "channel_product_packaging",
    text: "제품 패키지(포장)",
    value: "Product Packaging",
    description: "박스/라벨/용기 등",
  },
  {
    id: "channel_social_media",
    text: "SNS·콘텐츠(피드, 썸네일)",
    value: "Social Media/Content",
    description: "인스타/유튜브/썸네일 등",
  },
  {
    id: "channel_presentation_ir",
    text: "프레젠테이션·IR 자료",
    value: "Presentation/IR Materials",
    description: "피치덱/회사 소개 자료 등",
  },
];

const TYPOGRAPHY_STYLE_OPTIONS = [
  {
    id: "opt_modern_sans",
    text: "모던한 산세리프",
    value: "Modern Sans Serif",
    description: "깔끔, 현대적",
  },
  {
    id: "opt_classic_serif",
    text: "클래식한 세리프",
    value: "Classic Serif",
    description: "전통, 신뢰",
  },
  {
    id: "opt_handwriting",
    text: "손글씨/캘리그라피",
    value: "Handwriting/Calligraphy",
    description: "따뜻함, 인간적",
  },
  {
    id: "opt_geometric_tech",
    text: "기하학적/테크",
    value: "Geometric/Tech",
    description: "정확, 미래지향",
  },
];

/** ======================
 * ✅ 백 응답 후보 normalize (로고 3안 형태로 통일)
 * ====================== */
function normalizeLogoCandidates(raw) {
  const payload = raw?.data ?? raw?.result ?? raw;

  const readUrl = (v) => {
    if (typeof v === "string") return v.trim();
    if (v && typeof v === "object") {
      const cand =
        v.url ||
        v.imageUrl ||
        v.logoUrl ||
        v.logoImageUrl ||
        v.href ||
        v.src ||
        "";
      return typeof cand === "string" ? cand.trim() : "";
    }
    return "";
  };

  let list = Array.isArray(payload) ? payload : null;

  if (!list && payload && typeof payload === "object") {
    list = payload?.candidates || payload?.logos || payload?.data?.candidates;
  }

  if (!list && payload && typeof payload === "object") {
    const keys = ["logo1", "logo2", "logo3"];
    const picked = [];
    for (const k of keys) {
      const u = readUrl(payload?.[k]);
      if (u) picked.push(u);
    }
    list = picked;
  }

  if (!Array.isArray(list)) return [];

  const urls = list
    .map((x) => readUrl(x))
    .filter((x) => typeof x === "string" && x.length > 0)
    .slice(0, 3);

  return urls.map((url, idx) => {
    const n = idx + 1;
    return {
      id: `logo${n}`,
      name: `시안 ${n}`,
      imageUrl: url,
      url,
      summary: "AI가 생성한 로고 시안입니다.",
    };
  });
}

const INITIAL_FORM = {
  // ✅ 기업 진단에서 자동 반영(화면 노출 X)
  companyName: "",
  industry: "",
  stage: "",
  website: "",
  oneLine: "",
  targetCustomer: "",

  // ✅ step_5 질문지(입력란 최소화: 선택 중심, 기타/조건부 입력 제거)
  logo_structure: "", // single_choice
  visual_motif: "", // single_choice

  // 2026-02-06
  // 컬러 피커 추가 - 대표 색상
  brand_color_primary: "#3B7CF3",
  brand_color_secondary: "#0A2540",

  brand_color: [], // multiple_choice max 2
  design_style: "", // single_choice
  design_reference: "", // long_answer (required)
  logo_flexibility: [], // multiple_choice max 2
  visual_text_ratio: "", // single_choice
  main_usage_channels: [], // multiple_choice max 2
  typography_style: "", // single_choice required

  // ✅ 기존 키(호환/보험용) 유지
  primary_usage: "",
};

function optByValue(options, value) {
  return (
    (options || []).find((o) => String(o?.value) === String(value)) || null
  );
}

function joinUsageLabels(values) {
  const arr = Array.isArray(values) ? values : [];
  const labels = arr.map(
    (v) => optByValue(MAIN_USAGE_CHANNELS_OPTIONS, v)?.text || v,
  );
  return labels.filter(Boolean).join(", ");
}

export default function LogoConsultingInterview({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const REQUIRED_FIELD_ID = {
    logo_structure: "logo-q-logo_structure",
    visual_motif: "logo-q-visual_motif",
    brand_color: "logo-q-brand_color",
    design_style: "logo-q-design_style",
    design_reference: "logo-q-design_reference",
    logo_flexibility: "logo-q-logo_flexibility",
    visual_text_ratio: "logo-q-visual_text_ratio",
    main_usage_channels: "logo-q-main_usage_channels",
    typography_style: "logo-q-typography_style",
  };

  // ✅ (최우선) strict 접근 제어 + flow 현재 단계 고정(절대 뒤로가기 금지)
  useEffect(() => {
    try {
      migrateLegacyToPipelineIfNeeded();

      const access = ensureStrictStepAccess("logo");
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
      setBrandFlowCurrent("logo");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 섹션 ref (현재는 스크롤/확장용으로만 유지)
  const refLogo = useRef(null);
  const refMotif = useRef(null);
  const refColor = useRef(null);
  const refStyle = useRef(null);
  const refRef = useRef(null);
  const refFlex = useRef(null);
  const refRatio = useRef(null);
  const refUsage = useRef(null);
  const refType = useRef(null);

  // ✅ 필수 항목(step_5 기준)
  const requiredKeys = useMemo(
    () => [
      "logo_structure",
      "visual_motif",
      "brand_color",
      "design_style",
      "design_reference",
      "logo_flexibility",
      "visual_text_ratio",
      "main_usage_channels",
      "typography_style",
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
  const remainingRequired = Math.max(
    requiredKeys.length - completedRequired,
    0,
  );
  const hasResult = candidates.length > 0;
  const canFinish = Boolean(hasResult && selectedId);

  const requiredLabelMap = {
    logo_structure: "로고 형태",
    visual_motif: "비주얼 모티프",
    brand_color: "대표 색상",
    design_style: "디자인 스타일",
    design_reference: "로고 레퍼런스",
    logo_flexibility: "확장/유연성",
    visual_text_ratio: "이미지/텍스트 비율",
    main_usage_channels: "주요 사용 채널",
    typography_style: "타이포그래피 스타일",
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

          // ---- 구버전(배열/KR 값) -> step_5 형태로 최소 변환 ----
          // logo_structure: ["심볼형"] -> "Symbol Only"
          if (!String(next.logo_structure || "").trim()) {
            const lsArr = Array.isArray(loaded.logo_structure)
              ? loaded.logo_structure
              : [];
            const ls0 = String(lsArr?.[0] || "").trim();
            if (ls0 === "심볼형") next.logo_structure = "Symbol Only";
            else if (ls0 === "워드마크형") next.logo_structure = "Wordmark";
            else if (ls0 === "콤비네이션") next.logo_structure = "Combination";
          }

          // brand_color: ["블루/네이비"] -> ["Blue/Navy"]
          if (
            Array.isArray(loaded.brand_color) &&
            loaded.brand_color.length &&
            (!Array.isArray(next.brand_color) || next.brand_color.length === 0)
          ) {
            const map = {
              "블루/네이비": "Blue/Navy",
              "블랙/화이트": "Black/White/Gray",
              "블랙/화이트/그레이": "Black/White/Gray",
            };
            next.brand_color = loaded.brand_color
              .map((x) => map[String(x).trim()] || x)
              .slice(0, 2);
          }

          // design_style: ["플랫/미니멀"] -> "Flat/Minimalist"
          if (!String(next.design_style || "").trim()) {
            const dsArr = Array.isArray(loaded.design_style)
              ? loaded.design_style
              : [];
            const ds0 = String(dsArr?.[0] || "").trim();
            if (ds0 === "플랫/미니멀") next.design_style = "Flat/Minimalist";
            else if (ds0 === "3D/그라디언트") next.design_style = "3D/Gradient";
          }

          // visual_text_ratio: ["이미지 중심"] -> "Image Driven"
          if (!String(next.visual_text_ratio || "").trim()) {
            const vrArr = Array.isArray(loaded.visual_text_ratio)
              ? loaded.visual_text_ratio
              : [];
            const vr0 = String(vrArr?.[0] || "").trim();
            if (vr0 === "이미지 중심") next.visual_text_ratio = "Image Driven";
            else if (vr0 === "균형") next.visual_text_ratio = "Balanced";
            else if (vr0 === "텍스트 중심")
              next.visual_text_ratio = "Text Driven";
          }

          // 기존 useCase/primary_usage 유지
          if (
            !String(next.primary_usage || "").trim() &&
            String(loaded.useCase || "").trim()
          ) {
            next.primary_usage = loaded.useCase;
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

  // ✅ 기업 진단&인터뷰 값 자동 반영(화면에는 노출하지 않지만 payload 품질 유지용)
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
        "brandId를 확인할 수 없습니다. 기업진단 → 네이밍/컨셉/스토리 완료 후 로고 단계로 진행해 주세요.",
      );
      navigate("/diagnosisinterview", { state: { mode: "start" } });
      return;
    }

    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const nextSeed = mode === "regen" ? regenSeed + 1 : regenSeed;
      if (mode === "regen") setRegenSeed(nextSeed);

      const diagnosisSummary = p?.diagnosisSummary || null;
      const selections = {
        naming: getSelected("naming", p) || null,
        concept: getSelected("concept", p) || null,
        story: getSelected("story", p) || null,
      };

      const payload = {
        ...form,
        mode,
        regenSeed: nextSeed,
        questionnaire: {
          step: "logo",
          version: "logo_v1",
          locale: "ko-KR",
        },
        context: {
          diagnosisSummary,
          selections,
        },
      };

      const res = await apiRequestAI(`/brands/${brandId}/logo`, {
        method: "POST",
        data: payload,
      });

      const nextCandidates = normalizeLogoCandidates(res);

      if (!nextCandidates.length) {
        alert(
          "로고 시안을 받지 못했습니다. 백 응답 포맷(logo1~3 또는 candidates 배열)을 확인해주세요.",
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
        "✅ 로고 시안 3가지가 도착했어요. 아래에서 확인하고 ‘선택’을 눌러주세요.",
      );
      window.setTimeout(() => scrollToResult(), 50);
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.userMessage || e?.message;

      console.warn("POST /brands/{brandId}/logo failed:", e);

      if (status === 401 || status === 403) {
        const token = getStoredAccessToken();
        const expired = !token || isJwtExpired(token);

        if (expired) {
          alert(
            "로그인 토큰이 없거나 만료되었습니다.\n다시 로그인한 뒤 '완료'를 다시 눌러주세요.",
          );
          navigate("/login", {
            state: {
              redirectTo: `${location.pathname}${location.search || ""}`,
            },
          });
          return;
        }

        const serverMsg = msg ? `\n\n서버 메시지: ${msg}` : "";
        alert(
          status === 401
            ? `로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요.${serverMsg}`
            : `권한이 없습니다(403). 보통 현재 로그인한 계정의 brandId가 아닌 값으로 요청할 때 발생합니다.\n기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.${serverMsg}`,
        );
        return;
      }

      alert(`로고 생성 요청에 실패했습니다: ${msg || "요청 실패"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectCandidate = (id) => {
    setSelectedId(id);
    persistResult(candidates, id, regenSeed);

    // ✅ 선택 즉시 로컬 fallback 저장(brandId -> logoUrl)
    try {
      const p = readPipeline();
      const brandId =
        p?.brandId ||
        p?.brand?.id ||
        p?.diagnosisResult?.brandId ||
        p?.diagnosis?.brandId ||
        null;

      const picked = candidates.find((c) => c.id === id) || null;
      const url =
        picked?.imageUrl ||
        picked?.url ||
        picked?.logoUrl ||
        picked?.logoImageUrl ||
        "";

      if (brandId && String(url).trim()) {
        upsertSelectedLogoFallback(brandId, url);
      }
    } catch {
      // ignore
    }
  };

  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    if (!canFinish || finishing) return;

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

    const selectedLogoUrl =
      selected?.imageUrl || selected?.url || selected?.logoUrl || "";

    if (!brandId) {
      alert("brandId를 확인할 수 없습니다. 기업진단을 다시 진행해 주세요.");
      return;
    }
    if (!String(selectedLogoUrl).trim()) {
      alert("선택된 로고 URL을 찾을 수 없습니다. 시안을 다시 선택해 주세요.");
      return;
    }

    setFinishing(true);
    try {
      upsertSelectedLogoFallback(brandId, selectedLogoUrl);

      await apiRequest(`/brands/${brandId}/logo/select`, {
        method: "POST",
        data: {
          selectedByUser: String(selectedLogoUrl),
          selectedLogoUrl: String(selectedLogoUrl),
          logoUrl: String(selectedLogoUrl),
          imageUrl: String(selectedLogoUrl),
          url: String(selectedLogoUrl),
        },
      });
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.userMessage || e?.message;

      console.warn("POST /brands/{brandId}/logo/select failed:", e);

      if (status === 401 || status === 403) {
        alert(
          status === 401
            ? "로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요."
            : "권한이 없습니다(403). 보통 현재 로그인한 계정의 brandId가 아닌 값으로 요청할 때 발생합니다. 기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.",
        );
        return;
      }

      if (!String(msg || "").includes("로고")) {
        alert(`로고 선택 저장에 실패했습니다: ${msg || "요청 실패"}`);
        return;
      }
    } finally {
      setFinishing(false);
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

  // ====== step_5 핸들러(선택 중심) ======
  const setLogoStructure = (value) =>
    setForm((prev) => ({ ...prev, logo_structure: value }));

  const setVisualMotif = (value) =>
    setForm((prev) => ({ ...prev, visual_motif: value }));

  const setBrandColors = (nextColors) => {
    setForm((prev) => {
      const list = Array.isArray(nextColors) ? nextColors : [];
      return { ...prev, brand_color: list.slice(0, 2) };
    });
  };

  const setDesignStyle = (value) =>
    setForm((prev) => ({ ...prev, design_style: value }));

  const setLogoFlexibility = (nextFlex) => {
    setForm((prev) => {
      const list = Array.isArray(nextFlex) ? nextFlex : [];
      return { ...prev, logo_flexibility: list.slice(0, 2) };
    });
  };

  const setVisualTextRatio = (value) =>
    setForm((prev) => ({ ...prev, visual_text_ratio: value }));

  const setMainUsageChannels = (nextChannels) => {
    setForm((prev) => {
      const list = Array.isArray(nextChannels) ? nextChannels : [];
      const next = {
        ...prev,
        main_usage_channels: list.slice(0, 2),
      };
      // ✅ 호환/보험용: primary_usage 자동 채우기(기존 키 유지)
      next.primary_usage = joinUsageLabels(next.main_usage_channels);
      return next;
    });
  };

  const setTypographyStyle = (value) =>
    setForm((prev) => ({ ...prev, typography_style: value }));

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
                <h1 className="diagInterview__title">로고 컨설팅 인터뷰</h1>
                <p className="diagInterview__sub">
                  아래 질문에 답하면 로고 시안 3개를 생성합니다. 선택한 1개를
                  저장하면 브랜드 컨설팅이 완료됩니다.
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

          <ConsultingFlowPanel activeKey="logo" />

          <div className="diagInterview__grid">
            <section className="diagInterview__left">
              {/* ✅ 기본 정보(자동반영) 섹션 삭제 */}

              {/* 1) 로고 형태 */}
              <div className="card" ref={refLogo}>
                <div className="card__head">
                  <h2>1. 로고 형태</h2>
                  <p>어떤 형태의 로고를 원하시나요? (Step 5)</p>
                </div>

                <div className="field" id="logo-q-logo_structure">
                  <label>
                    로고 형태 선택 <span className="req">*</span>
                  </label>
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {LOGO_STRUCTURE_OPTIONS.map((opt) => {
                      const selected = form.logo_structure === opt.value;
                      const examples =
                        LOGO_EXAMPLES_BY_STRUCTURE?.[opt.value] || [];
                      return (
                        <ChoiceCard
                          key={opt.id}
                          selected={selected}
                          title={opt.text}
                          desc={opt.description}
                          examples={examples}
                          onClick={() => setLogoStructure(opt.value)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2) 비주얼 모티프 */}
              <div className="card" ref={refMotif}>
                <div className="card__head">
                  <h2>2. 비주얼 모티프</h2>
                  <p>로고에 담고 싶은 이미지는 무엇인가요? (선택형)</p>
                </div>

                <div className="field" id="logo-q-visual_motif">
                  <label>
                    비주얼 모티프 선택 <span className="req">*</span>
                  </label>

                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {VISUAL_MOTIF_OPTIONS.map((opt) => {
                      const selected = form.visual_motif === opt.value;
                      return (
                        <ChoiceCard
                          key={opt.id}
                          selected={selected}
                          title={opt.text}
                          desc={opt.description}
                          onClick={() => setVisualMotif(opt.value)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3) 대표 색상 */}
              {/* 2026-02-06 - 컬러 피커 추가 */}
              <div className="card" ref={refColor}>
                <div className="card__head">
                  <h2>3. 대표 색상</h2>
                  <p>우리를 대표하는 색상은 무엇인가요? (최대 2개)</p>
                </div>
                <div className="field" id="logo-q-brand_color">
                  <label>
                    색상 선택(최대 2개) <span className="req">*</span>
                  </label>

                  <div className="hint" style={{ marginTop: 6 }}>
                    대표 색상 1(Primary)과 대표 색상 2(Secondary)를 각각 선택해
                    주세요.
                  </div>

                  {/* ✅ 카드 2개 */}
                  <div className="colorPickGrid" style={{ marginTop: 12 }}>
                    {/* Primary */}
                    <div className="colorPickCard">
                      <div className="colorPickTop">
                        <div>
                          <div className="colorPickTitle">
                            대표 색상 1 (Primary)
                          </div>
                          <div className="colorPickDesc">
                            로고/메인 화면에서 가장 먼저 보이는 핵심 색상
                          </div>
                        </div>
                        <div
                          className="colorSwatch"
                          style={{ background: form.brand_color_primary }}
                        />
                      </div>

                      <div className="colorPickBody">
                        <div className="wheelWrap">
                          <div className="pickerBox">
                            <HexColorPicker
                              color={form.brand_color_primary || "#3B7CF3"}
                              onChange={(hex) => {
                                setForm((prev) => ({
                                  ...prev,
                                  brand_color_primary: hex,
                                  brand_color: [hex, prev.brand_color_secondary]
                                    .filter(Boolean)
                                    .slice(0, 2),
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Secondary */}
                    <div className="colorPickCard">
                      <div className="colorPickTop">
                        <div>
                          <div className="colorPickTitle">
                            대표 색상 2 (Secondary)
                          </div>
                          <div className="colorPickDesc">
                            버튼/강조 요소에 사용되는 보조 색상
                          </div>
                        </div>
                        <div
                          className="colorSwatch"
                          style={{ background: form.brand_color_secondary }}
                        />
                      </div>

                      <div className="colorPickBody">
                        <div className="wheelWrap">
                          <div className="pickerBox">
                            <HexColorPicker
                              color={normalizeHex(
                                form.brand_color_secondary,
                                "#0A2540",
                              )}
                              onChange={(hex) => {
                                const next = normalizeHex(hex, "#0A2540");
                                setForm((prev) => ({
                                  ...prev,
                                  brand_color_secondary: next,
                                  brand_color: [prev.brand_color_primary, next]
                                    .filter(Boolean)
                                    .slice(0, 2),
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ✅ 요약 */}
                  <div className="colorSummaryRow">
                    <span className="colorChip">
                      <i style={{ background: form.brand_color_primary }} />
                      Primary <b>{form.brand_color_primary}</b>
                    </span>
                    <span className="colorChip">
                      <i style={{ background: form.brand_color_secondary }} />
                      Secondary <b>{form.brand_color_secondary}</b>
                    </span>
                  </div>
                </div>
              </div>

              {/* 4) 디자인 스타일 */}
              <div className="card" ref={refStyle}>
                <div className="card__head">
                  <h2>4. 디자인 스타일</h2>
                  <p>선호하는 디자인 스타일은 무엇인가요? (Step 5)</p>
                </div>

                <div className="field" id="logo-q-design_style">
                  <label>
                    스타일 선택 <span className="req">*</span>
                  </label>
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {DESIGN_STYLE_OPTIONS.map((opt) => {
                      const selected = form.design_style === opt.value;
                      const extra = opt.visual_note
                        ? `노트: ${opt.visual_note}`
                        : "";
                      return (
                        <ChoiceCard
                          key={opt.id}
                          selected={selected}
                          title={opt.text}
                          desc={opt.description}
                          extra={extra}
                          onClick={() => setDesignStyle(opt.value)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 5) 레퍼런스(필수) */}
              <div className="card" ref={refRef}>
                <div className="card__head">
                  <h2>5. 로고 레퍼런스</h2>
                  <p>
                    평소에 “로고가 참 좋다”고 생각한 브랜드와 그 이유는
                    무엇인가요? (2~3개)
                  </p>
                </div>

                <div className="field" id="logo-q-design_reference">
                  <label>
                    레퍼런스(필수) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.design_reference}
                    onChange={(e) =>
                      setValue("design_reference", e.target.value)
                    }
                    placeholder={`예: 애플 - 심플하면서도 기억에 남음
스타벅스 - 친근함과 고급스러움의 조화
노션 - 미니멀하지만 개성이 있음`}
                    rows={5}
                  />
                </div>
              </div>

              {/* 6) 유연성/확장성 */}
              <div className="card" ref={refFlex}>
                <div className="card__head">
                  <h2>6. 로고 확장/유연성</h2>
                  <p>
                    다양한 상황에서 가장 중요한 특성은 무엇인가요? (최대 2개)
                  </p>
                </div>

                <div className="field" id="logo-q-logo_flexibility">
                  <label>
                    중요 특성(최대 2개) <span className="req">*</span>
                  </label>

                  <div className="hint" style={{ marginTop: 6 }}>
                    2개를 넘기면 마지막으로 선택한 항목이 유지돼요.
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.logo_flexibility}
                      options={LOGO_FLEXIBILITY_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.text,
                      }))}
                      onChange={setLogoFlexibility}
                      max={2}
                    />
                  </div>
                </div>
              </div>

              {/* 7) 비율 */}
              <div className="card" ref={refRatio}>
                <div className="card__head">
                  <h2>7. 이미지/텍스트 비율</h2>
                  <p>이미지와 텍스트 중 무엇이 더 중요한가요?</p>
                </div>

                <div className="field" id="logo-q-visual_text_ratio">
                  <label>
                    비율 선택 <span className="req">*</span>
                  </label>

                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {VISUAL_TEXT_RATIO_OPTIONS.map((opt) => {
                      const selected = form.visual_text_ratio === opt.value;
                      return (
                        <ChoiceCard
                          key={opt.id}
                          selected={selected}
                          title={opt.text}
                          desc={opt.description}
                          onClick={() => setVisualTextRatio(opt.value)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 8) 사용 채널 */}
              <div className="card" ref={refUsage}>
                <div className="card__head">
                  <h2>8. 주요 사용 채널</h2>
                  <p>
                    로고와 브랜드가 가장 많이 사용될 곳은 어디인가요? (최대 2개)
                  </p>
                </div>

                <div className="field" id="logo-q-main_usage_channels">
                  <label>
                    사용 채널(최대 2개) <span className="req">*</span>
                  </label>

                  <div className="hint" style={{ marginTop: 6 }}>
                    2개를 넘기면 마지막으로 선택한 항목이 유지돼요.
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <MultiChips
                      value={form.main_usage_channels}
                      options={MAIN_USAGE_CHANNELS_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.text,
                      }))}
                      onChange={setMainUsageChannels}
                      max={2}
                    />
                  </div>

                  {String(form.primary_usage || "").trim() ? (
                    <div className="hint" style={{ marginTop: 10 }}>
                      <b>요약</b> · {form.primary_usage}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 9) 타이포그래피(필수) */}
              <div className="card" ref={refType}>
                <div className="card__head">
                  <h2>9. 타이포그래피 스타일</h2>
                  <p>브랜드 로고에 어울리는 폰트 스타일은 무엇인가요?</p>
                </div>

                <div className="field" id="logo-q-typography_style">
                  <label>
                    폰트 스타일 선택 <span className="req">*</span>
                  </label>

                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {TYPOGRAPHY_STYLE_OPTIONS.map((opt) => {
                      const selected = form.typography_style === opt.value;
                      return (
                        <ChoiceCard
                          key={opt.id}
                          selected={selected}
                          title={opt.text}
                          desc={opt.description}
                          onClick={() => setTypographyStyle(opt.value)}
                        />
                      );
                    })}
                  </div>
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
                    <h2>로고 시안 생성 중</h2>
                    <p>입력 내용을 바탕으로 시안 3가지를 만들고 있어요.</p>
                  </div>
                  <div className="hint">잠시만 기다려주세요…</div>
                </div>
              ) : hasResult ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>로고 시안 3가지</h2>
                    <p>시안 1개를 선택하면 결과 히스토리로 이동할 수 있어요.</p>
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
                                {c.summary}
                              </div>
                            </div>
                            <span className="candidateBadge">
                              {isSelected ? "선택됨" : "시안"}
                            </span>
                          </div>

                          {/* ✅ 로고 이미지 미리보기 */}
                          <div style={{ marginTop: 12 }}>
                            <div
                              style={{
                                width: "100%",
                                borderRadius: 14,
                                border: "1px solid rgba(0,0,0,0.08)",
                                background: "rgba(255,255,255,0.75)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: "100%",
                                  height: 220,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: 12,
                                }}
                              >
                                {c?.imageUrl ? (
                                  <img
                                    src={c.imageUrl}
                                    alt={c.name}
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: "100%",
                                      objectFit: "contain",
                                      borderRadius: 10,
                                    }}
                                  />
                                ) : (
                                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                                    이미지를 표시할 수 없습니다.
                                  </div>
                                )}
                              </div>
                            </div>
                            {c?.imageUrl ? (
                              <div
                                style={{
                                  marginTop: 8,
                                  fontSize: 12,
                                  opacity: 0.75,
                                  wordBreak: "break-all",
                                }}
                              >
                                <b>URL</b> · {c.imageUrl}
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
                    {canFinish
                      ? "✅ 사이드 카드에서 ‘완료(히스토리로)’ 버튼을 눌러주세요."
                      : "* 시안 1개를 선택하면 사이드 카드에 완료 버튼이 표시됩니다."}
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
                  전체 초기화
                </button>

                {analyzeError ? (
                  <div className="aiInlineError" style={{ marginTop: 10 }}>
                    {analyzeError}
                  </div>
                ) : null}

                <div className="divider" />

                <h4 className="sideSubTitle">마무리</h4>
                {canFinish ? (
                  <button
                    type="button"
                    className={`btn primary ${finishing ? "disabled" : ""}`}
                    onClick={handleFinish}
                    disabled={finishing}
                    style={{ width: "100%" }}
                  >
                    {finishing ? "저장 중..." : "완료(히스토리로)"}
                  </button>
                ) : (
                  <p className="hint" style={{ marginTop: 10 }}>
                    * 시안 1개를 선택하면 완료 버튼이 표시됩니다.
                  </p>
                )}
              </div>
            </aside>
          </div>

          {canAnalyze ? (
            <div
              className="diagBottomReadyNotice"
              role="status"
              aria-live="polite"
            >
              <span className="diagBottomReadyNotice__icon" aria-hidden="true">
                ✅
              </span>
              <p>
                <strong>모든 필수 입력이 완료되었습니다.</strong> 오른쪽 진행
                상태 카드의 <b>AI 분석 요청</b> 버튼으로 다음 진행이 가능합니다.
              </p>
            </div>
          ) : null}
        </div>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
