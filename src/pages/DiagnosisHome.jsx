// // src/pages/DiagnosisHome.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";

// import SiteFooter from "../components/SiteFooter.jsx";
// import SiteHeader from "../components/SiteHeader.jsx";

// import PolicyModal from "../components/PolicyModal.jsx";
// import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// export default function DiagnosisHome({ onLogout }) {
//   const navigate = useNavigate();

//   // ✅ 푸터 약관/방침 모달
//   const [openType, setOpenType] = useState(null);
//   const closeModal = () => setOpenType(null);

//   // ✅ 4칸 프로세스
//   const steps = useMemo(
//     () => [
//       {
//         n: 1,
//         title: "기본 정보 입력",
//         bullets: ["성장단계/산업/아이템 입력", "문제·예산·팀·12개월 목표 정리"],
//       },
//       {
//         n: 2,
//         title: "AI 분석",
//         bullets: ["리스크/병목 자동 분석", "영역별 점수화 + 이슈 요약"],
//       },
//       {
//         n: 3,
//         title: "우선순위 & 로드맵",
//         bullets: ["핵심 과제 우선순위 도출", "4~12주 실행 로드맵 초안 생성"],
//       },
//       {
//         n: 4,
//         title: "결과 및 전략",
//         bullets: ["체크리스트/KPI 제안", "맞춤 컨설팅 추천"],
//       },
//     ],
//     []
//   );

//   // ===== localStorage 진행률(테스트용) =====
//   const [draft, setDraft] = useState(null);

//   const loadDraft = () => {
//     try {
//       const raw = localStorage.getItem("diagnosisDraft");
//       return raw ? JSON.parse(raw) : null;
//     } catch {
//       return null;
//     }
//   };

//   useEffect(() => {
//     setDraft(loadDraft());
//   }, []);

//   const progress = useMemo(() => {
//     const p = Number(draft?.progress ?? 0);
//     if (!Number.isFinite(p)) return 0;
//     return Math.max(0, Math.min(100, p));
//   }, [draft]);

//   const stageLabel = useMemo(() => {
//     const stage = Number(draft?.stage ?? 0);
//     switch (stage) {
//       case 1:
//         return "기본 정보 입력";
//       case 2:
//         return "AI 분석";
//       case 3:
//         return "우선순위 & 로드맵";
//       case 4:
//         return "결과 및 전략";
//       default:
//         return "미시작";
//     }
//   }, [draft]);

//   const lastSaved = useMemo(() => {
//     const t = draft?.updatedAt;
//     if (!t) return "-";
//     const d = new Date(t);
//     return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
//   }, [draft]);

//   const handleStart = () => alert("기업 진단 시작 (테스트)");
//   const handleResume = () => {
//     if (!draft) return;
//     alert(`이어서 진행 (테스트)\n단계: ${stageLabel}\n진행률: ${progress}%`);
//   };
//   const handleRestart = () => {
//     localStorage.removeItem("diagnosisDraft");
//     setDraft(null);
//     alert("진단 데이터를 초기화했습니다. (localStorage 삭제)");
//   };
//   const handleSeed = () => {
//     const sample = { progress: 35, stage: 2, updatedAt: Date.now() };
//     localStorage.setItem("diagnosisDraft", JSON.stringify(sample));
//     setDraft(sample);
//     alert("테스트 저장 데이터를 만들었습니다! (진행률 35%, AI 분석 단계)");
//   };

//   return (
//     <div className="diagHome">
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

//       {/* ✅ 공통 헤더 사용 */}
//       <SiteHeader onLogout={onLogout} />

//       <main className="diagHome__main">
//         <section className="diagHome__heroCard">
//           <p className="diagHome__heroText">
//             간단한 정보를 입력하면 AI가 빠르게 분석하고, 주요 문제와 추천 전략을
//             제공합니다.
//           </p>

//           <div className="processCard">
//             <div className="processCard__head">
//               <h3 className="processCard__title">기업 진단 프로세스</h3>
//               <div className="processCard__sub">
//                 입력 → 분석 → 우선순위 → 전략까지 한 번에
//               </div>
//             </div>

//             <ol className="processGrid" aria-label="기업 진단 단계">
//               {steps.map((s) => (
//                 <li className="processItem" key={s.n}>
//                   <div className="processItem__top">
//                     <span className="processItem__badge">{s.n}</span>
//                     <div className="processItem__title">{s.title}</div>
//                   </div>
//                   <ul className="processItem__list">
//                     {s.bullets.map((b, i) => (
//                       <li key={i}>{b}</li>
//                     ))}
//                   </ul>
//                 </li>
//               ))}
//             </ol>
//           </div>
//         </section>

//         <section className="diagHome__topGrid">
//           <button
//             className="diagHome__startCard"
//             type="button"
//             onClick={handleStart}
//           >
//             기업 진단 시작하기
//             <div className="diagHome__startSub">
//               평균 3~5분 · 결과 리포트 + 실행 체크리스트 제공
//             </div>
//           </button>

//           <div className="diagHome__rightCard">
//             <div className="diagHome__rightHint">
//               <div className="diagHome__rightTitle">가이드</div>
//               <div className="diagHome__rightDesc">
//                 • 로그인 상태에서 결과가 저장됩니다
//                 <br />
//                 • 중간 저장 후 이어서 진행 가능
//                 <br />• 리포트는 히스토리에서 다시 확인 가능
//               </div>
//             </div>
//           </div>
//         </section>

//         <section className="diagHome__progressWrap">
//           <div className="diagHome__progressInner">
//             <h2 className="diagHome__progressTitle">
//               기업 진단 진행률 및 정보 표시
//             </h2>

//             <div
//               className="diagHome__progressBar"
//               role="progressbar"
//               aria-valuemin={0}
//               aria-valuemax={100}
//               aria-valuenow={progress}
//             >
//               <div
//                 className="diagHome__progressFill"
//                 style={{ width: `${progress}%` }}
//               />
//             </div>

//             <div className="diagHome__meta">
//               <div className="diagHome__metaRow">
//                 <span className="diagHome__metaKey">현재 단계</span>
//                 <span className="diagHome__metaVal">{stageLabel}</span>
//               </div>
//               <div className="diagHome__metaRow">
//                 <span className="diagHome__metaKey">진행률</span>
//                 <span className="diagHome__metaVal">{progress}%</span>
//               </div>
//               <div className="diagHome__metaRow">
//                 <span className="diagHome__metaKey">마지막 저장</span>
//                 <span className="diagHome__metaVal">{lastSaved}</span>
//               </div>
//             </div>
//           </div>

//           <div className="diagHome__actions">
//             <button
//               className="diagHome__actionBtn"
//               type="button"
//               onClick={handleResume}
//               disabled={!draft}
//             >
//               이어서 진행하기
//             </button>
//             <button
//               className="diagHome__actionBtn diagHome__actionBtn--ghost"
//               type="button"
//               onClick={handleRestart}
//             >
//               처음부터 다시 하기
//             </button>
//           </div>

//           <button
//             className="diagHome__devSeed"
//             type="button"
//             onClick={handleSeed}
//           >
//             테스트 저장 생성
//           </button>
//         </section>
//       </main>

//       <SiteFooter onOpenPolicy={setOpenType} />
//     </div>
//   );
// }

// src/pages/DiagnosisHome.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteFooter from "../components/SiteFooter.jsx";
import SiteHeader from "../components/SiteHeader.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

/**
 * Interview 페이지에서 쓰는 draft 키
 * (DiagnosisInterview.jsx의 STORAGE_KEY와 동일하게 맞춰야 함)
 */
const INTERVIEW_STORAGE_KEY = "diagnosisInterviewDraft_v1";

/**
 * Home에서 표시용으로 저장하는 요약 키
 * (Interview에서 progress/stageLabel/updatedAt 저장)
 */
const HOME_SUMMARY_KEY = "diagnosisDraft";

/** Interview 페이지 필수 키(홈에서도 동일 기준으로 진행률 계산 fallback) */
const REQUIRED_KEYS = [
  "companyName",
  "industry",
  "stage",
  "oneLine",
  "targetCustomer",
  "customerProblem",
  "usp",
  "goal12m",
];

export default function DiagnosisHome({ onLogout }) {
  const navigate = useNavigate();

  // ✅ 푸터 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 4칸 프로세스(표시용)
  const steps = useMemo(
    () => [
      {
        n: 1,
        title: "기본 정보 입력",
        bullets: ["성장단계/산업/아이템 입력", "문제·예산·팀·12개월 목표 정리"],
      },
      {
        n: 2,
        title: "AI 분석",
        bullets: ["리스크/병목 자동 분석", "영역별 점수화 + 이슈 요약"],
      },
      {
        n: 3,
        title: "우선순위 & 로드맵",
        bullets: ["핵심 과제 우선순위 도출", "4~12주 실행 로드맵 초안 생성"],
      },
      {
        n: 4,
        title: "결과 및 전략",
        bullets: ["체크리스트/KPI 제안", "맞춤 컨설팅 추천"],
      },
    ],
    []
  );

  // ===== 홈 표시용 draft =====
  const [draft, setDraft] = useState(null);

  const calcProgressFromForm = (form) => {
    if (!form)
      return { progress: 0, completed: 0, total: REQUIRED_KEYS.length };
    const completed = REQUIRED_KEYS.filter((k) =>
      Boolean(form[k]?.trim())
    ).length;
    const total = REQUIRED_KEYS.length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { progress, completed, total };
  };

  const guessStageLabelFromForm = (form) => {
    // Interview에서 쓰던 기준과 동일하게 대략 “현재 단계” 텍스트를 반환
    if (!form) return "미시작";
    if (
      !form.companyName?.trim() ||
      !form.industry?.trim() ||
      !form.stage?.trim()
    )
      return "기본 정보";
    if (!form.oneLine?.trim()) return "아이템/서비스";
    if (!form.targetCustomer?.trim() || !form.customerProblem?.trim())
      return "고객/문제";
    if (!form.usp?.trim()) return "차별점";
    if (!form.goal12m?.trim()) return "목표/KPI";
    return "완료";
  };

  const loadDraft = () => {
    // 1) 홈 요약 키 먼저 읽기(Interview가 자동으로 저장해줌)
    try {
      const raw = localStorage.getItem(HOME_SUMMARY_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }

    // 2) 요약이 없으면 Interview 원본 draft에서 직접 계산해서 fallback
    try {
      const raw2 = localStorage.getItem(INTERVIEW_STORAGE_KEY);
      if (!raw2) return null;
      const parsed = JSON.parse(raw2);
      const form = parsed?.form;
      const { progress, completed, total } = calcProgressFromForm(form);
      return {
        progress,
        completedRequired: completed,
        requiredTotal: total,
        stageLabel: guessStageLabelFromForm(form),
        updatedAt: parsed?.updatedAt ?? null,
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    setDraft(loadDraft());
  }, []);

  // ✅ 홈에서 진행률 표시
  const progress = useMemo(() => {
    const p = Number(draft?.progress ?? 0);
    if (!Number.isFinite(p)) return 0;
    return Math.max(0, Math.min(100, p));
  }, [draft]);

  const stageLabel = useMemo(() => {
    return draft?.stageLabel ?? "미시작";
  }, [draft]);

  const lastSaved = useMemo(() => {
    const t = draft?.updatedAt;
    if (!t) return "-";
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
  }, [draft]);

  const requiredDone = useMemo(() => {
    const v = Number(draft?.completedRequired ?? 0);
    return Number.isFinite(v) ? v : 0;
  }, [draft]);

  const requiredTotal = useMemo(() => {
    const v = Number(draft?.requiredTotal ?? REQUIRED_KEYS.length);
    return Number.isFinite(v) ? v : REQUIRED_KEYS.length;
  }, [draft]);

  // ✅ 버튼 동작
  const handleStart = () => {
    // “기업 진단 시작하기” → 인터뷰 페이지로 이동
    // (초기/중간 여부는 Interview가 저장된 draft를 자동 로드)
    navigate("/diagnosisinterview", { state: { mode: "start" } });
  };

  const handleResume = () => {
    // “이어서 진행하기” → draft 있을 때만
    if (!draft) return;
    navigate("/diagnosisinterview", { state: { mode: "resume" } });
  };

  const handleRestart = () => {
    // “처음부터 다시 하기” → 로컬스토리지 draft 삭제해서 Interview가 공백으로 시작하게 함
    localStorage.removeItem(INTERVIEW_STORAGE_KEY);
    localStorage.removeItem(HOME_SUMMARY_KEY);
    setDraft(null);
    alert("진단 데이터를 초기화했습니다. 이제 인터뷰는 공백으로 시작됩니다.");
  };

  // (개발/테스트용) 샘플 저장 생성
  const handleSeed = () => {
    // Interview 원본 draft 형태로 저장 (form 일부만 채움)
    const sampleForm = {
      companyName: "BRANDPILOT",
      industry: "브랜딩/컨설팅/SaaS",
      stage: "mvp",
      oneLine: "",
      targetCustomer: "",
      customerProblem: "",
      usp: "",
      goal12m: "",
      website: "",
      serviceDesc: "",
      kpi: "",
      budget: "",
      team: "",
      constraints: "",
    };

    const updatedAt = Date.now();
    localStorage.setItem(
      INTERVIEW_STORAGE_KEY,
      JSON.stringify({ form: sampleForm, updatedAt })
    );

    // Home 요약도 같이 저장
    const { progress, completed, total } = calcProgressFromForm(sampleForm);
    const summary = {
      progress,
      completedRequired: completed,
      requiredTotal: total,
      stageLabel: guessStageLabelFromForm(sampleForm),
      updatedAt,
    };
    localStorage.setItem(HOME_SUMMARY_KEY, JSON.stringify(summary));

    setDraft(summary);
    alert("테스트 저장 데이터를 만들었습니다! (일부만 입력된 상태)");
  };

  return (
    <div className="diagHome">
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

      {/* ✅ 공통 헤더 사용 */}
      <SiteHeader onLogout={onLogout} />

      <main className="diagHome__main">
        <section className="diagHome__heroCard">
          <p className="diagHome__heroText">
            간단한 정보를 입력하면 AI가 빠르게 분석하고, 주요 문제와 추천 전략을
            제공합니다.
          </p>

          <div className="processCard">
            <div className="processCard__head">
              <h3 className="processCard__title">기업 진단 프로세스</h3>
              <div className="processCard__sub">
                입력 → 분석 → 우선순위 → 전략까지 한 번에
              </div>
            </div>

            <ol className="processGrid" aria-label="기업 진단 단계">
              {steps.map((s) => (
                <li className="processItem" key={s.n}>
                  <div className="processItem__top">
                    <span className="processItem__badge">{s.n}</span>
                    <div className="processItem__title">{s.title}</div>
                  </div>
                  <ul className="processItem__list">
                    {s.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="diagHome__topGrid">
          <button
            className="diagHome__startCard"
            type="button"
            onClick={handleStart}
          >
            기업 진단 시작하기
            <div className="diagHome__startSub">
              평균 3~5분 · 결과 리포트 + 실행 체크리스트 제공
            </div>
          </button>

          <div className="diagHome__rightCard">
            <div className="diagHome__rightHint">
              <div className="diagHome__rightTitle">가이드</div>
              <div className="diagHome__rightDesc">
                • 로그인 상태에서 결과가 저장됩니다
                <br />
                • 중간 저장 후 이어서 진행 가능
                <br />• 리포트는 히스토리에서 다시 확인 가능
              </div>
            </div>
          </div>
        </section>

        <section className="diagHome__progressWrap">
          <div className="diagHome__progressInner">
            <h2 className="diagHome__progressTitle">
              기업 진단 진행률 및 정보 표시
            </h2>

            <div
              className="diagHome__progressBar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="diagHome__progressFill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="diagHome__meta">
              <div className="diagHome__metaRow">
                <span className="diagHome__metaKey">현재 단계</span>
                <span className="diagHome__metaVal">{stageLabel}</span>
              </div>
              <div className="diagHome__metaRow">
                <span className="diagHome__metaKey">진행률</span>
                <span className="diagHome__metaVal">{progress}%</span>
              </div>
              <div className="diagHome__metaRow">
                <span className="diagHome__metaKey">필수 완료</span>
                <span className="diagHome__metaVal">
                  {requiredDone}/{requiredTotal}
                </span>
              </div>
              <div className="diagHome__metaRow">
                <span className="diagHome__metaKey">마지막 저장</span>
                <span className="diagHome__metaVal">{lastSaved}</span>
              </div>
            </div>
          </div>

          <div className="diagHome__actions">
            <button
              className="diagHome__actionBtn"
              type="button"
              onClick={handleResume}
              disabled={!draft}
            >
              이어서 진행하기
            </button>
            <button
              className="diagHome__actionBtn diagHome__actionBtn--ghost"
              type="button"
              onClick={handleRestart}
            >
              처음부터 다시 하기
            </button>
          </div>

          <button
            className="diagHome__devSeed"
            type="button"
            onClick={handleSeed}
          >
            테스트 저장 생성
          </button>
        </section>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
