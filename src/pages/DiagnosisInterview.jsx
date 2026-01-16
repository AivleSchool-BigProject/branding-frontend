// // src/pages/DiagnosisInterview.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";

// import SiteHeader from "../components/SiteHeader.jsx";
// import SiteFooter from "../components/SiteFooter.jsx";

// import PolicyModal from "../components/PolicyModal.jsx";
// import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// import "../styles/DiagnosisInterview.css";

// const STORAGE_KEY = "diagnosisInterviewDraft_v1";

// export default function DiagnosisInterview({ onLogout }) {
//   const navigate = useNavigate();

//   // ✅ 약관/방침 모달
//   const [openType, setOpenType] = useState(null);
//   const closeModal = () => setOpenType(null);

//   // ✅ 폼 상태
//   const [form, setForm] = useState({
//     companyName: "",
//     industry: "",
//     stage: "",
//     website: "",
//     oneLine: "",
//     serviceDesc: "",
//     targetCustomer: "",
//     customerProblem: "",
//     usp: "",
//     goal12m: "",
//     kpi: "",
//     budget: "",
//     team: "",
//     constraints: "",
//   });

//   // ✅ 저장 상태 UI
//   const [saveMsg, setSaveMsg] = useState("");
//   const [lastSaved, setLastSaved] = useState("-");

//   // 섹션 스크롤용 ref
//   const refBasic = useRef(null);
//   const refService = useRef(null);
//   const refCustomer = useRef(null);
//   const refDiff = useRef(null);
//   const refGoal = useRef(null);
//   const refConstraints = useRef(null);

//   const sections = useMemo(
//     () => [
//       { id: "basic", label: "기본 정보", ref: refBasic },
//       { id: "service", label: "아이템/서비스", ref: refService },
//       { id: "customer", label: "고객/문제", ref: refCustomer },
//       { id: "diff", label: "차별점", ref: refDiff },
//       { id: "goal", label: "목표/KPI", ref: refGoal },
//       { id: "constraints", label: "제약/리스크", ref: refConstraints },
//     ],
//     []
//   );

//   // ✅ 필수 항목(최소로)
//   const requiredKeys = useMemo(
//     () => [
//       "companyName",
//       "industry",
//       "stage",
//       "oneLine",
//       "targetCustomer",
//       "customerProblem",
//       "usp",
//       "goal12m",
//     ],
//     []
//   );

//   const requiredStatus = useMemo(() => {
//     const status = {};
//     requiredKeys.forEach((k) => {
//       status[k] = Boolean(form[k]?.trim());
//     });
//     return status;
//   }, [form, requiredKeys]);

//   const completedRequired = useMemo(() => {
//     return requiredKeys.filter((k) => requiredStatus[k]).length;
//   }, [requiredKeys, requiredStatus]);

//   const progress = useMemo(() => {
//     if (requiredKeys.length === 0) return 0;
//     return Math.round((completedRequired / requiredKeys.length) * 100);
//   }, [completedRequired, requiredKeys.length]);

//   const canAnalyze = completedRequired === requiredKeys.length;

//   // ✅ 현재 단계(첫 미완료 섹션 기준으로 대략 추정)
//   const currentSectionLabel = useMemo(() => {
//     // basic 관련 필수
//     if (!form.companyName.trim() || !form.industry.trim() || !form.stage.trim())
//       return "기본 정보";
//     if (!form.oneLine.trim()) return "아이템/서비스";
//     if (!form.targetCustomer.trim() || !form.customerProblem.trim())
//       return "고객/문제";
//     if (!form.usp.trim()) return "차별점";
//     if (!form.goal12m.trim()) return "목표/KPI";
//     return "완료";
//   }, [form]);

//   // ✅ draft 로드
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem(STORAGE_KEY);
//       if (!raw) return;
//       const parsed = JSON.parse(raw);
//       if (parsed?.form) setForm((prev) => ({ ...prev, ...parsed.form }));
//       if (parsed?.updatedAt) {
//         const d = new Date(parsed.updatedAt);
//         if (!Number.isNaN(d.getTime())) setLastSaved(d.toLocaleString());
//       }
//     } catch {
//       // ignore
//     }
//   }, []);

//   // ✅ 자동 저장(간단 디바운스)
//   useEffect(() => {
//     setSaveMsg("");
//     const t = setTimeout(() => {
//       try {
//         const payload = { form, updatedAt: Date.now() };
//         localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
//         setLastSaved(new Date(payload.updatedAt).toLocaleString());
//         setSaveMsg("자동 저장됨");
//       } catch {
//         // ignore
//       }
//     }, 600);

//     return () => clearTimeout(t);
//   }, [form]);

//   const setValue = (key, value) => {
//     setForm((prev) => ({ ...prev, [key]: value }));
//   };

//   const handleTempSave = () => {
//     try {
//       const payload = { form, updatedAt: Date.now() };
//       localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
//       setLastSaved(new Date(payload.updatedAt).toLocaleString());
//       setSaveMsg("임시 저장 완료");
//     } catch {
//       setSaveMsg("저장 실패");
//     }
//   };

//   const scrollToSection = (ref) => {
//     if (!ref?.current) return;
//     ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
//   };

//   const handleNext = () => {
//     // 현재 단계에 따라 다음 섹션으로 이동
//     const label = currentSectionLabel;
//     const map = {
//       "기본 정보": refService,
//       "아이템/서비스": refCustomer,
//       "고객/문제": refDiff,
//       차별점: refGoal,
//       "목표/KPI": refConstraints,
//       완료: null,
//     };
//     const nextRef = map[label];
//     if (!nextRef) return;
//     scrollToSection(nextRef);
//   };

//   const handleAnalyze = () => {
//     if (!canAnalyze) {
//       alert("필수 항목을 모두 입력하면 AI 분석 요청이 가능합니다.");
//       return;
//     }
//     alert("AI 분석 요청 (테스트) → 결과 페이지로 이동");
//     // 결과 페이지 만들면 여기에 연결
//     // navigate("/diagnosis/result");
//   };

//   return (
//     <div className="diagInterview">
//       {/* ✅ 약관/방침 모달 */}
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

//       {/* ✅ 공통 헤더 */}
//       <SiteHeader onLogout={onLogout} />

//       <main className="diagInterview__main">
//         <div className="diagInterview__container">
//           {/* 상단 타이틀 */}
//           <div className="diagInterview__titleRow">
//             <div>
//               <h1 className="diagInterview__title">기업 진단 인터뷰</h1>
//               <p className="diagInterview__sub">
//                 최소 정보만 입력해도 분석이 가능하며, 입력이 많을수록 결과가 더
//                 정교해집니다.
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
//               <button type="button" className="btn" onClick={handleTempSave}>
//                 임시저장
//               </button>
//             </div>
//           </div>

//           <div className="diagInterview__grid">
//             {/* ✅ 왼쪽: 폼 */}
//             <section className="diagInterview__left">
//               {/* BASIC */}
//               <div className="card" ref={refBasic}>
//                 <div className="card__head">
//                   <h2>1. 기본 정보</h2>
//                   <p>필수 항목을 먼저 채우면 빠르게 분석할 수 있어요.</p>
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
//                     <label>
//                       산업/분야 <span className="req">*</span>
//                     </label>
//                     <input
//                       value={form.industry}
//                       onChange={(e) => setValue("industry", e.target.value)}
//                       placeholder="예) 브랜딩 / 컨설팅 / SaaS"
//                     />
//                   </div>

//                   <div className="field">
//                     <label>
//                       성장 단계 <span className="req">*</span>
//                     </label>
//                     <select
//                       value={form.stage}
//                       onChange={(e) => setValue("stage", e.target.value)}
//                     >
//                       <option value="">선택</option>
//                       <option value="idea">아이디어 단계</option>
//                       <option value="mvp">MVP/테스트 중</option>
//                       <option value="pmf">PMF 탐색</option>
//                       <option value="revenue">매출 발생</option>
//                       <option value="invest">투자 유치 진행</option>
//                     </select>
//                   </div>

//                   <div className="field">
//                     <label>웹사이트/소개 링크 (선택)</label>
//                     <input
//                       value={form.website}
//                       onChange={(e) => setValue("website", e.target.value)}
//                       placeholder="예) https://..."
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* SERVICE */}
//               <div className="card" ref={refService}>
//                 <div className="card__head">
//                   <h2>2. 아이템/서비스</h2>
//                   <p>한 줄 소개가 가장 중요해요.</p>
//                 </div>

//                 <div className="field">
//                   <label>
//                     한 줄 소개 <span className="req">*</span>
//                   </label>
//                   <input
//                     value={form.oneLine}
//                     onChange={(e) => setValue("oneLine", e.target.value)}
//                     placeholder="예) 초기 스타트업을 위한 AI 브랜딩 컨설팅 플랫폼"
//                   />
//                   <small className="helper">
//                     사용자가 ‘딱 보고’ 이해할 수 있게 써보세요.
//                   </small>
//                 </div>

//                 <div className="field">
//                   <label>서비스 설명 (선택)</label>
//                   <textarea
//                     value={form.serviceDesc}
//                     onChange={(e) => setValue("serviceDesc", e.target.value)}
//                     placeholder="예) 기업 진단 → 전략 도출 → 실행 체크리스트 제공까지..."
//                     rows={5}
//                   />
//                 </div>
//               </div>

//               {/* CUSTOMER */}
//               <div className="card" ref={refCustomer}>
//                 <div className="card__head">
//                   <h2>3. 고객/문제 정의</h2>
//                   <p>여기가 분석 품질을 가장 크게 좌우합니다.</p>
//                 </div>

//                 <div className="field">
//                   <label>
//                     타깃 고객 <span className="req">*</span>
//                   </label>
//                   <input
//                     value={form.targetCustomer}
//                     onChange={(e) => setValue("targetCustomer", e.target.value)}
//                     placeholder="예) 1~3년차 초기 스타트업 대표"
//                   />
//                 </div>

//                 <div className="field">
//                   <label>
//                     고객이 겪는 문제 <span className="req">*</span>
//                   </label>
//                   <textarea
//                     value={form.customerProblem}
//                     onChange={(e) =>
//                       setValue("customerProblem", e.target.value)
//                     }
//                     placeholder="예) 브랜드 방향이 없어서 홍보/영업 효율이 낮고, 자료 준비 시간이 과도함"
//                     rows={5}
//                   />
//                 </div>
//               </div>

//               {/* DIFF */}
//               <div className="card" ref={refDiff}>
//                 <div className="card__head">
//                   <h2>4. 차별점</h2>
//                   <p>경쟁 서비스와 비교했을 때 ‘왜 우리냐’를 정리해요.</p>
//                 </div>

//                 <div className="field">
//                   <label>
//                     차별점(USP) <span className="req">*</span>
//                   </label>
//                   <textarea
//                     value={form.usp}
//                     onChange={(e) => setValue("usp", e.target.value)}
//                     placeholder="예) 진단-전략-실행까지 한 화면에서 제공, 결과를 바로 체크리스트로 전환"
//                     rows={4}
//                   />
//                 </div>
//               </div>

//               {/* GOAL */}
//               <div className="card" ref={refGoal}>
//                 <div className="card__head">
//                   <h2>5. 목표/KPI</h2>
//                   <p>목표가 있어야 AI가 현실적인 로드맵을 제시할 수 있어요.</p>
//                 </div>

//                 <div className="field">
//                   <label>
//                     3~12개월 목표 <span className="req">*</span>
//                   </label>
//                   <textarea
//                     value={form.goal12m}
//                     onChange={(e) => setValue("goal12m", e.target.value)}
//                     placeholder="예) 3개월 내 MVP 완성, 6개월 내 500명 사용자 확보"
//                     rows={4}
//                   />
//                 </div>

//                 <div className="field">
//                   <label>KPI (선택)</label>
//                   <input
//                     value={form.kpi}
//                     onChange={(e) => setValue("kpi", e.target.value)}
//                     placeholder="예) 가입자 수, 전환율, MRR"
//                   />
//                 </div>
//               </div>

//               {/* CONSTRAINTS */}
//               <div className="card" ref={refConstraints}>
//                 <div className="card__head">
//                   <h2>6. 제약/리스크 (선택)</h2>
//                   <p>예산/인력/데이터/규제 등 현실 조건을 적어주세요.</p>
//                 </div>

//                 <div className="formGrid">
//                   <div className="field">
//                     <label>예산 (선택)</label>
//                     <input
//                       value={form.budget}
//                       onChange={(e) => setValue("budget", e.target.value)}
//                       placeholder="예) 월 100만원"
//                     />
//                   </div>

//                   <div className="field">
//                     <label>팀 구성 (선택)</label>
//                     <input
//                       value={form.team}
//                       onChange={(e) => setValue("team", e.target.value)}
//                       placeholder="예) 기획 1 / 프론트 1 / 백 1"
//                     />
//                   </div>
//                 </div>

//                 <div className="field">
//                   <label>현재 가장 막힌 점 (선택)</label>
//                   <textarea
//                     value={form.constraints}
//                     onChange={(e) => setValue("constraints", e.target.value)}
//                     placeholder="예) 고객 확보 채널이 없고, 브랜딩 방향을 잡기 어렵다"
//                     rows={4}
//                   />
//                 </div>
//               </div>

//               {/* 하단 버튼 */}
//               <div className="bottomBar">
//                 <button
//                   type="button"
//                   className="btn ghost"
//                   onClick={handleNext}
//                 >
//                   다음 섹션
//                 </button>
//                 <button type="button" className="btn" onClick={handleTempSave}>
//                   임시저장
//                 </button>
//                 <button
//                   type="button"
//                   className={`btn primary ${canAnalyze ? "" : "disabled"}`}
//                   onClick={handleAnalyze}
//                   disabled={!canAnalyze}
//                 >
//                   AI 분석 요청
//                 </button>
//               </div>
//             </section>

//             {/* ✅ 오른쪽: 진행률/가이드(Sticky) */}
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
//                   <li className={requiredStatus.industry ? "ok" : ""}>
//                     산업/분야
//                   </li>
//                   <li className={requiredStatus.stage ? "ok" : ""}>
//                     성장 단계
//                   </li>
//                   <li className={requiredStatus.oneLine ? "ok" : ""}>
//                     한 줄 소개
//                   </li>
//                   <li className={requiredStatus.targetCustomer ? "ok" : ""}>
//                     타깃 고객
//                   </li>
//                   <li className={requiredStatus.customerProblem ? "ok" : ""}>
//                     고객 문제
//                   </li>
//                   <li className={requiredStatus.usp ? "ok" : ""}>
//                     차별점(USP)
//                   </li>
//                   <li className={requiredStatus.goal12m ? "ok" : ""}>
//                     3~12개월 목표
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
//                   onClick={handleAnalyze}
//                   disabled={!canAnalyze}
//                 >
//                   AI 분석 요청
//                 </button>

//                 {!canAnalyze ? (
//                   <p className="hint">
//                     * 필수 항목을 모두 입력하면 분석 버튼이 활성화됩니다.
//                   </p>
//                 ) : null}
//               </div>
//             </aside>
//           </div>
//         </div>
//       </main>

//       {/* ✅ 공통 푸터 */}
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

const STORAGE_KEY = "diagnosisInterviewDraft_v1";
const HOME_SUMMARY_KEY = "diagnosisDraft";

export default function DiagnosisInterview({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 폼 상태
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    stage: "",
    website: "",
    oneLine: "",
    serviceDesc: "",
    targetCustomer: "",
    customerProblem: "",
    usp: "",
    goal12m: "",
    kpi: "",
    budget: "",
    team: "",
    constraints: "",
  });

  // ✅ 저장 상태 UI
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");

  // 로드 완료 플래그(이어서 진행 시 스크롤 타이밍용)
  const [loaded, setLoaded] = useState(false);

  // 섹션 스크롤용 ref
  const refBasic = useRef(null);
  const refService = useRef(null);
  const refCustomer = useRef(null);
  const refDiff = useRef(null);
  const refGoal = useRef(null);
  const refConstraints = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "service", label: "아이템/서비스", ref: refService },
      { id: "customer", label: "고객/문제", ref: refCustomer },
      { id: "diff", label: "차별점", ref: refDiff },
      { id: "goal", label: "목표/KPI", ref: refGoal },
      { id: "constraints", label: "제약/리스크", ref: refConstraints },
    ],
    []
  );

  // ✅ 필수 항목(최소로)
  const requiredKeys = useMemo(
    () => [
      "companyName",
      "industry",
      "stage",
      "oneLine",
      "targetCustomer",
      "customerProblem",
      "usp",
      "goal12m",
    ],
    []
  );

  const requiredStatus = useMemo(() => {
    const status = {};
    requiredKeys.forEach((k) => {
      status[k] = Boolean(form[k]?.trim());
    });
    return status;
  }, [form, requiredKeys]);

  const completedRequired = useMemo(() => {
    return requiredKeys.filter((k) => requiredStatus[k]).length;
  }, [requiredKeys, requiredStatus]);

  const progress = useMemo(() => {
    if (requiredKeys.length === 0) return 0;
    return Math.round((completedRequired / requiredKeys.length) * 100);
  }, [completedRequired, requiredKeys.length]);

  const canAnalyze = completedRequired === requiredKeys.length;

  // ✅ 현재 단계(첫 미완료 섹션 기준)
  const currentSectionLabel = useMemo(() => {
    if (!form.companyName.trim() || !form.industry.trim() || !form.stage.trim())
      return "기본 정보";
    if (!form.oneLine.trim()) return "아이템/서비스";
    if (!form.targetCustomer.trim() || !form.customerProblem.trim())
      return "고객/문제";
    if (!form.usp.trim()) return "차별점";
    if (!form.goal12m.trim()) return "목표/KPI";
    return "완료";
  }, [form]);

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getFirstIncompleteRef = () => {
    if (!form.companyName.trim() || !form.industry.trim() || !form.stage.trim())
      return refBasic;
    if (!form.oneLine.trim()) return refService;
    if (!form.targetCustomer.trim() || !form.customerProblem.trim())
      return refCustomer;
    if (!form.usp.trim()) return refDiff;
    if (!form.goal12m.trim()) return refGoal;
    return refConstraints;
  };

  // ✅ Home에 표시할 요약 저장
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

  // ✅ “이어서 진행하기”로 들어오면 첫 미완료 섹션으로 이동
  useEffect(() => {
    if (!loaded) return;
    const mode = location.state?.mode;
    if (mode !== "resume") return;

    // 렌더 후 스크롤(레이아웃 안정화)
    const t = setTimeout(() => {
      scrollToSection(getFirstIncompleteRef());
    }, 60);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // ✅ 자동 저장(간단 디바운스)
  useEffect(() => {
    if (!loaded) return; // 로드 중엔 저장하지 않음
    setSaveMsg("");

    const t = setTimeout(() => {
      try {
        const payload = { form, updatedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setLastSaved(new Date(payload.updatedAt).toLocaleString());
        setSaveMsg("자동 저장됨");

        // ✅ 홈 요약도 같이 저장
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

  const setValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTempSave = () => {
    try {
      const payload = { form, updatedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSaved(new Date(payload.updatedAt).toLocaleString());
      setSaveMsg("임시 저장 완료");

      // ✅ 홈 요약도 같이 저장
      saveHomeSummary(payload.updatedAt);
    } catch {
      setSaveMsg("저장 실패");
    }
  };

  const handleNext = () => {
    const label = currentSectionLabel;
    const map = {
      "기본 정보": refService,
      "아이템/서비스": refCustomer,
      "고객/문제": refDiff,
      차별점: refGoal,
      "목표/KPI": refConstraints,
      완료: null,
    };
    const nextRef = map[label];
    if (!nextRef) return;
    scrollToSection(nextRef);
  };

  const handleAnalyze = () => {
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 AI 분석 요청이 가능합니다.");
      return;
    }
    alert("AI 분석 요청 (테스트) → 결과 페이지로 이동");
    // navigate("/diagnosis/result");
  };

  return (
    <div className="diagInterview">
      {/* ✅ 약관/방침 모달 */}
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

      {/* ✅ 공통 헤더 */}
      <SiteHeader onLogout={onLogout} />

      <main className="diagInterview__main">
        <div className="diagInterview__container">
          {/* 상단 타이틀 */}
          <div className="diagInterview__titleRow">
            <div>
              <h1 className="diagInterview__title">기업 진단 인터뷰</h1>
              <p className="diagInterview__sub">
                최소 정보만 입력해도 분석이 가능하며, 입력이 많을수록 결과가 더
                정교해집니다.
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
              <button type="button" className="btn" onClick={handleTempSave}>
                임시저장
              </button>
            </div>
          </div>

          <div className="diagInterview__grid">
            {/* ✅ 왼쪽: 폼 */}
            <section className="diagInterview__left">
              {/* BASIC */}
              <div className="card" ref={refBasic}>
                <div className="card__head">
                  <h2>1. 기본 정보</h2>
                  <p>필수 항목을 먼저 채우면 빠르게 분석할 수 있어요.</p>
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
                    <label>
                      산업/분야 <span className="req">*</span>
                    </label>
                    <input
                      value={form.industry}
                      onChange={(e) => setValue("industry", e.target.value)}
                      placeholder="예) 브랜딩 / 컨설팅 / SaaS"
                    />
                  </div>

                  <div className="field">
                    <label>
                      성장 단계 <span className="req">*</span>
                    </label>
                    <select
                      value={form.stage}
                      onChange={(e) => setValue("stage", e.target.value)}
                    >
                      <option value="">선택</option>
                      <option value="idea">아이디어 단계</option>
                      <option value="mvp">MVP/테스트 중</option>
                      <option value="pmf">PMF 탐색</option>
                      <option value="revenue">매출 발생</option>
                      <option value="invest">투자 유치 진행</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>웹사이트/소개 링크 (선택)</label>
                    <input
                      value={form.website}
                      onChange={(e) => setValue("website", e.target.value)}
                      placeholder="예) https://..."
                    />
                  </div>
                </div>
              </div>

              {/* SERVICE */}
              <div className="card" ref={refService}>
                <div className="card__head">
                  <h2>2. 아이템/서비스</h2>
                  <p>한 줄 소개가 가장 중요해요.</p>
                </div>

                <div className="field">
                  <label>
                    한 줄 소개 <span className="req">*</span>
                  </label>
                  <input
                    value={form.oneLine}
                    onChange={(e) => setValue("oneLine", e.target.value)}
                    placeholder="예) 초기 스타트업을 위한 AI 브랜딩 컨설팅 플랫폼"
                  />
                  <small className="helper">
                    사용자가 ‘딱 보고’ 이해할 수 있게 써보세요.
                  </small>
                </div>

                <div className="field">
                  <label>서비스 설명 (선택)</label>
                  <textarea
                    value={form.serviceDesc}
                    onChange={(e) => setValue("serviceDesc", e.target.value)}
                    placeholder="예) 기업 진단 → 전략 도출 → 실행 체크리스트 제공까지..."
                    rows={5}
                  />
                </div>
              </div>

              {/* CUSTOMER */}
              <div className="card" ref={refCustomer}>
                <div className="card__head">
                  <h2>3. 고객/문제 정의</h2>
                  <p>여기가 분석 품질을 가장 크게 좌우합니다.</p>
                </div>

                <div className="field">
                  <label>
                    타깃 고객 <span className="req">*</span>
                  </label>
                  <input
                    value={form.targetCustomer}
                    onChange={(e) => setValue("targetCustomer", e.target.value)}
                    placeholder="예) 1~3년차 초기 스타트업 대표"
                  />
                </div>

                <div className="field">
                  <label>
                    고객이 겪는 문제 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.customerProblem}
                    onChange={(e) =>
                      setValue("customerProblem", e.target.value)
                    }
                    placeholder="예) 브랜드 방향이 없어서 홍보/영업 효율이 낮고, 자료 준비 시간이 과도함"
                    rows={5}
                  />
                </div>
              </div>

              {/* DIFF */}
              <div className="card" ref={refDiff}>
                <div className="card__head">
                  <h2>4. 차별점</h2>
                  <p>경쟁 서비스와 비교했을 때 ‘왜 우리냐’를 정리해요.</p>
                </div>

                <div className="field">
                  <label>
                    차별점(USP) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.usp}
                    onChange={(e) => setValue("usp", e.target.value)}
                    placeholder="예) 진단-전략-실행까지 한 화면에서 제공, 결과를 바로 체크리스트로 전환"
                    rows={4}
                  />
                </div>
              </div>

              {/* GOAL */}
              <div className="card" ref={refGoal}>
                <div className="card__head">
                  <h2>5. 목표/KPI</h2>
                  <p>목표가 있어야 AI가 현실적인 로드맵을 제시할 수 있어요.</p>
                </div>

                <div className="field">
                  <label>
                    3~12개월 목표 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.goal12m}
                    onChange={(e) => setValue("goal12m", e.target.value)}
                    placeholder="예) 3개월 내 MVP 완성, 6개월 내 500명 사용자 확보"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>KPI (선택)</label>
                  <input
                    value={form.kpi}
                    onChange={(e) => setValue("kpi", e.target.value)}
                    placeholder="예) 가입자 수, 전환율, MRR"
                  />
                </div>
              </div>

              {/* CONSTRAINTS */}
              <div className="card" ref={refConstraints}>
                <div className="card__head">
                  <h2>6. 제약/리스크 (선택)</h2>
                  <p>예산/인력/데이터/규제 등 현실 조건을 적어주세요.</p>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>예산 (선택)</label>
                    <input
                      value={form.budget}
                      onChange={(e) => setValue("budget", e.target.value)}
                      placeholder="예) 월 100만원"
                    />
                  </div>

                  <div className="field">
                    <label>팀 구성 (선택)</label>
                    <input
                      value={form.team}
                      onChange={(e) => setValue("team", e.target.value)}
                      placeholder="예) 기획 1 / 프론트 1 / 백 1"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>현재 가장 막힌 점 (선택)</label>
                  <textarea
                    value={form.constraints}
                    onChange={(e) => setValue("constraints", e.target.value)}
                    placeholder="예) 고객 확보 채널이 없고, 브랜딩 방향을 잡기 어렵다"
                    rows={4}
                  />
                </div>
              </div>

              {/* 하단 버튼 */}
              <div className="bottomBar">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleNext}
                >
                  다음 섹션
                </button>
                <button type="button" className="btn" onClick={handleTempSave}>
                  임시저장
                </button>
                <button
                  type="button"
                  className={`btn primary ${canAnalyze ? "" : "disabled"}`}
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                >
                  AI 분석 요청
                </button>
              </div>
            </section>

            {/* ✅ 오른쪽: 진행률/가이드(Sticky는 CSS 그대로 쓰면 됨) */}
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
                  <li className={requiredStatus.industry ? "ok" : ""}>
                    산업/분야
                  </li>
                  <li className={requiredStatus.stage ? "ok" : ""}>
                    성장 단계
                  </li>
                  <li className={requiredStatus.oneLine ? "ok" : ""}>
                    한 줄 소개
                  </li>
                  <li className={requiredStatus.targetCustomer ? "ok" : ""}>
                    타깃 고객
                  </li>
                  <li className={requiredStatus.customerProblem ? "ok" : ""}>
                    고객 문제
                  </li>
                  <li className={requiredStatus.usp ? "ok" : ""}>
                    차별점(USP)
                  </li>
                  <li className={requiredStatus.goal12m ? "ok" : ""}>
                    3~12개월 목표
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
                    canAnalyze ? "" : "disabled"
                  }`}
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                >
                  AI 분석 요청
                </button>

                {!canAnalyze ? (
                  <p className="hint">
                    * 필수 항목을 모두 입력하면 분석 버튼이 활성화됩니다.
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* ✅ 공통 푸터 */}
      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
