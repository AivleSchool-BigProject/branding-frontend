// src/pages/BrandConsultingResult.jsx
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// ✅ 필드 라벨(공용)
const FIELD_LABELS = {
  companyName: "회사/프로젝트명",
  industry: "산업/분야",
  stage: "성장 단계",
  website: "웹사이트/소개 링크",
  oneLine: "한 줄 소개",
  brandDesc: "브랜드/서비스 상세 설명",

  targetCustomer: "타깃 고객",
  tone: "원하는 톤/성격",
  keywords: "핵심 키워드",
  avoidWords: "피하고 싶은 단어/뉘앙스",
  language: "언어",
  lengthPref: "길이 선호",
  mustInclude: "반드시 포함",
  competitorNames: "경쟁사/유사 서비스 이름",
  goal: "목표",
  useCase: "사용처",
  domainNeed: "도메인/계정 고려사항",

  brandPersonality: "브랜드 성격(인격)",
  avoidKeywords: "피하고 싶은 키워드/느낌",
  logoType: "로고 타입",
  styleRefs: "참고 스타일/레퍼런스",
  colorPref: "선호 색상/톤",
  colorAvoid: "피하고 싶은 색상",
  usagePlaces: "주요 사용처",
  mustAvoid: "반드시 피할 요소",
  competitorLogos: "경쟁사/유사 로고 참고",
  legalNotes: "법적/상표 고려사항",
  deliverables: "희망 산출물",
  notes: "추가 메모",

  siteGoal: "사이트 목표",
  primaryAction: "핵심 CTA(버튼)",
  mainSections: "필요한 섹션(목록)",
  keyContent: "반드시 보여줄 핵심 내용",
  productsServices: "상품/서비스 설명",
  pricing: "가격/요금 노출 방식",
  styleTone: "스타일/톤",
  referenceSites: "레퍼런스 사이트/링크",
  imagesAssets: "이미지/로고/영상 자료",
  devicePriority: "우선 디바이스",
  features: "필요 기능",
  integrations: "연동/도구",
  cms: "원하는 구현 방식",
  constraints: "제약/리스크",
  deadline: "희망 일정",
  budget: "예산",

  // ✅ story 전용
  brandCore: "브랜드 핵심(정체성/가치)",
  originStory: "시작 계기(Origin)",
  problemStory: "고객 문제(Problem)",
  solutionStory: "해결 방식(Solution)",
  keyMessages: "핵심 메시지",
  proof: "근거/증거(성과/수치/사례)",
};

function stageLabel(stage) {
  const s = String(stage || "");
  if (s === "idea") return "아이디어 단계";
  if (s === "mvp") return "MVP/테스트 중";
  if (s === "pmf") return "PMF 탐색";
  if (s === "revenue") return "매출 발생";
  if (s === "invest") return "투자 유치 진행";
  return "-";
}

const SERVICE_CONFIG = {
  naming: {
    title: "네이밍 컨설팅 결과 리포트",
    sub: "입력 내용을 기반으로 요약 리포트를 생성했습니다. (현재는 UI/연결용 더미 리포트)",
    storageKey: "brandInterview_naming_v1",
    resetKeys: [
      "namingConsultingInterviewDraft_v1",
      "brandInterview_naming_v1",
    ],
    interviewPath: "/nameconsulting", // ✅ App.jsx와 일치
    requiredKeys: [
      "companyName",
      "industry",
      "stage",
      "oneLine",
      "targetCustomer",
      "tone",
      "keywords",
      "goal",
    ],
    blocks: [
      {
        title: "요약",
        fields: ["companyName", "industry", "stage", "oneLine"],
      },
      {
        title: "네이밍 방향",
        fields: [
          "targetCustomer",
          "tone",
          "keywords",
          "avoidWords",
          "language",
          "lengthPref",
          "mustInclude",
          "domainNeed",
        ],
      },
      {
        title: "활용/추가",
        fields: ["useCase", "competitorNames", "brandDesc", "website", "notes"],
      },
    ],
  },

  logo: {
    title: "로고 컨설팅 결과 리포트",
    sub: "입력 내용을 기반으로 요약 리포트를 생성했습니다. (현재는 UI/연결용 더미 리포트)",
    storageKey: "brandInterview_logo_v1",
    resetKeys: ["logoConsultingInterviewDraft_v1", "brandInterview_logo_v1"],
    interviewPath: "/logoconsulting", // ✅ App.jsx와 일치
    requiredKeys: [
      "companyName",
      "industry",
      "stage",
      "oneLine",
      "targetCustomer",
      "brandPersonality",
      "keywords",
      "goal",
    ],
    blocks: [
      {
        title: "요약",
        fields: ["companyName", "industry", "stage", "oneLine"],
      },
      {
        title: "로고 방향",
        fields: [
          "targetCustomer",
          "brandPersonality",
          "keywords",
          "avoidKeywords",
        ],
      },
      {
        title: "디자인 요구",
        fields: [
          "logoType",
          "usagePlaces",
          "colorPref",
          "colorAvoid",
          "styleRefs",
        ],
      },
      {
        title: "제약/리스크",
        fields: ["mustInclude", "mustAvoid", "competitorLogos", "legalNotes"],
      },
      {
        title: "목표/추가 요청",
        fields: ["goal", "deliverables", "notes", "website"],
      },
    ],
  },

  homepage: {
    title: "홈페이지 컨설팅 결과 리포트",
    sub: "입력 내용을 기반으로 요약 리포트를 생성했습니다. (현재는 UI/연결용 더미 리포트)",
    storageKey: "brandInterview_homepage_v1",
    resetKeys: [
      "homepageConsultingInterviewDraft_v1",
      "brandInterview_homepage_v1",
    ],
    interviewPath: "/homepageconsulting", // ✅ App.jsx와 일치
    requiredKeys: [
      "companyName",
      "industry",
      "stage",
      "oneLine",
      "siteGoal",
      "primaryAction",
      "targetCustomer",
      "mainSections",
    ],
    blocks: [
      {
        title: "요약",
        fields: ["companyName", "industry", "stage", "oneLine"],
      },
      {
        title: "목적/타깃",
        fields: ["siteGoal", "primaryAction", "targetCustomer"],
      },
      {
        title: "콘텐츠/구성",
        fields: ["mainSections", "keyContent", "productsServices", "pricing"],
      },
      {
        title: "디자인/UX",
        fields: [
          "styleTone",
          "referenceSites",
          "colorPref",
          "colorAvoid",
          "imagesAssets",
          "devicePriority",
        ],
      },
      { title: "기능/기술", fields: ["features", "integrations", "cms"] },
      {
        title: "제약/일정/추가",
        fields: ["constraints", "deadline", "budget", "website", "notes"],
      },
    ],
  },

  // ✅ NEW: story 추가
  story: {
    title: "브랜드 스토리 컨설팅 결과 리포트",
    sub: "입력 내용을 기반으로 요약 리포트를 생성했습니다. (현재는 UI/연결용 더미 리포트)",
    storageKey: "brandInterview_story_v1",
    resetKeys: [
      "brandStoryConsultingInterviewDraft_v1",
      "brandInterview_story_v1",
    ],
    interviewPath: "/brandstoryconsulting", // ✅ SiteHeader/Router와 일치
    requiredKeys: [
      "companyName",
      "industry",
      "stage",
      "oneLine",
      "targetCustomer",
      "brandCore",
      "goal",
    ],
    blocks: [
      {
        title: "요약",
        fields: [
          "companyName",
          "industry",
          "stage",
          "oneLine",
          "targetCustomer",
        ],
      },
      { title: "브랜드 핵심", fields: ["brandCore"] },
      {
        title: "스토리 구성",
        fields: ["originStory", "problemStory", "solutionStory"],
      },
      { title: "톤/메시지", fields: ["tone", "keyMessages"] },
      { title: "목표/근거", fields: ["goal", "proof", "notes", "website"] },
    ],
  },
};

function renderValue(value) {
  const v = String(value ?? "").trim();
  return v ? v : "-";
}

export default function BrandConsultingResult({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  const service = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const s = sp.get("service") || "naming";
    return SERVICE_CONFIG[s] ? s : "naming";
  }, [location.search]);

  const config = SERVICE_CONFIG[service];

  const draft = useMemo(() => {
    try {
      const raw = localStorage.getItem(config.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [config.storageKey]);

  const form = draft?.form || {};
  const requiredKeys = config.requiredKeys;

  const requiredStatus = useMemo(() => {
    const status = {};
    requiredKeys.forEach((k) => {
      status[k] = Boolean(String(form?.[k] || "").trim());
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

  const lastSaved = useMemo(() => {
    const t = draft?.updatedAt;
    if (!t) return "-";
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
  }, [draft]);

  const handleResetAll = () => {
    config.resetKeys.forEach((k) => localStorage.removeItem(k));
    alert("해당 컨설팅 입력/결과 데이터를 초기화했습니다.");
    navigate(config.interviewPath);
  };

  const handleGoInterview = () => navigate(config.interviewPath);
  const handleGoHome = () => navigate("/brandconsulting");

  return (
    <div className="diagResult">
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

      <main className="diagResult__main">
        <div className="diagResult__container">
          <div className="diagResult__titleRow">
            <div>
              <h1 className="diagResult__title">{config.title}</h1>
              <p className="diagResult__sub">{config.sub}</p>
            </div>

            <div className="diagResult__topActions">
              <button
                type="button"
                className="btn ghost"
                onClick={handleGoHome}
              >
                브랜드 컨설팅 홈
              </button>
              <button type="button" className="btn" onClick={handleGoInterview}>
                인터뷰로 돌아가기
              </button>
            </div>
          </div>

          <div className="diagResult__grid">
            <section className="diagResult__left">
              {!draft ? (
                <div className="card">
                  <div className="card__head">
                    <h2>저장된 결과가 없습니다</h2>
                    <p>
                      인터뷰에서 <b>AI 분석 요청</b> 버튼을 누르면 결과가
                      생성됩니다.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={handleGoInterview}
                    >
                      인터뷰 작성하러 가기
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={handleGoHome}
                    >
                      브랜드 컨설팅 홈
                    </button>
                  </div>
                </div>
              ) : (
                config.blocks.map((b, idx) => {
                  if (b.title === "요약") {
                    return (
                      <div className="card" key={idx}>
                        <div className="card__head">
                          <h2>{b.title}</h2>
                          <p>핵심 정보만 빠르게 확인합니다.</p>
                        </div>

                        <div className="summaryGrid">
                          {b.fields.map((f) => (
                            <div className="summaryItem" key={f}>
                              <div className="k">{FIELD_LABELS[f] || f}</div>
                              <div className="v">
                                {f === "stage"
                                  ? stageLabel(form.stage)
                                  : renderValue(form[f])}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            fontSize: 12,
                            color: "#6b7280",
                          }}
                        >
                          마지막 저장: {lastSaved}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="card" key={idx}>
                      <div className="card__head">
                        <h2>{b.title}</h2>
                        <p>입력 값을 기반으로 리포트 UI를 구성합니다.</p>
                      </div>

                      {b.fields.map((f) => (
                        <div className="block" key={f}>
                          <div className="block__title">
                            {FIELD_LABELS[f] || f}
                          </div>
                          <div
                            className="block__body"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {renderValue(
                              f === "stage" ? stageLabel(form.stage) : form[f],
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </section>

            <aside className="diagResult__right">
              <div className="sideCard">
                <div className="sideCard__titleRow">
                  <h3>진행/상태</h3>
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
                </div>

                <div className="divider" />

                <button
                  type="button"
                  className="btn primary w100"
                  onClick={handleGoInterview}
                >
                  입력 수정하기
                </button>

                <button
                  type="button"
                  className="btn ghost w100"
                  onClick={handleResetAll}
                  style={{ marginTop: 10 }}
                >
                  처음부터 다시하기(초기화)
                </button>

                <p className="hint">
                  * service 값에 따라 다른 localStorage 키를 읽어 다른 결과를
                  보여줍니다.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
