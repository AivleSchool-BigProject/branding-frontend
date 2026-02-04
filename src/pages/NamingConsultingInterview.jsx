// // src/pages/NamingConsultingInterview.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useLocation, useNavigate } from "react-router-dom";

// import SiteHeader from "../components/SiteHeader.jsx";
// import SiteFooter from "../components/SiteFooter.jsx";

// import ConsultingFlowPanel from "../components/ConsultingFlowPanel.jsx";
// import ConsultingFlowMini from "../components/ConsultingFlowMini.jsx";

// import PolicyModal from "../components/PolicyModal.jsx";
// import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// // ✅ 사용자별 localStorage 분리(계정마다 독립 진행)
// import {
//   userGetItem,
//   userSetItem,
//   userRemoveItem,
// } from "../utils/userLocalStorage.js";

// // ✅ 파이프라인(단계 잠금/결과 저장)
// import {
//   ensureStrictStepAccess,
//   migrateLegacyToPipelineIfNeeded,
//   readPipeline,
//   setStepResult,
//   clearStepsFrom,
//   readDiagnosisDraftForm,
//   buildDiagnosisSummaryFromDraft,
//   upsertPipeline,
//   startBrandFlow,
//   setBrandFlowCurrent,
// } from "../utils/brandPipelineStorage.js";

// // ✅ 백 연동(이미 프로젝트에 존재하는 클라이언트 사용)
// import { apiRequest, apiRequestAI } from "../api/client.js";

// const STORAGE_KEY = "namingConsultingInterviewDraft_v1";
// const RESULT_KEY = "namingConsultingInterviewResult_v1";
// const LEGACY_KEY = "brandInterview_naming_v1";

// /** ======================
//  *  질문 문장(텍스트) 포함 전송용 정의
//  *  - questionId: 고정 ID(백에서 저장/분석/로그에 사용)
//  *  - key: form의 필드명
//  *  ====================== */
// const NAMING_QUESTIONS = [
//   {
//     questionId: "naming_style",
//     questionText: "어떤 스타일의 이름을 선호하시나요?",
//     key: "namingStyles",
//     answerType: "single_select",
//   },
//   {
//     questionId: "language_pref",
//     questionText: "어떤 언어 기반이어야 하나요?",
//     key: "languagePrefs",
//     answerType: "single_select",
//   },
//   {
//     questionId: "must_have_keywords",
//     questionText: "이름에 꼭 담기거나 연상되었으면 하는 단어가 있나요?",
//     key: "mustHaveKeywords",
//     answerType: "text",
//   },
//   {
//     questionId: "brand_vibe",
//     questionText: "이름에서 느껴져야 할 첫인상은 무엇인가요?",
//     key: "brandVibe",
//     answerType: "single_select",
//   },
//   {
//     questionId: "avoid_style",
//     questionText: '"이런 느낌만은 피해주세요" 하는 것이 있나요?',
//     key: "avoidStyle",
//     answerType: "text",
//   },
//   {
//     questionId: "domain_constraint",
//     questionText: ".com 도메인 확보가 필수적인가요?",
//     key: "domainConstraint",
//     answerType: "single_select",
//   },
//   {
//     questionId: "target_emotion",
//     questionText:
//       "고객이 이름을 듣자마자 느꼈으면 하는 딱 하나의 감정은 무엇인가요?",
//     key: "targetEmotion",
//     answerType: "text",
//   },
// ];

// function safeText(v, fallback = "") {
//   const s = String(v ?? "").trim();
//   return s ? s : fallback;
// }

// function stageLabel(v) {
//   const s = String(v || "")
//     .trim()
//     .toLowerCase();
//   if (!s) return "-";
//   if (s === "idea") return "아이디어";
//   if (s === "mvp") return "MVP";
//   if (s === "pmf") return "PMF";
//   if (s === "revenue" || s === "early_revenue") return "매출";
//   if (s === "invest") return "투자";
//   if (s === "scaleup" || s === "scaling") return "스케일업";
//   if (s === "rebrand") return "리브랜딩";
//   return String(v);
// }

// function isFilled(v) {
//   if (Array.isArray(v)) return v.length > 0;
//   return Boolean(String(v ?? "").trim());
// }

// /** ======================
//  *  백으로 보낼 payload 생성
//  *  - 질문 문장 포함 qa 배열
//  *  - answers는 백이 바로 쓰기 쉬운 평평한 형태
//  *  ====================== */
// function buildNamingPayload(
//   form,
//   { mode, regenSeed, brandId, diagnosisSummary },
// ) {
//   const answersLegacy = {
//     namingStyles: Array.isArray(form.namingStyles) ? form.namingStyles : [],
//     languagePrefs: Array.isArray(form.languagePrefs) ? form.languagePrefs : [],
//     mustHaveKeywords: safeText(form.mustHaveKeywords, ""),
//     brandVibe: safeText(form.brandVibe, ""),
//     avoidStyle: safeText(form.avoidStyle, ""),
//     domainConstraint: safeText(form.domainConstraint, ""),
//     targetEmotion: safeText(form.targetEmotion, ""),
//   };

//   // ✅ v2(백 전달용): 질문지 context_key 기준(스네이크 케이스)
//   const answersV2 = {
//     naming_style: (answersLegacy.namingStyles[0] || "").toString(),
//     language_pref: (answersLegacy.languagePrefs[0] || "").toString(),
//     must_have_keywords: answersLegacy.mustHaveKeywords,
//     brand_vibe: answersLegacy.brandVibe,
//     avoid_style: answersLegacy.avoidStyle,
//     domain_constraint: answersLegacy.domainConstraint,
//     target_emotion: answersLegacy.targetEmotion,
//   };

//   // ✅ answers는 레거시 + v2 둘 다 포함(백 호환성 강화)
//   const answers = { ...answersLegacy, ...answersV2 };

//   const getQaAnswer = (q) => {
//     const v = answersLegacy[q.key];

//     if (q.answerType === "single_select") {
//       if (Array.isArray(v)) return v[0] ?? "";
//       return safeText(v, "");
//     }
//     if (q.answerType === "multi_select") {
//       return Array.isArray(v) ? v : [];
//     }
//     return safeText(v, "");
//   };
//   const qa = NAMING_QUESTIONS.map((q) => ({
//     questionId: q.questionId,
//     questionText: q.questionText,
//     answerType: q.answerType,
//     answer: getQaAnswer(q),
//   }));

//   return {
//     step: "naming",
//     mode, // "generate" | "regen"
//     regenSeed,
//     brandId: brandId || null,

//     // ✅ 질문/답변
//     answers,
//     qa,

//     // ✅ 이전 단계 요약(네이밍은 기업진단 요약 기반)
//     diagnosisSummary: diagnosisSummary || null,

//     questionnaire: {
//       step: "naming",
//       version: "naming_v1",
//       locale: "ko-KR",
//     },
//   };
// }

// /** ======================
//  *  백 응답 후보 normalize
//  *  - 백이 어떤 포맷을 주더라도 UI에서 쓰기 쉽게 3안 형태로 맞춤
//  *  ====================== */
// function normalizeNamingCandidates(raw) {
//   // ✅ apiRequest는 보통 response.data만 반환하지만,
//   //    혹시 {data:{...}} / {result:{...}} 형태로 올 수도 있어 안전하게 풀어줌
//   const payload = raw?.data ?? raw?.result ?? raw;

//   // ✅ 케이스 0) 백이 { name1, name2, name3 } 형태로 주는 경우
//   // 예: {"name1":"Brandify","name2":"Cloudia","name3":"Truston"}
//   if (payload && typeof payload === "object" && !Array.isArray(payload)) {
//     const keys = ["name1", "name2", "name3"];
//     const values = keys
//       .map((k) => payload?.[k])
//       .filter((v) => typeof v === "string" && v.trim());

//     if (values.length) {
//       return values.slice(0, 3).map((name, idx) => ({
//         id: `name_${idx + 1}`,
//         name: `컨설팅 제안 ${idx + 1}`,
//         oneLiner: name,
//         keywords: [],
//         style: "",
//         samples: [name],
//         rationale: "",
//         checks: [],
//         avoid: [],
//       }));
//     }
//   }

//   // 1) 이미 배열로 온 경우 / candidates 배열로 온 경우
//   const list = Array.isArray(payload)
//     ? payload
//     : payload?.candidates ||
//       payload?.data?.candidates ||
//       payload?.result?.candidates;

//   if (!Array.isArray(list)) return [];

//   // 케이스 A: ["name1","name2","name3"] 문자열 배열
//   if (list.length && typeof list[0] === "string") {
//     return list.slice(0, 3).map((name, idx) => ({
//       id: `name_${idx + 1}`,
//       name: `컨설팅 제안 ${idx + 1}`,
//       oneLiner: name,
//       keywords: [],
//       style: "",
//       samples: [name],
//       rationale: "",
//       checks: [],
//       avoid: [],
//     }));
//   }

//   // 케이스 B: [{id, title, names, reason ...}] 객체 배열
//   return list.slice(0, 3).map((item, idx) => {
//     const id = item.id || item.candidateId || `name_${idx + 1}`;
//     const title =
//       item.name || item.title || item.label || `컨설팅 제안 ${idx + 1}`;

//     // 샘플 네임: 다양한 키로 대응
//     const samples =
//       (Array.isArray(item.samples) && item.samples) ||
//       (Array.isArray(item.names) && item.names) ||
//       (Array.isArray(item.examples) && item.examples) ||
//       (item.oneLiner ? [item.oneLiner] : []);

//     const keywords =
//       (Array.isArray(item.keywords) && item.keywords) ||
//       (Array.isArray(item.tags) && item.tags) ||
//       [];

//     const checks =
//       (Array.isArray(item.checks) && item.checks) ||
//       (Array.isArray(item.notes) && item.notes) ||
//       [];

//     const avoid =
//       (Array.isArray(item.avoid) && item.avoid) ||
//       (Array.isArray(item.avoidList) && item.avoidList) ||
//       [];

//     return {
//       id,
//       name: title,
//       oneLiner: safeText(item.oneLiner || item.summary || "", ""),
//       keywords: keywords.slice(0, 10),
//       style: safeText(item.style || "", ""),
//       samples: samples.slice(0, 10),
//       rationale: safeText(item.rationale || item.reason || "", ""),
//       checks: checks.slice(0, 10),
//       avoid: avoid.slice(0, 10),
//     };
//   });
// }

// // ✅ 네이밍 질문 옵션
// const NAMING_STYLE_OPTIONS = [
//   { value: "Descriptive", label: "직관적/설명적" },
//   { value: "Symbolic", label: "함축적/상징적" },
//   { value: "Compound Word", label: "합성어" },
//   { value: "Abstract/Neologism", label: "추상적/신조어" },
// ];

// const LANGUAGE_OPTIONS = [
//   { value: "Korean", label: "순수 한글" },
//   { value: "English", label: "영어 기반" },
//   { value: "Any", label: "무관" },
// ];

// const VIBE_OPTIONS = [
//   { value: "Trustworthy", label: "신뢰감 있는" },
//   { value: "Innovative", label: "혁신적인" },
//   { value: "Friendly", label: "친근한" },
// ];

// const DOMAIN_OPTIONS = [
//   { value: "Must have .com", label: ".com 도메인 확보 필수" },
//   { value: "Don't care", label: "상관없음" },
// ];

// const INITIAL_FORM = {
//   // ✅ 기업 진단에서 자동 반영(편집 X)
//   companyName: "",
//   industry: "",
//   stage: "",
//   website: "",
//   oneLine: "",
//   brandDesc: "",
//   targetCustomer: "",

//   // ✅ 네이밍 컨설팅 인터뷰(편집 O)
//   namingStyles: [],
//   languagePrefs: [],
//   mustHaveKeywords: "",
//   brandVibe: "",
//   avoidStyle: "",
//   domainConstraint: "",
//   targetEmotion: "",
// };

// export default function NamingConsultingInterview({ onLogout }) {
//   const navigate = useNavigate();
//   const location = useLocation();

//   // ✅ 약관/방침 모달
//   const [openType, setOpenType] = useState(null);
//   const closeModal = () => setOpenType(null);

//   // ✅ 폼 상태
//   const [form, setForm] = useState(INITIAL_FORM);

//   // ✅ 저장 상태 UI
//   const [saveMsg, setSaveMsg] = useState("");
//   const [lastSaved, setLastSaved] = useState("-");

//   // ✅ 결과(후보/선택) 상태
//   const [analyzing, setAnalyzing] = useState(false);
//   const [analyzeError, setAnalyzeError] = useState("");
//   const [toast, setToast] = useState({
//     msg: "",
//     variant: "success",
//     muted: false,
//   });
//   const toastTimerRef = useRef(null);
//   const toastMsg = toast.msg;
//   const toastMuted = toast.muted;
//   const toastVariant = toast.variant;
//   const [candidates, setCandidates] = useState([]);
//   const [selectedId, setSelectedId] = useState(null);
//   const [regenSeed, setRegenSeed] = useState(0);
//   const refResult = useRef(null);

//   // 섹션 ref
//   const refBasic = useRef(null);
//   const refInterview = useRef(null);

//   const sections = useMemo(
//     () => [
//       { id: "basic", label: "기본 정보", ref: refBasic },
//       { id: "interview", label: "네이밍 질문", ref: refInterview },
//     ],
//     [],
//   );

//   // ✅ 필수 항목
//   const requiredKeys = useMemo(
//     () => [
//       "namingStyles",
//       "languagePrefs",
//       "brandVibe",
//       "domainConstraint",
//       "targetEmotion",
//     ],
//     [],
//   );

//   const requiredStatus = useMemo(() => {
//     const status = {};
//     requiredKeys.forEach((k) => {
//       status[k] = isFilled(form?.[k]);
//     });
//     return status;
//   }, [form, requiredKeys]);

//   const completedRequired = useMemo(
//     () => requiredKeys.filter((k) => requiredStatus[k]).length,
//     [requiredKeys, requiredStatus],
//   );

//   const progress = useMemo(() => {
//     if (requiredKeys.length === 0) return 0;
//     return Math.round((completedRequired / requiredKeys.length) * 100);
//   }, [completedRequired, requiredKeys.length]);

//   const canAnalyze = completedRequired === requiredKeys.length;
//   const hasResult = candidates.length > 0;
//   const canGoNext = Boolean(hasResult && selectedId);

//   const setValue = (key, value) =>
//     setForm((prev) => ({ ...prev, [key]: value }));

//   const toggleArrayValue = (key, value) => {
//     setForm((prev) => {
//       const cur = Array.isArray(prev[key]) ? prev[key] : [];
//       const exists = cur.includes(value);

//       const setSingleArrayValue = (key, value) => {
//         setForm((prev) => ({
//           ...prev,
//           [key]: value ? [value] : [],
//         }));
//       };
//       const next = exists ? cur.filter((v) => v !== value) : [...cur, value];
//       return { ...prev, [key]: next };
//     });
//   };

//   const scrollToSection = (ref) => {
//     if (!ref?.current) return;
//     ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
//   };

//   const scrollToResult = () => {
//     if (!refResult?.current) return;
//     refResult.current.scrollIntoView({ behavior: "smooth", block: "start" });
//   };

//   const showToast = (msg) => {
//     const text = String(msg || "");
//     const variant = /^\s*(⚠️|❌)/.test(text) ? "warn" : "success";
//     setToast({ msg: text, variant, muted: false });
//     try {
//       if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
//       // ✅ 성공 메시지는 몇 초 뒤 “톤다운(흰 배경)” 처리(문구는 유지)
//       if (variant === "success") {
//         toastTimerRef.current = window.setTimeout(() => {
//           setToast((prev) =>
//             prev.msg === text ? { ...prev, muted: true } : prev,
//           );
//         }, 3500);
//       }
//     } catch {
//       // ignore
//     }
//   };

//   /** ======================
//    *  (중요) Strict Flow 가드 + brandId/진단요약 pipeline 준비
//    *  ====================== */
//   // ✅ (최우선) 레거시 → pipeline 마이그레이션 + strict 접근 제어 + flow 시작
//   useEffect(() => {
//     try {
//       migrateLegacyToPipelineIfNeeded();

//       const access = ensureStrictStepAccess("naming");
//       if (!access?.ok) {
//         if (access?.reason === "no_back") {
//           alert(
//             "이전 단계로는 돌아갈 수 없습니다. 현재 단계에서 계속 진행해주세요.",
//           );
//         }
//         if (access?.redirectTo) {
//           navigate(access.redirectTo, { replace: true });
//         }
//         return;
//       }

//       const p = readPipeline();
//       const brandId =
//         location?.state?.brandId ??
//         location?.state?.report?.brandId ??
//         p?.brandId ??
//         null;

//       startBrandFlow({ brandId });
//       setBrandFlowCurrent("naming");
//     } catch {
//       // ignore
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // ✅ draft 로드
//   useEffect(() => {
//     try {
//       const raw = userGetItem(STORAGE_KEY);
//       if (!raw) return;
//       const parsed = JSON.parse(raw);
//       if (parsed?.form && typeof parsed.form === "object") {
//         setForm((prev) => ({ ...prev, ...parsed.form }));
//       }
//       if (parsed?.updatedAt) {
//         const d = new Date(parsed.updatedAt);
//         if (!Number.isNaN(d.getTime())) setLastSaved(d.toLocaleString());
//       }
//     } catch {
//       // ignore
//     }
//   }, []);

//   // ✅ 기업 진단 값 자동 반영
//   useEffect(() => {
//     try {
//       const diag = readDiagnosisDraftForm();
//       if (!diag) return;

//       const next = {
//         companyName: safeText(
//           diag.companyName || diag.brandName || diag.projectName,
//           "",
//         ),
//         industry: safeText(diag.industry || diag.category || diag.field, ""),
//         stage: safeText(diag.stage, ""),
//         website: safeText(diag.website || diag.homepage || diag.siteUrl, ""),
//         oneLine: safeText(
//           diag.oneLine ||
//             diag.companyIntro ||
//             diag.intro ||
//             diag.serviceIntro ||
//             diag.shortIntro,
//           "",
//         ),
//         brandDesc: safeText(
//           diag.brandDesc ||
//             diag.companyDesc ||
//             diag.detailIntro ||
//             diag.serviceDesc,
//           "",
//         ),
//         targetCustomer: safeText(
//           diag.targetPersona ||
//             diag.targetCustomer ||
//             diag.target ||
//             diag.customerTarget ||
//             diag.primaryCustomer,
//           "",
//         ),
//       };

//       setForm((prev) => ({
//         ...prev,
//         companyName: next.companyName || prev.companyName,
//         industry: next.industry || prev.industry,
//         stage: next.stage || prev.stage,
//         website: next.website || prev.website,
//         oneLine: next.oneLine || prev.oneLine,
//         brandDesc: next.brandDesc || prev.brandDesc,
//         targetCustomer: next.targetCustomer || prev.targetCustomer,
//       }));
//     } catch {
//       // ignore
//     }
//   }, []);

//   // ✅ 결과 로드(후보/선택)
//   useEffect(() => {
//     try {
//       const raw = userGetItem(RESULT_KEY);
//       if (!raw) return;
//       const parsed = JSON.parse(raw);
//       if (Array.isArray(parsed?.candidates)) setCandidates(parsed.candidates);
//       if (parsed?.selectedId) setSelectedId(parsed.selectedId);
//       if (typeof parsed?.regenSeed === "number") setRegenSeed(parsed.regenSeed);
//     } catch {
//       // ignore
//     }
//   }, []);

//   // ✅ 자동 저장(디바운스)
//   useEffect(() => {
//     setSaveMsg("");
//     const t = setTimeout(() => {
//       try {
//         const payload = { form, updatedAt: Date.now() };
//         userSetItem(STORAGE_KEY, JSON.stringify(payload));
//         setLastSaved(new Date(payload.updatedAt).toLocaleString());
//         setSaveMsg("자동 저장됨");
//       } catch {
//         // ignore
//       }
//     }, 600);

//     return () => clearTimeout(t);
//   }, [form]);

//   const persistResult = (nextCandidates, nextSelectedId, nextSeed) => {
//     const updatedAt = Date.now();

//     // ✅ 이 페이지 전용 결과 저장
//     try {
//       userSetItem(
//         RESULT_KEY,
//         JSON.stringify({
//           candidates: nextCandidates,
//           selectedId: nextSelectedId,
//           regenSeed: nextSeed,
//           updatedAt,
//         }),
//       );
//     } catch {
//       // ignore
//     }

//     // ✅ 레거시 저장(기존 BrandAllResults 호환)
//     try {
//       const selected =
//         nextCandidates.find((c) => c.id === nextSelectedId) || null;
//       userSetItem(
//         LEGACY_KEY,
//         JSON.stringify({
//           form,
//           candidates: nextCandidates,
//           selectedId: nextSelectedId,
//           selected,
//           regenSeed: nextSeed,
//           updatedAt,
//         }),
//       );
//     } catch {
//       // ignore
//     }

//     // ✅ (핵심) pipeline 저장: 다음 단계에서 그대로 사용
//     try {
//       const selected =
//         nextCandidates.find((c) => c.id === nextSelectedId) || null;
//       setStepResult("naming", {
//         candidates: nextCandidates,
//         selectedId: nextSelectedId,
//         selected,
//         regenSeed: nextSeed,
//       });
//       // ✅ 네이밍이 바뀌면 이후 단계(컨셉/스토리/로고)는 무효 → 잠금 처리
//       clearStepsFrom("concept");
//     } catch {
//       // ignore
//     }
//   };

//   /** ======================
//    *  ✅ 백 연동: 네이밍 생성
//    *   - POST /brands/{brandId}/naming
//    *  ====================== */
//   const handleGenerateCandidates = async (mode = "generate") => {
//     setAnalyzeError("");

//     if (!canAnalyze) {
//       alert("필수 항목을 모두 입력하면 요청이 가능합니다.");
//       return;
//     }

//     setAnalyzing(true);
//     setAnalyzeError("");
//     try {
//       const nextSeed = mode === "regen" ? regenSeed + 1 : regenSeed;
//       if (mode === "regen") setRegenSeed(nextSeed);

//       // pipeline에서 brandId / diagnosisSummary 확보
//       const p = readPipeline();
//       const diagnosisSummary =
//         p?.diagnosisSummary ||
//         (() => {
//           const diag = readDiagnosisDraftForm();
//           return diag ? buildDiagnosisSummaryFromDraft(diag) : null;
//         })();

//       let brandId =
//         p?.brandId ||
//         p?.brand?.id ||
//         p?.diagnosisResult?.brandId ||
//         p?.diagnosis?.brandId ||
//         null;

//       if (!brandId) {
//         alert(
//           "brandId를 확인할 수 없습니다. 기업진단 완료 후 생성된 brandId가 pipeline에 저장되어 있어야 합니다.",
//         );
//         return;
//       }

//       const payload = buildNamingPayload(form, {
//         mode,
//         regenSeed: nextSeed,
//         brandId,
//         diagnosisSummary,
//       });

//       // 1) 네이밍 생성

//       const namingRes = await apiRequestAI(`/brands/${brandId}/naming`, {
//         method: "POST",
//         data: payload,
//       });

//       // 후보 normalize
//       const nextCandidates = normalizeNamingCandidates(namingRes);
//       if (!nextCandidates.length) {
//         alert(
//           "네이밍 제안을 받지 못했습니다. 백 응답 포맷(candidates)을 확인해주세요.",
//         );
//         return;
//       }

//       setCandidates(nextCandidates);
//       setSelectedId(null);
//       persistResult(nextCandidates, null, nextSeed);
//       showToast(
//         "✅ 네이밍 컨설팅 제안 3가지이 도착했어요. 아래에서 확인하고 ‘선택’을 눌러주세요.",
//       );
//       window.setTimeout(() => scrollToResult(), 50);
//     } catch (error) {
//       const status = error?.response?.status;

//       console.error("Naming generate failed:", error);

//       // ✅ 401/403: 인증/권한 문제(토큰 만료, 다른 사람 brandId 접근 등)
//       if (status === 401 || status === 403) {
//         alert(
//           status === 401
//             ? "로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요."
//             : "권한이 없습니다(403). 보통 현재 로그인한 계정의 brandId가 아닌 값으로 요청할 때 발생합니다. 기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.",
//         );

//         // 혹시 pipeline에 잘못된 brandId가 남아있을 수 있어 초기화(안전)
//         try {
//           upsertPipeline({ brandId: null });
//         } catch {
//           // ignore
//         }
//         return;
//       }

//       const msg =
//         error?.response?.data?.message ||
//         error?.userMessage ||
//         error?.message ||
//         "요청 실패";
//       setAnalyzeError(`네이밍 생성에 실패했습니다: ${msg}`);
//       showToast("⚠️ 생성에 실패했어요. 아래에서 ‘다시 시도’를 눌러주세요.");
//     } finally {
//       setAnalyzing(false);
//     }
//   };

//   const handleSelectCandidate = (id) => {
//     setSelectedId(id);
//     persistResult(candidates, id, regenSeed);
//   };

//   const handleGoNext = async () => {
//     if (!canGoNext) return;

//     // ✅ 백 단계 진행을 위해 선택값을 저장(네이밍 -> 컨셉 단계로 이동)
//     const p = readPipeline();
//     const brandId =
//       p?.brandId ||
//       p?.brand?.id ||
//       p?.diagnosisResult?.brandId ||
//       p?.diagnosis?.brandId ||
//       null;

//     const selected =
//       candidates.find((c) => c.id === selectedId) ||
//       candidates.find((c) => c.id === (selectedId || "")) ||
//       null;

//     const selectedName =
//       selected?.samples?.[0] ||
//       selected?.oneLiner ||
//       selected?.title ||
//       selected?.name ||
//       "";

//     if (!brandId) {
//       alert("brandId를 확인할 수 없습니다. 기업진단을 다시 진행해 주세요.");
//       return;
//     }
//     if (!String(selectedName).trim()) {
//       alert("선택된 네이밍을 찾을 수 없습니다. 후보를 다시 선택해 주세요.");
//       return;
//     }

//     try {
//       await apiRequest(`/brands/${brandId}/naming/select`, {
//         method: "POST",
//         data: { selectedByUser: String(selectedName) },
//       });
//     } catch (e) {
//       const status = e?.response?.status;
//       const msg =
//         e?.response?.data?.message || e?.userMessage || e?.message || "";

//       console.warn("POST /brands/{brandId}/naming/select failed:", e);

//       // ✅ 401/403: 인증/권한 문제(토큰 만료, 다른 사람 brandId 접근 등)
//       if (status === 401 || status === 403) {
//         alert(
//           status === 401
//             ? "로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요."
//             : "권한이 없습니다(403). 보통 현재 로그인한 계정의 brandId가 아닌 값으로 요청할 때 발생합니다. 기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.",
//         );
//         return;
//       }

//       // 이미 단계가 넘어간 경우(예: 재진입)에는 다음으로 진행 허용
//       if (!String(msg).includes("네이밍 단계")) {
//         alert(`네이밍 선택 저장에 실패했습니다: ${msg || "요청 실패"}`);
//         return;
//       }
//     }

//     try {
//       // ✅ 다음 단계 진입과 동시에 currentStep을 앞으로 고정
//       setBrandFlowCurrent("concept");
//     } catch {
//       // ignore
//     }

//     navigate("/brand/concept/interview");
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const handleResetAll = () => {
//     const ok = window.confirm(
//       "네이밍 입력/결과를 초기화하고(컨셉/스토리/로고도 잠깁니다) 다시 시작할까요?",
//     );
//     if (!ok) return;

//     try {
//       userRemoveItem(STORAGE_KEY);
//       userRemoveItem(RESULT_KEY);
//       userRemoveItem(LEGACY_KEY);
//     } catch {
//       // ignore
//     }

//     // ✅ pipeline에서도 naming부터 초기화 + 이후 단계 잠금
//     try {
//       clearStepsFrom("naming");
//     } catch {
//       // ignore
//     }

//     // 진단 값은 다시 자동 반영되도록
//     const diag = (() => {
//       try {
//         return readDiagnosisDraftForm();
//       } catch {
//         return null;
//       }
//     })();

//     const base = { ...INITIAL_FORM };
//     if (diag) {
//       base.companyName = safeText(
//         diag.companyName || diag.brandName || diag.projectName,
//         "",
//       );
//       base.industry = safeText(
//         diag.industry || diag.category || diag.field,
//         "",
//       );
//       base.stage = safeText(diag.stage, "");
//       base.website = safeText(
//         diag.website || diag.homepage || diag.siteUrl,
//         "",
//       );
//       base.oneLine = safeText(
//         diag.oneLine ||
//           diag.companyIntro ||
//           diag.intro ||
//           diag.serviceIntro ||
//           diag.shortIntro,
//         "",
//       );
//       base.brandDesc = safeText(
//         diag.brandDesc ||
//           diag.companyDesc ||
//           diag.detailIntro ||
//           diag.serviceDesc,
//         "",
//       );
//       base.targetCustomer = safeText(
//         diag.targetPersona ||
//           diag.targetCustomer ||
//           diag.target ||
//           diag.customerTarget ||
//           diag.primaryCustomer,
//         "",
//       );
//     }

//     setForm(base);
//     setCandidates([]);
//     setSelectedId(null);
//     setRegenSeed(0);
//     setSaveMsg("");
//     setLastSaved("-");
//   };

//   return (
//     <div className="diagInterview consultingInterview">
//       <PolicyModal
//         open={openType === "privacy"}
//         title="개인정보 처리방침"
//         onClose={closeModal}
//       >
//         <PrivacyContent />
//       </PolicyModal>

//       <PolicyModal
//         open={openType === "terms"}
//         title="이용약관"
//         onClose={closeModal}
//       >
//         <TermsContent />
//       </PolicyModal>

//       <SiteHeader onLogout={onLogout} />

//       <main className="diagInterview__main">
//         <div className="diagInterview__container">
//           <div className="diagInterview__titleRow">
//             <div>
//               <h1 className="diagInterview__title">네이밍 컨설팅 인터뷰</h1>
//               <p className="diagInterview__sub">
//                 기업 진단 요약을 기반으로 네이밍 3안을 제안합니다. 선택한 1안이
//                 다음 단계(컨셉) 생성에 사용됩니다.
//               </p>
//             </div>

//             <div className="diagInterview__topActions">
//               <button
//                 type="button"
//                 className="btn ghost"
//                 onClick={() => navigate("/brandconsulting")}
//               >
//                 브랜드 컨설팅 홈
//               </button>
//             </div>
//           </div>

//           <ConsultingFlowPanel activeKey="naming" />

//           <div className="diagInterview__grid">
//             <section className="diagInterview__left">
//               {/* 1) BASIC (자동 반영) */}
//               <div className="card" ref={refBasic}>
//                 <div className="card__head">
//                   <h2>1. 기본 정보 (자동 반영)</h2>
//                   <p>
//                     기업 진단에서 입력한 정보를 자동으로 불러옵니다. (이
//                     페이지에서 수정하지 않아요)
//                   </p>
//                 </div>

//                 <div className="formGrid">
//                   <div className="field">
//                     <label>회사/프로젝트명</label>
//                     <input
//                       value={form.companyName}
//                       disabled
//                       placeholder="기업 진단에서 자동 반영"
//                     />
//                   </div>

//                   <div className="field">
//                     <label>산업/분야</label>
//                     <input
//                       value={form.industry}
//                       disabled
//                       placeholder="기업 진단에서 자동 반영"
//                     />
//                   </div>

//                   <div className="field">
//                     <label>성장 단계</label>
//                     <input
//                       value={stageLabel(form.stage)}
//                       disabled
//                       placeholder="기업 진단에서 자동 반영"
//                     />
//                   </div>

//                   <div className="field">
//                     <label>웹사이트/소개 링크</label>
//                     <input
//                       value={form.website}
//                       disabled
//                       placeholder="(선택) 진단에 입력했다면 자동 반영"
//                     />
//                   </div>
//                 </div>

//                 {String(form.targetCustomer || "").trim() ? (
//                   <div className="field">
//                     <label>타깃(진단 기준)</label>
//                     <input value={form.targetCustomer} disabled />
//                   </div>
//                 ) : null}

//                 <div className="field">
//                   <label>회사/서비스 소개</label>
//                   <textarea
//                     value={form.oneLine}
//                     disabled
//                     placeholder="기업 진단에서 자동 반영"
//                     rows={3}
//                   />
//                 </div>

//                 <div className="field">
//                   <label>상세 설명</label>
//                   <textarea
//                     value={form.brandDesc}
//                     disabled
//                     placeholder="(선택) 진단 인터뷰에 입력한 값이 없다면 비어 있을 수 있어요"
//                     rows={5}
//                   />
//                 </div>
//               </div>

//               {/* 2) INTERVIEW */}
//               <div className="card" ref={refInterview}>
//                 <div className="card__head">
//                   <h2>2. 네이밍 질문지</h2>
//                   <p>
//                     아래 항목을 입력하면 네이밍 컨설팅 제안 3가지을 생성할 수
//                     있어요.
//                   </p>
//                 </div>

//                 <div className="field">
//                   <label>
//                     1. 어떤 스타일의 이름을 선호하시나요?{" "}
//                     <span className="req">*</span>
//                   </label>
//                   <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
//                     {NAMING_STYLE_OPTIONS.map((opt) => {
//                       const checked = form.namingStyles.includes(opt.value);
//                       return (
//                         <label
//                           key={opt.value}
//                           style={{
//                             display: "flex",
//                             alignItems: "center",
//                             gap: 6,
//                           }}
//                         >
//                           <input
//                             type="radio"
//                             name="naming_style"
//                             checked={checked}
//                             onChange={() =>
//                               setSingleArrayValue("namingStyles", opt.value)
//                             }
//                           />
//                           <span>{opt.label}</span>
//                         </label>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 <div className="field">
//                   <label>
//                     2. 어떤 언어 기반이어야 하나요?{" "}
//                     <span className="req">*</span>
//                   </label>
//                   <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
//                     {LANGUAGE_OPTIONS.map((opt) => {
//                       const checked = form.languagePrefs.includes(opt.value);
//                       return (
//                         <label
//                           key={opt.value}
//                           style={{
//                             display: "flex",
//                             alignItems: "center",
//                             gap: 6,
//                           }}
//                         >
//                           <input
//                             type="radio"
//                             name="language_pref"
//                             checked={checked}
//                             onChange={() =>
//                               setSingleArrayValue("languagePrefs", opt.value)
//                             }
//                           />
//                           <span>{opt.label}</span>
//                         </label>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 <div className="field">
//                   <label>
//                     3. 이름에 꼭 담기거나 연상되었으면 하는 단어가 있나요?
//                     (선택)
//                   </label>
//                   <input
//                     value={form.mustHaveKeywords}
//                     onChange={(e) =>
//                       setValue("mustHaveKeywords", e.target.value)
//                     }
//                     placeholder="예) pilot, guide, brand, growth (쉼표로 구분)"
//                   />
//                 </div>

//                 <div className="field">
//                   <label>
//                     4. 이름에서 느껴져야 할 첫인상은 무엇인가요?{" "}
//                     <span className="req">*</span>
//                   </label>
//                   <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
//                     {VIBE_OPTIONS.map((opt) => {
//                       const checked = form.brandVibe === opt.value;
//                       return (
//                         <label
//                           key={opt.value}
//                           style={{
//                             display: "flex",
//                             alignItems: "center",
//                             gap: 6,
//                           }}
//                         >
//                           <input
//                             type="radio"
//                             name="brand_vibe"
//                             checked={checked}
//                             onChange={() => setValue("brandVibe", opt.value)}
//                           />
//                           <span>{opt.label}</span>
//                         </label>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 <div className="field">
//                   <label>
//                     5. "이런 느낌만은 피해주세요" 하는 것이 있나요? (선택)
//                   </label>
//                   <input
//                     value={form.avoidStyle}
//                     onChange={(e) => setValue("avoidStyle", e.target.value)}
//                     placeholder="예) 유치함, 과장됨, 너무 길고 어려움 (쉼표로 구분 가능)"
//                   />
//                 </div>

//                 <div className="field">
//                   <label>
//                     6. .com 도메인 확보가 필수적인가요?{" "}
//                     <span className="req">*</span>
//                   </label>
//                   <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
//                     {DOMAIN_OPTIONS.map((opt) => {
//                       const checked = form.domainConstraint === opt.value;
//                       return (
//                         <label
//                           key={opt.value}
//                           style={{
//                             display: "flex",
//                             alignItems: "center",
//                             gap: 6,
//                           }}
//                         >
//                           <input
//                             type="radio"
//                             name="domain_constraint"
//                             checked={checked}
//                             onChange={() =>
//                               setValue("domainConstraint", opt.value)
//                             }
//                           />
//                           <span>{opt.label}</span>
//                         </label>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 <div className="field">
//                   <label>
//                     7. 고객이 이름을 듣자마자 느꼈으면 하는 딱 하나의 감정은
//                     무엇인가요? <span className="req">*</span>
//                   </label>
//                   <input
//                     value={form.targetEmotion}
//                     onChange={(e) => setValue("targetEmotion", e.target.value)}
//                     placeholder="예) 안심 / 기대 / 설렘 / 신뢰 / 호기심"
//                   />
//                 </div>
//               </div>

//               <div ref={refResult} />

//               {toastMsg ? (
//                 <div
//                   className={`aiToast ${toastVariant}${toastMuted ? " muted" : ""}`}
//                   role="status"
//                   aria-live="polite"
//                 >
//                   {toastMsg}
//                 </div>
//               ) : null}

//               {analyzeError ? (
//                 <div className="card aiError" style={{ marginTop: 14 }}>
//                   <div className="card__head">
//                     <h2>요청에 실패했어요</h2>
//                     <p>{analyzeError}</p>
//                   </div>
//                   <div
//                     className="bottomBar"
//                     style={{ justifyContent: "flex-start" }}
//                   >
//                     <button
//                       type="button"
//                       className="btn primary"
//                       onClick={() =>
//                         handleGenerateCandidates(
//                           hasResult ? "regen" : "generate",
//                         )
//                       }
//                     >
//                       다시 시도
//                     </button>
//                   </div>
//                 </div>
//               ) : null}

//               {analyzing ? (
//                 <div className="card" style={{ marginTop: 14 }}>
//                   <div className="card__head">
//                     <h2>네이밍 제안 생성 중</h2>
//                     <p>입력 내용을 바탕으로 제안 3가지를 만들고 있어요.</p>
//                   </div>
//                   <div className="hint">잠시만 기다려주세요…</div>
//                 </div>
//               ) : hasResult ? (
//                 <div className="card" style={{ marginTop: 14 }}>
//                   <div className="card__head">
//                     <h2>네이밍 컨설팅 제안 3가지</h2>
//                     <p>
//                       제안 1개를 선택하면 다음 단계(컨셉)로 진행할 수 있어요.
//                     </p>
//                   </div>

//                   <div className="candidateList">
//                     {candidates.map((c) => {
//                       const isSelected = selectedId === c.id;
//                       return (
//                         <div
//                           key={c.id}
//                           className={`candidateCard ${isSelected ? "selected" : ""}`}
//                           role="button"
//                           tabIndex={0}
//                           onClick={() =>
//                             !isSelected && handleSelectCandidate(c.id)
//                           }
//                           onKeyDown={(e) => {
//                             if (isSelected) return;
//                             if (e.key === "Enter" || e.key === " ") {
//                               e.preventDefault();
//                               handleSelectCandidate(c.id);
//                             }
//                           }}
//                         >
//                           <div className="candidateHead">
//                             <div>
//                               <div className="candidateTitle">{c.name}</div>
//                               {c.oneLiner ? (
//                                 <div style={{ marginTop: 6, opacity: 0.9 }}>
//                                   {c.oneLiner}
//                                 </div>
//                               ) : null}
//                             </div>
//                             <span className="candidateBadge">
//                               {isSelected ? "선택됨" : "제안"}
//                             </span>
//                           </div>

//                           {c.keywords?.length ? (
//                             <div style={{ marginTop: 10 }}>
//                               <div style={{ fontWeight: 800, marginBottom: 6 }}>
//                                 키워드
//                               </div>
//                               <div
//                                 style={{
//                                   display: "flex",
//                                   gap: 6,
//                                   flexWrap: "wrap",
//                                 }}
//                               >
//                                 {c.keywords.map((kw) => (
//                                   <span
//                                     key={kw}
//                                     style={{
//                                       fontSize: 12,
//                                       fontWeight: 800,
//                                       padding: "4px 10px",
//                                       borderRadius: 999,
//                                       background: "rgba(0,0,0,0.04)",
//                                       border: "1px solid rgba(0,0,0,0.06)",
//                                       color: "rgba(0,0,0,0.75)",
//                                     }}
//                                   >
//                                     #{kw}
//                                   </span>
//                                 ))}
//                               </div>
//                             </div>
//                           ) : null}

//                           <div
//                             style={{
//                               marginTop: 10,
//                               fontSize: 13,
//                               opacity: 0.9,
//                             }}
//                           >
//                             {c.style ? (
//                               <div>
//                                 <b>스타일</b> · {c.style}
//                               </div>
//                             ) : null}

//                             {c.samples?.length ? (
//                               <div style={{ marginTop: 6 }}>
//                                 <b>샘플</b>
//                                 <div
//                                   style={{
//                                     marginTop: 6,
//                                     display: "flex",
//                                     flexWrap: "wrap",
//                                     gap: 6,
//                                   }}
//                                 >
//                                   {c.samples.map((s) => (
//                                     <span
//                                       key={s}
//                                       style={{
//                                         fontSize: 12,
//                                         fontWeight: 800,
//                                         padding: "4px 10px",
//                                         borderRadius: 999,
//                                         background: "rgba(0,0,0,0.04)",
//                                         border: "1px solid rgba(0,0,0,0.06)",
//                                         color: "rgba(0,0,0,0.75)",
//                                       }}
//                                     >
//                                       {s}
//                                     </span>
//                                   ))}
//                                 </div>
//                               </div>
//                             ) : null}

//                             {c.rationale ? (
//                               <div style={{ marginTop: 10, opacity: 0.85 }}>
//                                 <b>근거</b> · {c.rationale}
//                               </div>
//                             ) : null}

//                             {c.checks?.length ? (
//                               <div style={{ marginTop: 8, opacity: 0.85 }}>
//                                 <b>체크</b> · {c.checks.join(" · ")}
//                               </div>
//                             ) : null}

//                             {c.avoid?.length ? (
//                               <div style={{ marginTop: 8, opacity: 0.85 }}>
//                                 <b>피해야 할 요소</b> · {c.avoid.join(", ")}
//                               </div>
//                             ) : null}
//                           </div>

//                           <div className="candidateActions">
//                             <button
//                               type="button"
//                               className={`btn primary ${isSelected ? "disabled" : ""}`}
//                               disabled={isSelected}
//                               onClick={() => handleSelectCandidate(c.id)}
//                             >
//                               {isSelected ? "선택 완료" : "선택"}
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>

//                   <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
//                     {canGoNext
//                       ? "✅ 사이드 카드에서 ‘컨셉 단계로 이동’ 버튼을 눌러주세요."
//                       : "* 제안 1개를 선택하면 사이드 카드에 다음 단계 버튼이 표시됩니다."}
//                   </div>
//                 </div>
//               ) : null}
//             </section>

//             <aside className="diagInterview__right">
//               <div className="sideCard">
//                 <ConsultingFlowMini activeKey="naming" />

//                 <div className="sideCard__titleRow">
//                   <h3>진행 상태</h3>
//                   <span className="badge">{progress}%</span>
//                 </div>

//                 <div
//                   className="progressBar"
//                   role="progressbar"
//                   aria-valuemin={0}
//                   aria-valuemax={100}
//                   aria-valuenow={progress}
//                 >
//                   <div
//                     className="progressBar__fill"
//                     style={{ width: `${progress}%` }}
//                   />
//                 </div>

//                 <div className="sideMeta">
//                   <div className="sideMeta__row">
//                     <span className="k">필수 완료</span>
//                     <span className="v">
//                       {completedRequired}/{requiredKeys.length}
//                     </span>
//                   </div>
//                   <div className="sideMeta__row">
//                     <span className="k">마지막 저장</span>
//                     <span className="v">{lastSaved}</span>
//                   </div>
//                   <div className="sideMeta__row">
//                     <span className="k">단계</span>
//                     <span className="v">{stageLabel(form.stage)}</span>
//                   </div>
//                 </div>

//                 {saveMsg ? <p className="saveMsg">{saveMsg}</p> : null}

//                 <div className="divider" />

//                 <h4 className="sideSubTitle">필수 입력 체크</h4>
//                 <ul className="checkList">
//                   <li className={requiredStatus.namingStyles ? "ok" : ""}>
//                     1) 네이밍 스타일
//                   </li>
//                   <li className={requiredStatus.languagePrefs ? "ok" : ""}>
//                     2) 언어 기반
//                   </li>
//                   <li className={requiredStatus.brandVibe ? "ok" : ""}>
//                     4) 이름 첫인상
//                   </li>
//                   <li className={requiredStatus.domainConstraint ? "ok" : ""}>
//                     6) .com 제약
//                   </li>
//                   <li className={requiredStatus.targetEmotion ? "ok" : ""}>
//                     7) 타깃 감정
//                   </li>
//                 </ul>

//                 <div className="divider" />

//                 <h4 className="sideSubTitle">빠른 작업</h4>
//                 <button
//                   type="button"
//                   className={`btn primary ${canAnalyze && !analyzing ? "" : "disabled"}`}
//                   onClick={() =>
//                     handleGenerateCandidates(hasResult ? "regen" : "generate")
//                   }
//                   disabled={!canAnalyze || analyzing}
//                   style={{ width: "100%", marginBottom: 8 }}
//                 >
//                   {analyzing
//                     ? "생성 중..."
//                     : hasResult
//                       ? "AI 분석 재요청"
//                       : "AI 분석 요청"}
//                 </button>

//                 <button
//                   type="button"
//                   className="btn ghost"
//                   onClick={handleResetAll}
//                   style={{ width: "100%" }}
//                 >
//                   네이밍 초기화
//                 </button>

//                 {!canAnalyze ? (
//                   <p className="hint" style={{ marginTop: 10 }}>
//                     * 필수 항목을 채우면 분석 버튼이 활성화됩니다.
//                   </p>
//                 ) : null}

//                 {analyzeError ? (
//                   <div className="aiInlineError" style={{ marginTop: 10 }}>
//                     {analyzeError}
//                   </div>
//                 ) : null}

//                 <div className="divider" />

//                 <h4 className="sideSubTitle">다음 단계</h4>
//                 {canGoNext ? (
//                   <button
//                     type="button"
//                     className="btn primary"
//                     onClick={handleGoNext}
//                     style={{ width: "100%" }}
//                   >
//                     컨셉 단계로 이동
//                   </button>
//                 ) : (
//                   <p className="hint" style={{ marginTop: 10 }}>
//                     * 제안 1개를 선택하면 다음 단계 버튼이 표시됩니다.
//                   </p>
//                 )}
//               </div>
//             </aside>
//           </div>
//         </div>
//       </main>

//       <SiteFooter onOpenPolicy={setOpenType} />
//     </div>
//   );
// }

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
 *  질문 문장(텍스트) 포함 전송용 정의
 *  - questionId: 고정 ID(백에서 저장/분석/로그에 사용)
 *  - key: form의 필드명
 *  ====================== */
const NAMING_QUESTIONS = [
  {
    questionId: "naming_style",
    questionText: "어떤 스타일의 이름을 선호하시나요?",
    key: "namingStyles",
    answerType: "single_select",
  },
  {
    questionId: "language_pref",
    questionText: "어떤 언어 기반이어야 하나요?",
    key: "languagePrefs",
    answerType: "single_select",
  },
  {
    questionId: "must_have_keywords",
    questionText: "이름에 꼭 담기거나 연상되었으면 하는 단어가 있나요?",
    key: "mustHaveKeywords",
    answerType: "text",
  },
  {
    questionId: "brand_vibe",
    questionText: "이름에서 느껴져야 할 첫인상은 무엇인가요?",
    key: "brandVibe",
    answerType: "single_select",
  },
  {
    questionId: "avoid_style",
    questionText: '"이런 느낌만은 피해주세요" 하는 것이 있나요?',
    key: "avoidStyle",
    answerType: "text",
  },
  {
    questionId: "domain_constraint",
    questionText: ".com 도메인 확보가 필수적인가요?",
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
];

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

function isFilled(v) {
  if (Array.isArray(v)) return v.length > 0;
  return Boolean(String(v ?? "").trim());
}

/** ======================
 *  백으로 보낼 payload 생성
 *  - 질문 문장 포함 qa 배열
 *  - answers는 백이 바로 쓰기 쉬운 평평한 형태
 *  ====================== */
function buildNamingPayload(
  form,
  { mode, regenSeed, brandId, diagnosisSummary },
) {
  const answersLegacy = {
    namingStyles: Array.isArray(form.namingStyles) ? form.namingStyles : [],
    languagePrefs: Array.isArray(form.languagePrefs) ? form.languagePrefs : [],
    mustHaveKeywords: safeText(form.mustHaveKeywords, ""),
    brandVibe: safeText(form.brandVibe, ""),
    avoidStyle: safeText(form.avoidStyle, ""),
    domainConstraint: safeText(form.domainConstraint, ""),
    targetEmotion: safeText(form.targetEmotion, ""),
  };

  // ✅ v2(백 전달용): 질문지 context_key 기준(스네이크 케이스)
  const answersV2 = {
    naming_style: (answersLegacy.namingStyles[0] || "").toString(),
    language_pref: (answersLegacy.languagePrefs[0] || "").toString(),
    must_have_keywords: answersLegacy.mustHaveKeywords,
    brand_vibe: answersLegacy.brandVibe,
    avoid_style: answersLegacy.avoidStyle,
    domain_constraint: answersLegacy.domainConstraint,
    target_emotion: answersLegacy.targetEmotion,
  };

  // ✅ answers는 레거시 + v2 둘 다 포함(백 호환성 강화)
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

    // ✅ 질문/답변
    answers,
    qa,

    // ✅ 이전 단계 요약(네이밍은 기업진단 요약 기반)
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
 *  - 백이 어떤 포맷을 주더라도 UI에서 쓰기 쉽게 3안 형태로 맞춤
 *  ====================== */
function normalizeNamingCandidates(raw) {
  const payload = raw?.data ?? raw?.result ?? raw;

  // ✅ 케이스 0) 백이 { name1, name2, name3 } 형태로 주는 경우
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

  // 케이스 A: ["name1","name2","name3"] 문자열 배열
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

  // 케이스 B: [{id, title, names, reason ...}] 객체 배열
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

// ✅ 네이밍 질문 옵션
const NAMING_STYLE_OPTIONS = [
  { value: "Descriptive", label: "직관적/설명적" },
  { value: "Symbolic", label: "함축적/상징적" },
  { value: "Compound Word", label: "합성어" },
  { value: "Abstract/Neologism", label: "추상적/신조어" },
];

const LANGUAGE_OPTIONS = [
  { value: "Korean", label: "순수 한글" },
  { value: "English", label: "영어 기반" },
  { value: "Any", label: "무관" },
];

const VIBE_OPTIONS = [
  { value: "Trustworthy", label: "신뢰감 있는" },
  { value: "Innovative", label: "혁신적인" },
  { value: "Friendly", label: "친근한" },
];

const DOMAIN_OPTIONS = [
  { value: "Must have .com", label: ".com 도메인 확보 필수" },
  { value: "Don't care", label: "상관없음" },
];

const INITIAL_FORM = {
  // ✅ 기업 진단에서 자동 반영(편집 X)
  companyName: "",
  industry: "",
  stage: "",
  website: "",
  oneLine: "",
  brandDesc: "",
  targetCustomer: "",

  // ✅ 네이밍 컨설팅 인터뷰(편집 O)
  namingStyles: [],
  languagePrefs: [],
  mustHaveKeywords: "",
  brandVibe: "",
  avoidStyle: "",
  domainConstraint: "",
  targetEmotion: "",
};

export default function NamingConsultingInterview({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

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
  const refInterview = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "interview", label: "네이밍 질문", ref: refInterview },
    ],
    [],
  );

  // ✅ 필수 항목
  const requiredKeys = useMemo(
    () => [
      "namingStyles",
      "languagePrefs",
      "brandVibe",
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
  const hasResult = candidates.length > 0;
  const canGoNext = Boolean(hasResult && selectedId);

  const setValue = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ✅ (핵심 수정) JSX에서 바로 쓰는 단일 선택 헬퍼(배열에 1개만 유지)
  const setSingleArrayValue = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value ? [value] : [],
    }));
  };

  // (선택) 멀티 선택용(현재는 사용 안 하지만 필요하면 사용 가능)
  const toggleArrayValue = (key, value) => {
    setForm((prev) => {
      const cur = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = cur.includes(value);
      const next = exists ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [key]: next };
    });
  };

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
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
   *  (중요) Strict Flow 가드 + brandId/진단요약 pipeline 준비
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

  // ✅ 기업 진단 값 자동 반영
  useEffect(() => {
    try {
      const diag = readDiagnosisDraftForm();
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
        brandDesc: safeText(
          diag.brandDesc ||
            diag.companyDesc ||
            diag.detailIntro ||
            diag.serviceDesc,
          "",
        ),
        targetCustomer: safeText(
          diag.targetPersona ||
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
        brandDesc: next.brandDesc || prev.brandDesc,
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

    // ✅ 이 페이지 전용 결과 저장
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

    // ✅ 레거시 저장(기존 BrandAllResults 호환)
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

    // ✅ (핵심) pipeline 저장: 다음 단계에서 그대로 사용
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
   *  ✅ 백 연동: 네이밍 생성
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

      // pipeline에서 brandId / diagnosisSummary 확보
      const p = readPipeline();
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

      // 1) 네이밍 생성
      const namingRes = await apiRequestAI(`/brands/${brandId}/naming`, {
        method: "POST",
        data: payload,
      });

      // 후보 normalize
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
        "✅ 네이밍 컨설팅 제안 3가지이 도착했어요. 아래에서 확인하고 ‘선택’을 눌러주세요.",
      );
      window.setTimeout(() => scrollToResult(), 50);
    } catch (error) {
      const status = error?.response?.status;
      console.error("Naming generate failed:", error);

      // ✅ 401/403: 인증/권한 문제
      if (status === 401 || status === 403) {
        alert(
          status === 401
            ? "로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요."
            : "권한이 없습니다(403). 보통 현재 로그인한 계정의 brandId가 아닌 값으로 요청할 때 발생합니다. 기업진단을 다시 진행해 brandId를 새로 생성한 뒤 시도해주세요.",
        );

        // 혹시 pipeline에 잘못된 brandId가 남아있을 수 있어 초기화(안전)
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

      // 이미 단계가 넘어간 경우(예: 재진입)에는 다음으로 진행 허용
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
      userRemoveItem(STORAGE_KEY);
      userRemoveItem(RESULT_KEY);
      userRemoveItem(LEGACY_KEY);
    } catch {
      // ignore
    }

    // ✅ pipeline에서도 naming부터 초기화 + 이후 단계 잠금
    try {
      clearStepsFrom("naming");
    } catch {
      // ignore
    }

    // 진단 값은 다시 자동 반영되도록
    const diag = (() => {
      try {
        return readDiagnosisDraftForm();
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
      base.brandDesc = safeText(
        diag.brandDesc ||
          diag.companyDesc ||
          diag.detailIntro ||
          diag.serviceDesc,
        "",
      );
      base.targetCustomer = safeText(
        diag.targetPersona ||
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
              <h1 className="diagInterview__title">네이밍 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                기업 진단 요약을 기반으로 네이밍 3안을 제안합니다. 선택한 1안이
                다음 단계(컨셉) 생성에 사용됩니다.
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

          <ConsultingFlowPanel activeKey="naming" />

          <div className="diagInterview__grid">
            <section className="diagInterview__left">
              {/* 1) BASIC (자동 반영) */}
              <div className="card" ref={refBasic}>
                <div className="card__head">
                  <h2>1. 기본 정보 (자동 반영)</h2>
                  <p>
                    기업 진단에서 입력한 정보를 자동으로 불러옵니다. (이
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
                      placeholder="(선택) 진단에 입력했다면 자동 반영"
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

                <div className="field">
                  <label>상세 설명</label>
                  <textarea
                    value={form.brandDesc}
                    disabled
                    placeholder="(선택) 진단 인터뷰에 입력한 값이 없다면 비어 있을 수 있어요"
                    rows={5}
                  />
                </div>
              </div>

              {/* 2) INTERVIEW */}
              <div className="card" ref={refInterview}>
                <div className="card__head">
                  <h2>2. 네이밍 질문지</h2>
                  <p>
                    아래 항목을 입력하면 네이밍 컨설팅 제안 3가지을 생성할 수
                    있어요.
                  </p>
                </div>

                <div className="field">
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
                </div>

                <div className="field">
                  <label>
                    2. 어떤 언어 기반이어야 하나요?{" "}
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
                </div>

                <div className="field">
                  <label>
                    3. 이름에 꼭 담기거나 연상되었으면 하는 단어가 있나요?
                    (선택)
                  </label>
                  <input
                    value={form.mustHaveKeywords}
                    onChange={(e) =>
                      setValue("mustHaveKeywords", e.target.value)
                    }
                    placeholder="예) pilot, guide, brand, growth (쉼표로 구분)"
                  />
                </div>

                <div className="field">
                  <label>
                    4. 이름에서 느껴져야 할 첫인상은 무엇인가요?{" "}
                    <span className="req">*</span>
                  </label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {VIBE_OPTIONS.map((opt) => {
                      const checked = form.brandVibe === opt.value;
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
                            name="brand_vibe"
                            value={opt.value}
                            checked={checked}
                            onChange={() => setValue("brandVibe", opt.value)}
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="field">
                  <label>
                    5. "이런 느낌만은 피해주세요" 하는 것이 있나요? (선택)
                  </label>
                  <input
                    value={form.avoidStyle}
                    onChange={(e) => setValue("avoidStyle", e.target.value)}
                    placeholder="예) 유치함, 과장됨, 너무 길고 어려움 (쉼표로 구분 가능)"
                  />
                </div>

                <div className="field">
                  <label>
                    6. .com 도메인 확보가 필수적인가요?{" "}
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
                            onChange={() =>
                              setValue("domainConstraint", opt.value)
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="field">
                  <label>
                    7. 고객이 이름을 듣자마자 느꼈으면 하는 딱 하나의 감정은
                    무엇인가요? <span className="req">*</span>
                  </label>
                  <input
                    value={form.targetEmotion}
                    onChange={(e) => setValue("targetEmotion", e.target.value)}
                    placeholder="예) 안심 / 기대 / 설렘 / 신뢰 / 호기심"
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
                  <div className="sideMeta__row">
                    <span className="k">단계</span>
                    <span className="v">{stageLabel(form.stage)}</span>
                  </div>
                </div>

                {saveMsg ? <p className="saveMsg">{saveMsg}</p> : null}

                <div className="divider" />

                <h4 className="sideSubTitle">필수 입력 체크</h4>
                <ul className="checkList">
                  <li className={requiredStatus.namingStyles ? "ok" : ""}>
                    1) 네이밍 스타일
                  </li>
                  <li className={requiredStatus.languagePrefs ? "ok" : ""}>
                    2) 언어 기반
                  </li>
                  <li className={requiredStatus.brandVibe ? "ok" : ""}>
                    4) 이름 첫인상
                  </li>
                  <li className={requiredStatus.domainConstraint ? "ok" : ""}>
                    6) .com 제약
                  </li>
                  <li className={requiredStatus.targetEmotion ? "ok" : ""}>
                    7) 타깃 감정
                  </li>
                </ul>

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
                  네이밍 초기화
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
        </div>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
