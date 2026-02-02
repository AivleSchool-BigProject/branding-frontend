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
  readPipeline,
  upsertPipeline,
  setStepResult,
  clearStepsFrom,
  getSelected,
  setBrandFlowCurrent,
  markBrandFlowPendingAbort,
  consumeBrandFlowPendingAbort,
  resetBrandConsultingToDiagnosisStart,
  completeBrandFlow,
} from "../utils/brandPipelineStorage.js";

// ✅ 백 연동(이미 프로젝트에 존재하는 클라이언트 사용)
import { apiRequest } from "../api/client.js";

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
  if (!exp) return false; // exp가 없으면 판단 불가 -> 만료로 보지 않음
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

/** ======================
 *  ✅ 백 응답 후보 normalize (로고 3안 형태로 통일)
 *  - 예상 응답 예:
 *    1) { logo1: "url", logo2: "url", logo3: "url" }
 *    2) { candidates: [ { id, url }, ... ] }
 *    3) ["url1","url2","url3"]
 *  ====================== */
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

  // 1) 배열로 직접 온 경우
  let list = Array.isArray(payload) ? payload : null;

  // 2) candidates 키로 온 경우
  if (!list && payload && typeof payload === "object") {
    list = payload?.candidates || payload?.logos || payload?.data?.candidates;
  }

  // 3) object에 logo1/2/3 형태로 담긴 경우
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

  // 최종 후보(최대 3개) 통일
  const urls = list
    .map((x) => readUrl(x))
    .filter((x) => typeof x === "string" && x.length > 0)
    .slice(0, 3);

  return urls.map((url, idx) => {
    const n = idx + 1;
    return {
      id: `logo${n}`,
      name: `로고 ${n}`,
      imageUrl: url,
      url,
      summary: "AI가 생성한 로고 시안입니다.",
    };
  });
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
  const location = useLocation();
  // ✅ URL 쿼리의 brandId 처리(새로고침/딥링크 대비)
  // ⚠️ 기존 로직은 URL의 brandId가 pipeline의 brandId를 덮어써서
  //    마지막 단계(로고 선택 저장)에서 다른 brandId로 요청되는 문제가 있었습니다.
  // 규칙:
  // 1) pipeline에 brandId가 없을 때만 URL brandId를 채웁니다.
  // 2) pipeline brandId가 이미 있으면 URL brandId는 무시하고, 있던 쿼리는 제거합니다.
  useEffect(() => {
    try {
      const qs = new URLSearchParams(location.search || "");
      const raw = qs.get("brandId");
      const incoming = raw ? Number(raw) : NaN;
      if (!Number.isFinite(incoming) || incoming <= 0) return;

      const p = readPipeline();
      const curRaw = p?.brandId;
      const cur = Number(curRaw);

      // pipeline이 비어 있으면 URL 값을 채운다
      if (!Number.isFinite(cur) || cur <= 0) {
        upsertPipeline({ brandId: incoming });
        return;
      }

      // pipeline이 이미 있으면 URL 값은 무시(오염 방지) + 쿼리 제거
      if (cur !== incoming) {
        navigate(location.pathname, { replace: true });
      }
    } catch {
      // ignore
    }
  }, [location.search, location.pathname, navigate]);

  // ✅ Strict Flow 가드(로고 단계) + 이탈/새로고침 처리
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
        navigate("/brandconsulting", { replace: true });
        return;
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
      navigate("/diagnosisinterview");
      return;
    }

    setAnalyzing(true);
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

      // ✅ 로고 생성
      const res = await apiRequest(`/brands/${brandId}/logo`, {
        method: "POST",
        data: payload,
      });

      const nextCandidates = normalizeLogoCandidates(res);

      if (!nextCandidates.length) {
        alert(
          "로고 후보를 받지 못했습니다. 백 응답 포맷(logo1~3 또는 candidates 배열)을 확인해주세요.",
        );
        setCandidates([]);
        setSelectedId(null);
        persistResult([], null, nextSeed);
        return;
      }

      setCandidates(nextCandidates);
      setSelectedId(null);
      persistResult(nextCandidates, null, nextSeed);
      scrollToResult();
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.userMessage || e?.message;

      console.warn("POST /brands/{brandId}/logo failed:", e);

      if (status === 401 || status === 403) {
        const token = getStoredAccessToken();
        const expired = !token || isJwtExpired(token);

        if (expired) {
          // ✅ 여기! 구문 오류 수정: 줄바꿈은 \n 사용
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
      alert("선택된 로고 URL을 찾을 수 없습니다. 후보를 다시 선택해 주세요.");
      return;
    }

    setFinishing(true);
    try {
      // ✅ 프론트 로컬에도 저장(brandId -> selected logoUrl)
      upsertSelectedLogoFallback(brandId, selectedLogoUrl);

      // ✅ 백엔드에 선택값 저장(로고 선택 → 브랜드 컨설팅 종료)
      await apiRequest(`/brands/${brandId}/logo/select`, {
        method: "POST",
        // ✅ 백 구현/DTO 차이 대비: 여러 필드명으로 함께 전달
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

      // ✅ 재진입/중복 저장 등으로 단계가 이미 넘어갔을 수 있으므로,
      // 메시지에 '로고'가 포함되지 않으면 치명 에러로 보고 중단.
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
                    <h2>로고 후보 3안</h2>
                    <p>후보 1개를 선택하면 결과 히스토리로 이동할 수 있어요.</p>
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

                          <div
                            style={{ marginTop: 12, display: "flex", gap: 8 }}
                          >
                            <button
                              type="button"
                              className={`btn primary ${isSelected ? "disabled" : ""}`}
                              disabled={isSelected}
                              onClick={() => handleSelectCandidate(c.id)}
                            >
                              {isSelected ? "선택 완료" : "이 로고 선택"}
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
                    className={`btn primary ${finishing ? "disabled" : ""}`}
                    onClick={handleFinish}
                    disabled={finishing}
                    style={{ width: "100%" }}
                  >
                    {finishing ? "저장 중..." : "완료(히스토리로)"}
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
