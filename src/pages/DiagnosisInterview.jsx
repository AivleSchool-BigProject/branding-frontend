// // src/pages/DiagnosisInterview.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useLocation, useNavigate } from "react-router-dom";

// import SiteHeader from "../components/SiteHeader.jsx";
// import SiteFooter from "../components/SiteFooter.jsx";

// import PolicyModal from "../components/PolicyModal.jsx";
// import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// const STORAGE_KEY = "diagnosisInterviewDraft_v1";
// const HOME_SUMMARY_KEY = "diagnosisDraft";

// const INDUSTRY_OPTIONS = [
//   { value: "saas_platform", label: "SaaS/플랫폼" },
//   { value: "commerce", label: "커머스" },
//   { value: "healthcare", label: "헬스케어" },
//   { value: "education", label: "교육" },
// ];

// const STAGE_OPTIONS = [
//   { value: "idea", label: "아이디어 단계" },
//   { value: "mvp", label: "MVP 개발 중" },
//   { value: "early_revenue", label: "초기 매출 발생" },
//   { value: "scaleup", label: "스케일업" },
// ];

// const PERSONA_OPTIONS = [
//   { value: "trend_2030", label: "2030 트렌드 세터" },
//   { value: "worker_3040", label: "3040 직장인" },
//   { value: "startup_ceo", label: "초기 스타트업 대표" },
//   { value: "mid_team_lead", label: "중견기업 팀장" },
//   { value: "professional", label: "전문직" },
// ];

// export default function DiagnosisInterview({ onLogout }) {
//   const navigate = useNavigate();
//   const location = useLocation();

//   // ✅ 약관/방침 모달 UI
//   const [openType, setOpenType] = useState(null);
//   const closeModal = () => setOpenType(null);

//   // ✅ 폼 상태
//   const [form, setForm] = useState({
//     companyName: "", // ✅ 필수
//     website: "", // ✅ 선택

//     oneLine: "",
//     customerProblem: "",
//     targetPersona: "",
//     usp: "",
//     stage: "",
//     industry: "",
//     visionHeadline: "",
//   });

//   // ✅ 저장 상태 UI (자동저장만 사용)
//   const [saveMsg, setSaveMsg] = useState("");
//   const [lastSaved, setLastSaved] = useState("-");
//   const [loaded, setLoaded] = useState(false);

//   // ✅ 섹션 스크롤용 ref
//   const refBasic = useRef(null);
//   const refOneLine = useRef(null);
//   const refCustomer = useRef(null);
//   const refUsp = useRef(null);
//   const refStatus = useRef(null);
//   const refVision = useRef(null);

//   const sections = useMemo(
//     () => [
//       { id: "basic", label: "기본 정보", ref: refBasic },
//       { id: "oneLine", label: "한 문장 정의", ref: refOneLine },
//       { id: "customer", label: "문제/타겟", ref: refCustomer },
//       { id: "usp", label: "USP", ref: refUsp },
//       { id: "status", label: "단계/산업군", ref: refStatus },
//       { id: "vision", label: "헤드라인", ref: refVision },
//     ],
//     [],
//   );

//   // ✅ 필수 항목(website 제외)
//   const requiredKeys = useMemo(
//     () => [
//       "companyName",
//       "oneLine",
//       "customerProblem",
//       "targetPersona",
//       "usp",
//       "stage",
//       "industry",
//       "visionHeadline",
//     ],
//     [],
//   );

//   const requiredStatus = useMemo(() => {
//     const status = {};
//     requiredKeys.forEach((k) => {
//       status[k] = Boolean(String(form[k] || "").trim());
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

//   const currentSectionLabel = useMemo(() => {
//     if (!String(form.companyName || "").trim()) return "기본 정보";
//     if (!String(form.oneLine || "").trim()) return "한 문장 정의";
//     if (
//       !String(form.customerProblem || "").trim() ||
//       !String(form.targetPersona || "").trim()
//     )
//       return "문제/타겟";
//     if (!String(form.usp || "").trim()) return "USP";
//     if (!String(form.stage || "").trim() || !String(form.industry || "").trim())
//       return "단계/산업군";
//     if (!String(form.visionHeadline || "").trim()) return "헤드라인";
//     return "완료";
//   }, [form]);

//   const scrollToSection = (ref) => {
//     if (!ref?.current) return;
//     ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
//   };

//   const getFirstIncompleteRef = () => {
//     if (!String(form.companyName || "").trim()) return refBasic;
//     if (!String(form.oneLine || "").trim()) return refOneLine;
//     if (
//       !String(form.customerProblem || "").trim() ||
//       !String(form.targetPersona || "").trim()
//     )
//       return refCustomer;
//     if (!String(form.usp || "").trim()) return refUsp;
//     if (!String(form.stage || "").trim() || !String(form.industry || "").trim())
//       return refStatus;
//     if (!String(form.visionHeadline || "").trim()) return refVision;
//     return refVision;
//   };

//   const saveHomeSummary = (updatedAtTs) => {
//     try {
//       const summary = {
//         progress,
//         completedRequired,
//         requiredTotal: requiredKeys.length,
//         stageLabel: currentSectionLabel,
//         updatedAt: updatedAtTs,
//       };
//       localStorage.setItem(HOME_SUMMARY_KEY, JSON.stringify(summary));
//     } catch {
//       // ignore
//     }
//   };

//   // ✅ draft 로드
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem(STORAGE_KEY);
//       if (!raw) {
//         setLoaded(true);
//         return;
//       }
//       const parsed = JSON.parse(raw);
//       if (parsed?.form) setForm((prev) => ({ ...prev, ...parsed.form }));

//       if (parsed?.updatedAt) {
//         const d = new Date(parsed.updatedAt);
//         if (!Number.isNaN(d.getTime())) setLastSaved(d.toLocaleString());
//       }
//     } catch {
//       // ignore
//     } finally {
//       setLoaded(true);
//     }
//   }, []);

//   // ✅ resume 모드 이동
//   useEffect(() => {
//     if (!loaded) return;
//     const mode = location.state?.mode;
//     if (mode !== "resume") return;

//     const t = setTimeout(() => {
//       scrollToSection(getFirstIncompleteRef());
//     }, 60);

//     return () => clearTimeout(t);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [loaded]);

//   // ✅ 자동 저장(디바운스)
//   useEffect(() => {
//     if (!loaded) return;
//     setSaveMsg("");

//     const t = setTimeout(() => {
//       try {
//         const payload = { form, updatedAt: Date.now() };
//         localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
//         setLastSaved(new Date(payload.updatedAt).toLocaleString());
//         setSaveMsg("자동 저장됨");
//         saveHomeSummary(payload.updatedAt);
//       } catch {
//         // ignore
//       }
//     }, 600);

//     return () => clearTimeout(t);
//   }, [
//     form,
//     loaded,
//     progress,
//     completedRequired,
//     requiredKeys.length,
//     currentSectionLabel,
//   ]);

//   const setValue = (key, value) =>
//     setForm((prev) => ({ ...prev, [key]: value }));

//   const handleViewResult = () => {
//     if (!canAnalyze) {
//       alert("필수 항목을 모두 입력하면 AI 요약 결과를 볼 수 있어요.");
//       return;
//     }

//     try {
//       const payload = {
//         progress,
//         completedRequired,
//         requiredTotal: requiredKeys.length,
//         stageLabel: currentSectionLabel,
//         updatedAt: Date.now(),
//       };
//       localStorage.setItem(HOME_SUMMARY_KEY, JSON.stringify(payload));
//     } catch {
//       // ignore
//     }

//     navigate("/diagnosis/result", {
//       state: { from: "diagnosisInterview", next: "/brandconsulting" },
//     });
//   };

//   return (
//     <div className="diagInterview">
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
//               <h1 className="diagInterview__title">
//                 초기 진단 인터뷰 (Foundation)
//               </h1>
//               <p className="diagInterview__sub">
//                 필수 항목을 모두 입력하면 AI가 내용을 요약해 “진단 결과”를
//                 보여줘요. 결과 페이지에서 브랜드 컨설팅으로 넘어갈 수 있어요.
//               </p>
//             </div>

//             <div className="diagInterview__topActions">
//               <button
//                 type="button"
//                 className="btn ghost"
//                 onClick={() => navigate("/diagnosis")}
//               >
//                 진단 홈으로
//               </button>
//             </div>
//           </div>

//           <div className="diagInterview__grid">
//             <section className="diagInterview__left">
//               {/* 0) BASIC */}
//               <div className="card" ref={refBasic}>
//                 <div className="card__head">
//                   <h2>0. 기본 정보</h2>
//                   <p>회사/프로젝트명은 필수입니다. 링크는 있으면 좋아요.</p>
//                 </div>

//                 <div className="formGrid">
//                   <div className="field">
//                     <label>
//                       회사/프로젝트명 <span className="req">*</span>
//                     </label>
//                     <input
//                       value={form.companyName}
//                       onChange={(e) => setValue("companyName", e.target.value)}
//                       placeholder="예) BRANDPILOT"
//                     />
//                   </div>

//                   <div className="field">
//                     <label>웹사이트/소개 링크 (선택)</label>
//                     <input
//                       value={form.website}
//                       onChange={(e) => setValue("website", e.target.value)}
//                       placeholder="예) https://... 또는 노션/구글독 링크"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* 1) ONE LINE */}
//               <div className="card" ref={refOneLine}>
//                 <div className="card__head">
//                   <h2>1. 한 문장 정의</h2>
//                   <p>아주 쉬운 말로 한 문장만 딱 적어보세요.</p>
//                 </div>

//                 <div className="field">
//                   <label>
//                     10살 조카에게 설명한다면 한 문장으로?{" "}
//                     <span className="req">*</span>
//                   </label>
//                   <input
//                     value={form.oneLine}
//                     onChange={(e) => setValue("oneLine", e.target.value)}
//                     placeholder="예) 누구를 위해 무엇을 도와주는 서비스인지 한 문장으로"
//                   />
//                 </div>
//               </div>

//               {/* 2~3) CUSTOMER / PERSONA */}
//               <div className="card" ref={refCustomer}>
//                 <div className="card__head">
//                   <h2>2. 문제 / 3. 타겟</h2>
//                   <p>문제와 타겟이 또렷할수록 분석 결과가 더 정확해져요.</p>
//                 </div>

//                 <div className="field">
//                   <label>
//                     서비스를 안 쓰면 겪는 가장 큰 문제는?{" "}
//                     <span className="req">*</span>
//                   </label>
//                   <textarea
//                     value={form.customerProblem}
//                     onChange={(e) =>
//                       setValue("customerProblem", e.target.value)
//                     }
//                     placeholder="예) 고객이 겪는 상황, 불편함, 손해(시간/돈/스트레스)를 구체적으로"
//                     rows={5}
//                   />
//                 </div>

//                 <div className="field">
//                   <label>
//                     핵심 고객층(찐팬 페르소나 선택){" "}
//                     <span className="req">*</span>
//                   </label>
//                   <select
//                     value={form.targetPersona}
//                     onChange={(e) => setValue("targetPersona", e.target.value)}
//                   >
//                     <option value="">선택</option>
//                     {PERSONA_OPTIONS.map((opt) => (
//                       <option key={opt.value} value={opt.value}>
//                         {opt.label}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               {/* 4) USP */}
//               <div className="card" ref={refUsp}>
//                 <div className="card__head">
//                   <h2>4. USP</h2>
//                   <p>경쟁사가 못 따라 하는 ‘결정적 이유’를 적어보세요.</p>
//                 </div>

//                 <div className="field">
//                   <label>
//                     경쟁사가 못 따라 할 우리만의 무기(USP){" "}
//                     <span className="req">*</span>
//                   </label>
//                   <textarea
//                     value={form.usp}
//                     onChange={(e) => setValue("usp", e.target.value)}
//                     placeholder="예) 데이터/네트워크/실행력/전문성/독점 자원 등"
//                     rows={4}
//                   />
//                 </div>
//               </div>

//               {/* 5~6) STAGE / INDUSTRY */}
//               <div className="card" ref={refStatus}>
//                 <div className="card__head">
//                   <h2>5. 단계 / 6. 산업군</h2>
//                   <p>현재 상태를 선택하면 분석 기준이 더 명확해져요.</p>
//                 </div>

//                 <div className="formGrid">
//                   <div className="field">
//                     <label>
//                       현재 비즈니스 완성도(단계 선택){" "}
//                       <span className="req">*</span>
//                     </label>
//                     <select
//                       value={form.stage}
//                       onChange={(e) => setValue("stage", e.target.value)}
//                     >
//                       <option value="">선택</option>
//                       {STAGE_OPTIONS.map((opt) => (
//                         <option key={opt.value} value={opt.value}>
//                           {opt.label}
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div className="field">
//                     <label>
//                       산업군 선택 <span className="req">*</span>
//                     </label>
//                     <select
//                       value={form.industry}
//                       onChange={(e) => setValue("industry", e.target.value)}
//                     >
//                       <option value="">선택</option>
//                       {INDUSTRY_OPTIONS.map((opt) => (
//                         <option key={opt.value} value={opt.value}>
//                           {opt.label}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>
//               </div>

//               {/* 7) VISION HEADLINE */}
//               <div className="card" ref={refVision}>
//                 <div className="card__head">
//                   <h2>7. 헤드라인</h2>
//                 </div>

//                 <div className="field">
//                   <label>
//                     어떤 제목으로 기사에 나올까? <span className="req">*</span>
//                   </label>
//                   <textarea
//                     value={form.visionHeadline}
//                     onChange={(e) => setValue("visionHeadline", e.target.value)}
//                     placeholder='예) "OOO, 1만 기업의 브랜딩 실행을 자동화하다"'
//                     rows={4}
//                   />
//                 </div>
//               </div>

//               {/* ✅ bottomBar 제거 완료 */}
//             </section>

//             <aside className="diagInterview__right">
//               <div className="sideCard">
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
//                     <span className="k">현재 단계</span>
//                     <span className="v">{currentSectionLabel}</span>
//                   </div>
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
//                 </div>

//                 {saveMsg ? <p className="saveMsg">{saveMsg}</p> : null}

//                 <div className="divider" />

//                 <h4 className="sideSubTitle">필수 입력 체크</h4>
//                 <ul className="checkList">
//                   <li className={requiredStatus.companyName ? "ok" : ""}>
//                     회사/프로젝트명
//                   </li>
//                   <li className={requiredStatus.oneLine ? "ok" : ""}>
//                     1) 한 문장 정의
//                   </li>
//                   <li className={requiredStatus.customerProblem ? "ok" : ""}>
//                     2) 가장 큰 문제
//                   </li>
//                   <li className={requiredStatus.targetPersona ? "ok" : ""}>
//                     3) 핵심 고객층
//                   </li>
//                   <li className={requiredStatus.usp ? "ok" : ""}>4) USP</li>
//                   <li className={requiredStatus.stage ? "ok" : ""}>
//                     5) 비즈니스 단계
//                   </li>
//                   <li className={requiredStatus.industry ? "ok" : ""}>
//                     6) 산업군
//                   </li>
//                   <li className={requiredStatus.visionHeadline ? "ok" : ""}>
//                     7) 헤드라인
//                   </li>
//                 </ul>

//                 <div className="divider" />

//                 <h4 className="sideSubTitle">빠른 이동</h4>
//                 <div className="jumpGrid">
//                   {sections.map((s) => (
//                     <button
//                       key={s.id}
//                       type="button"
//                       className="jumpBtn"
//                       onClick={() => scrollToSection(s.ref)}
//                     >
//                       {s.label}
//                     </button>
//                   ))}
//                 </div>

//                 <button
//                   type="button"
//                   className={`btn primary sideAnalyze ${
//                     canAnalyze ? "" : "disabled"
//                   }`}
//                   onClick={handleViewResult}
//                   disabled={!canAnalyze}
//                 >
//                   AI 요약 결과 보기
//                 </button>

//                 {!canAnalyze ? (
//                   <p className="hint">
//                     * 필수 항목을 모두 입력하면 결과 보기 버튼이 활성화됩니다.
//                   </p>
//                 ) : null}
//               </div>
//             </aside>
//           </div>
//         </div>
//       </main>

//       <SiteFooter onOpenPolicy={setOpenType} />
//     </div>
//   );
// }

// src/pages/DiagnosisInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// ✅ 팀 코드의 백 연동 방식 사용
import { apiRequest } from "../api/client.js";

const STORAGE_KEY = "diagnosisInterviewDraft_v1";
const HOME_SUMMARY_KEY = "diagnosisDraft";

// ✅ 백 연동 결과 저장 키(결과 페이지/리포트에서 활용 가능)
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

  // ✅ 제출 상태(백 연동 중)
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      localStorage.setItem(HOME_SUMMARY_KEY, JSON.stringify(summary));
    } catch {
      // ignore
    }
  };

  // ✅ draft 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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

  // ✅ AI 요약 결과 보기(= 백엔드 연동)
  const handleViewResult = async () => {
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 AI 요약 결과를 볼 수 있어요.");
      return;
    }
    if (isSubmitting) return;

    // 홈 요약 저장(기존 유지)
    try {
      const payload = {
        progress,
        completedRequired,
        requiredTotal: requiredKeys.length,
        stageLabel: currentSectionLabel,
        updatedAt: Date.now(),
      };
      localStorage.setItem(HOME_SUMMARY_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }

    try {
      setIsSubmitting(true);

      // ✅ 백으로 보낼 인터뷰 JSON
      const interviewPayload = {
        companyName: form.companyName,
        website: form.website,
        oneLine: form.oneLine,
        customerProblem: form.customerProblem,
        targetPersona: form.targetPersona,
        usp: form.usp,
        stage: form.stage,
        industry: form.industry,
        visionHeadline: form.visionHeadline,
      };

      // ✅ 백 호출: POST /brands/interview (JWT 필요)
      const result = await apiRequest("/brands/interview", {
        method: "POST",
        data: interviewPayload,
      });

      // ✅ 응답 저장(결과 페이지에서 활용)
      try {
        localStorage.setItem(
          DIAGNOSIS_RESULT_KEY,
          JSON.stringify({
            ...result, // { brandId, interviewReport }
            input: interviewPayload,
            savedAt: Date.now(),
          }),
        );
      } catch {
        // ignore
      }

      navigate("/diagnosis/result", {
        state: {
          from: "diagnosisInterview",
          next: "/brandconsulting",
          brandId: result?.brandId,
          interviewReport: result?.interviewReport,
        },
      });
    } catch (err) {
      // 팀 apiRequest 에러 구조 대응
      const msg =
        err?.userMessage ||
        err?.message ||
        "AI 요약 요청 중 오류가 발생했습니다.";

      // 인증 문제 가능성(토큰 만료/미로그인)
      if (
        String(msg).includes("401") ||
        String(msg).toLowerCase().includes("unauthorized")
      ) {
        alert(
          "로그인이 필요하거나 세션이 만료되었습니다. 다시 로그인해주세요.",
        );
        navigate("/login");
        return;
      }

      alert(msg);
    } finally {
      setIsSubmitting(false);
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
                필수 항목을 모두 입력하면 AI가 내용을 요약해 “진단 결과”를
                보여줘요. 결과 페이지에서 브랜드 컨설팅으로 넘어갈 수 있어요.
              </p>
            </div>

            <div className="diagInterview__topActions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate("/diagnosis")}
              >
                진단 홈으로
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
                  {isSubmitting ? "AI 분석 중..." : "AI 요약 결과 보기"}
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
