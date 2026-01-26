// src/pages/DiagnosisHome.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteFooter from "../components/SiteFooter.jsx";
import SiteHeader from "../components/SiteHeader.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// ✅ 배너 이미지(요청 반영): 기업진단 & 인터뷰 홈 배너 → Banner_D 사용
import bannerImage from "../Image/banner_image/Banner_D.png";

/**
 * [DiagnosisHome] 기업진단 홈 페이지
 * ------------------------------------------------------------
 * ✅ 화면 목적
 * - 기업진단 & 인터뷰 홈 배너 노출
 * - "진단 시작하기" / "이어서 진행하기" / "처음부터 다시" 제공
 * - 현재까지 저장된 draft 기반 진행률/단계/마지막 저장시간 표시
 *
 * ✅ 현재 프론트 구현 상태(로컬스토리지 기반)
 * - Interview 페이지에서 저장한 draft를 localStorage에서 읽어 진행률 계산
 * - HOME_SUMMARY_KEY(요약) → 없으면 INTERVIEW_STORAGE_KEY(원본) fallback
 *
 * ✅ BACKEND 연동 포인트(핵심)
 * 1) draft 저장 위치
 *   - 지금: localStorage
 *   - 백 연동 후: 서버 DB에 사용자별 draft 저장/불러오기
 *   - 권장 API 예시:
 *     - GET  /diagnosis/draft        (현재 사용자 draft 조회)
 *     - POST /diagnosis/draft        (draft 저장/업데이트)
 *     - DELETE /diagnosis/draft      (draft 초기화)
 *
 * 2) 히스토리/리포트 페이지와 연결
 *   - "로그인 상태에서 결과가 저장" 문구가 있으므로
 *   - 사용자 인증 토큰(Authorization) 필요
 *
 * 3) 테스트용 handleSeed
 *   - 백 연동 후엔 서버에 seed 데이터를 넣는 테스트 API로 바꾸거나
 *   - 개발 빌드에서만 활성화하도록 조건 처리 권장
 */

/**
 * Interview 페이지에서 쓰는 draft 키
 * (DiagnosisInterview.jsx의 STORAGE_KEY와 동일하게 맞춰야 함)
 *
 * 지금은 "클라이언트 로컬 저장" 방식이라 키 값 통일이 중요함.
 * BACKEND로 옮기면 이 키 자체는 없어질 수도 있고,
 * "서버 draft" + "로컬 캐시" 형태로 남을 수도 있음.
 */
const INTERVIEW_STORAGE_KEY = "diagnosisInterviewDraft_v1";

/**
 * Home에서 표시용으로 저장하는 요약 키
 * (Interview에서 progress/stageLabel/updatedAt 저장)
 *
 * - HOME은 progress 계산을 매번 원본 form으로 하지 않고,
 *   요약값을 우선 사용해서 렌더링 성능/단순화를 얻는 구조.
 */
const HOME_SUMMARY_KEY = "diagnosisDraft";

/**
 * Interview 페이지 필수 키
 * - 홈에서도 동일 기준으로 진행률 계산 fallback
 * - REQUIRED_KEYS가 늘어나면 progress 계산 기준도 바뀜
 */
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

  /**
   * UI STATE: 푸터/헤더 등에서 약관/방침 모달을 열기 위한 값
   * - "privacy" | "terms" | null
   */
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 요청 반영
  // - 기업진단 홈에서 '기업 진단 프로세스(단계 카드)' 섹션 제거
  // - 대신 상단에 배너 이미지를 사용해 목적/톤을 한 번에 전달

  // =========================================================
  // ✅ 홈 표시용 draft
  // ---------------------------------------------------------
  // STATE: 화면에 보여줄 "진행률 요약 정보"
  // - 로컬 기준: { progress, completedRequired, requiredTotal, stageLabel, updatedAt }
  //
  // BACKEND 연동 후:
  // - 이 draft를 서버에서 받아오거나,
  // - 로컬 캐시 + 서버 동기화로 관리할 수 있음.
  // =========================================================
  const [draft, setDraft] = useState(null);

  /**
   * [calcProgressFromForm]
   * - Interview 원본 form을 기준으로 REQUIRED_KEYS 채움 개수로 진행률 계산
   * - form이 없으면 0%
   *
   * BACKEND:
   * - 서버에서도 동일한 규칙으로 progress를 계산해 내려줄 수도 있고,
   * - 프론트에서만 계산해도 됨(서버 응답에 form이 있다면)
   */
  const calcProgressFromForm = (form) => {
    if (!form)
      return { progress: 0, completed: 0, total: REQUIRED_KEYS.length };
    const completed = REQUIRED_KEYS.filter((k) =>
      Boolean(form[k]?.trim()),
    ).length;
    const total = REQUIRED_KEYS.length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { progress, completed, total };
  };

  /**
   * [guessStageLabelFromForm]
   * - 현재 입력 상황을 사람이 읽기 쉬운 "현재 단계" 텍스트로 매핑
   * - form 필드 채움 정도를 기준으로 "기본 정보/고객/문제..." 등 반환
   *
   * BACKEND:
   * - stageLabel을 서버에서 계산해 내려줄 수도 있고,
   * - 프론트에서 그대로 계산해도 됨
   */
  const guessStageLabelFromForm = (form) => {
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

  /**
   * [loadDraft]
   * ------------------------------------------------------------
   * 현재 구조(로컬스토리지 기반):
   * 1) HOME_SUMMARY_KEY(요약)를 먼저 읽어서 빠르게 표시
   * 2) 없으면 INTERVIEW_STORAGE_KEY(원본 draft)에서 직접 계산해서 fallback
   *
   * BACKEND로 옮길 때:
   * - 이 함수 자리에 "GET /diagnosis/draft" 호출이 들어갈 가능성이 큼
   * - 다만 UX를 위해 "로컬 캐시 → 서버 동기화" 구조를 유지할 수도 있음
   */
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

  /**
   * EFFECT: 최초 진입 시 draft 로드
   *
   * BACKEND:
   * - 여기서 서버 draft를 조회하는 API 호출로 대체될 수 있음
   * - 예: GET /diagnosis/draft (Authorization 필요)
   *
   * TODO(BACKEND):
   * - 서버에서 draft가 없으면 null 처리
   * - 로딩 상태(isLoading) 도입하면 UX 개선 가능
   */
  useEffect(() => {
    setDraft(loadDraft());
  }, []);

  // =========================================================
  // ✅ UI 표시용 파생 값들(useMemo)
  // - draft가 바뀔 때만 계산되도록 memo
  // =========================================================

  // 진행률: 0~100으로 clamp
  const progress = useMemo(() => {
    const p = Number(draft?.progress ?? 0);
    if (!Number.isFinite(p)) return 0;
    return Math.max(0, Math.min(100, p));
  }, [draft]);

  // 현재 단계 텍스트
  const stageLabel = useMemo(() => {
    return draft?.stageLabel ?? "미시작";
  }, [draft]);

  // 마지막 저장 시간(로컬 timestamp → locale string)
  // BACKEND: 서버는 ISO string("2026-01-20T...")로 줄 수도 있으니 파싱 로직 확인 필요
  const lastSaved = useMemo(() => {
    const t = draft?.updatedAt;
    if (!t) return "-";
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
  }, [draft]);

  // 필수 완료 개수
  const requiredDone = useMemo(() => {
    const v = Number(draft?.completedRequired ?? 0);
    return Number.isFinite(v) ? v : 0;
  }, [draft]);

  // 필수 총 개수
  const requiredTotal = useMemo(() => {
    const v = Number(draft?.requiredTotal ?? REQUIRED_KEYS.length);
    return Number.isFinite(v) ? v : REQUIRED_KEYS.length;
  }, [draft]);

  // =========================================================
  // ✅ 버튼 동작
  // ---------------------------------------------------------
  // 이 페이지는 "라우팅 + 로컬데이터 관리"가 핵심
  // BACKEND가 붙으면 draft 저장/삭제가 서버 호출로 바뀔 수 있음
  // =========================================================

  /**
   * [handleStart]
   * - “기업 진단 시작하기” → 인터뷰 페이지로 이동
   * - mode: start (Interview가 기존 draft를 자동 로드하거나, 빈 값으로 시작하도록 처리 가능)
   *
   * BACKEND(선택):
   * - 진단 세션을 서버에서 만들고 싶다면:
   *   POST /diagnosis/session 또는 POST /diagnosis/start
   *   response: { sessionId }
   *   이후 /diagnosisinterview?sessionId=... 또는 state로 전달
   */
  const handleStart = () => {
    navigate("/diagnosisinterview", { state: { mode: "start" } });
  };

  /**
   * [handleResume]
   * - “이어서 진행하기” → draft 있을 때만 이동
   *
   * BACKEND:
   * - draft를 서버에서 조회하는 구조면,
   *   이동 전에 draft 존재 여부를 서버 기준으로 판단해야 할 수도 있음
   */
  const handleResume = () => {
    if (!draft) return;
    navigate("/diagnosisinterview", { state: { mode: "resume" } });
  };

  /**
   * [handleRestart]
   * - “처음부터 다시 하기” → 로컬스토리지 draft 삭제 후 상태 초기화
   *
   * BACKEND:
   * - 서버에도 draft가 저장되는 구조면
   *   DELETE /diagnosis/draft 같은 API 호출이 필요할 수 있음
   * - 또는 "새 진단 시작" 개념으로 서버에 새 세션 생성
   */
  const handleRestart = () => {
    // 로컬 초기화(현재 구현)
    localStorage.removeItem(INTERVIEW_STORAGE_KEY);
    localStorage.removeItem(HOME_SUMMARY_KEY);
    setDraft(null);

    // TODO(BACKEND):
    // - 서버 draft도 삭제해야 한다면 여기서 API 호출 필요
    // - 성공/실패에 따라 안내 메시지 분기

    alert("진단 데이터를 초기화했습니다. 이제 인터뷰는 공백으로 시작됩니다.");
  };

  /**
   * [handleSeed] (개발/테스트용)
   * - 샘플 저장 데이터를 로컬에 생성해 진행률 UI를 확인하는 용도
   *
   * BACKEND:
   * - 운영 환경에서는 제거하거나 숨기는 것이 안전
   * - 필요 시 관리자/개발 모드에서만 노출 추천
   */
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
      JSON.stringify({ form: sampleForm, updatedAt }),
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
      {/* =====================================================
          UI: 개인정보/약관 모달
         ===================================================== */}
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

      {/* =====================================================
          ✅ 공통 헤더
          - onLogout은 상위(App)에서 내려주는 로그아웃 로직
          BACKEND:
          - 토큰 삭제/세션 종료 API 등을 onLogout에서 처리할 가능성이 큼
         ===================================================== */}
      <SiteHeader onLogout={onLogout} />
      {/* ✅ Hero: 브랜드/홍보물 컨설팅 배너와 동일한 크기(높이)로 맞춤 */}
      <section className="diagHome__hero">
        <div className="diagHome__heroInner">
          {/* ✅ 기업진단 & 인터뷰 홈 배너 (Banner_D) */}
          <div className="diagHome__banner" aria-label="기업 진단 & 인터뷰 배너">
            <img
              className="diagHome__bannerImg"
              src={bannerImage}
              alt="기업 진단 & 인터뷰 배너"
            />
            <div className="diagHome__bannerOverlay">
              <p className="diagHome__bannerKicker">Company Analyze</p>
              <h1 className="diagHome__bannerTitle">기업 진단 &amp; 인터뷰</h1>
              <p className="diagHome__bannerSub">
                간단한 정보를 입력하면 AI가 빠르게 분석하고, 주요 문제와 추천 전략을
                제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="diagHome__main">
        {/* =====================================================
            UI: 시작하기 카드 + 가이드 카드
           ===================================================== */}
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
                {/* BACKEND 주의:
                    - "로그인 상태에서 결과가 저장" => 서버 저장 전제
                    - localStorage만 쓰면 브라우저/기기 바뀌면 데이터 사라짐
                    - 백 연동 후 이 문구가 실제로 보장됨
                 */}
                • 로그인 상태에서 결과가 저장됩니다
                <br />
                • 중간 저장 후 이어서 진행 가능
                <br />• 리포트는 히스토리에서 다시 확인 가능
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            UI: 진행률 표시 영역
            - draft 기반으로 progress/stage/lastSaved를 노출
           ===================================================== */}
        <section className="diagHome__progressWrap">
          <div className="diagHome__progressInner">
            <h2 className="diagHome__progressTitle">
              기업 진단 진행률 및 정보 표시
            </h2>

            {/* UI: Progress bar (aria 포함) */}
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

            {/* UI: 진행 메타 정보 */}
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

          {/* =====================================================
              UI: 진행 관련 액션
              - resume는 draft가 있을 때만 활성화
              - restart는 draft 삭제
             ===================================================== */}
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

          {/* 개발/테스트 버튼: 배포 시 숨김 권장 */}
          <button
            className="diagHome__devSeed"
            type="button"
            onClick={handleSeed}
          >
            테스트 저장 생성
          </button>
        </section>
      </main>

      {/* UI: 공통 푸터(약관 모달 열기 지원) */}
      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
