// src/pages/BrandConsulting.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import bannerImage from "../Image/banner_image/Banner_B.png";

// ✅ 기업진단 단계(추가)
import diagnosisImg from "../Image/main_image/companyanalyze.png";
import Logocon from "../Image/brandcon_image/LOGO.png";
import namecon from "../Image/brandcon_image/NAME.png";
import conceptcon from "../Image/brandcon_image/CONCEPT.png";
import storycon from "../Image/brandcon_image/STORY.png";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

import SiteFooter from "../components/SiteFooter.jsx";
import SiteHeader from "../components/SiteHeader.jsx";

import {
  migrateLegacyToPipelineIfNeeded,
  readPipeline,
  consumeBrandFlowPendingAbort,
  resetBrandConsultingToDiagnosisStart,
} from "../utils/brandPipelineStorage.js";

export default function BrandConsulting({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ pipeline 상태(브랜드 컨설팅 흐름의 단일 소스)
  const [pipeline, setPipeline] = useState(() => readPipeline());

  // ✅ 1회 마이그레이션 + 상태 동기화
  useEffect(() => {
    // ✅ 새로고침/탭닫기 등 중도 이탈 감지 → 기업진단부터 재시작 유도
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

    const next = migrateLegacyToPipelineIfNeeded();
    setPipeline(next);
  }, []);

  const pickedSection = location.state?.section || null;

  const steps = useMemo(
    () => [
      {
        key: "diagnosis",
        title: "기업진단 & 인터뷰",
        sub: "브랜드 컨설팅의 기준 데이터(요약)를 만들기 위한 기업진단 단계",
        img: diagnosisImg,
        tag: "Diagnosis",
        route: "/diagnosisinterview",
      },
      {
        key: "naming",
        title: "네이밍",
        sub: "기업진단 요약을 바탕으로 네이밍 3안을 제안",
        img: namecon,
        tag: "Naming",
        route: "/brand/naming/interview",
      },
      {
        key: "concept",
        title: "컨셉",
        sub: "선택한 네이밍 + 기업진단 요약으로 컨셉 3안을 제안",
        img: conceptcon,
        tag: "Concept",
        route: "/brand/concept/interview",
      },
      {
        key: "story",
        title: "브랜드 스토리",
        sub: "선택한 컨셉 기반으로 설득력 있는 스토리 3안을 제안",
        img: storycon,
        tag: "Story",
        route: "/brand/story",
      },
      {
        key: "logo",
        title: "로고",
        sub: "선택한 스토리/컨셉에 맞춘 로고 방향 3안을 제안",
        img: Logocon,
        tag: "Logo",
        route: "/brand/logo/interview",
      },
    ],
    [],
  );

  const status = useMemo(() => {
    const hasDiagnosis = Boolean(
      pipeline?.diagnosisSummary?.companyName ||
      pipeline?.diagnosisSummary?.oneLine,
    );
    const hasNaming = Boolean(
      pipeline?.naming?.selectedId || pipeline?.naming?.selected,
    );
    const hasConcept = Boolean(
      pipeline?.concept?.selectedId || pipeline?.concept?.selected,
    );
    const hasStory = Boolean(
      pipeline?.story?.selectedId || pipeline?.story?.selected,
    );
    const hasLogo = Boolean(
      pipeline?.logo?.selectedId || pipeline?.logo?.selected,
    );

    return { hasDiagnosis, hasNaming, hasConcept, hasStory, hasLogo };
  }, [pipeline]);

  const unlocked = useMemo(() => {
    const naming = status.hasDiagnosis;
    const concept = status.hasDiagnosis && status.hasNaming;
    const story = status.hasDiagnosis && status.hasNaming && status.hasConcept;
    const logo =
      status.hasDiagnosis &&
      status.hasNaming &&
      status.hasConcept &&
      status.hasStory;
    return { naming, concept, story, logo };
  }, [status]);

  const nextStep = useMemo(() => {
    if (!status.hasDiagnosis) return "diagnosis";
    if (!status.hasNaming) return "naming";
    if (!status.hasConcept) return "concept";
    if (!status.hasStory) return "story";
    if (!status.hasLogo) return "logo";
    return "done";
  }, [status]);

  const nextRoute = useMemo(() => {
    if (nextStep === "diagnosis") return "/diagnosisinterview";
    if (nextStep === "naming") return "/brand/naming/interview";
    if (nextStep === "concept") return "/brand/concept/interview";
    if (nextStep === "story") return "/brand/story";
    if (nextStep === "logo") return "/brand/logo/interview";
    return "/mypage";
  }, [nextStep]);

  const ctaText = useMemo(() => {
    if (nextStep === "diagnosis") return "기업진단 먼저 진행하기";
    if (nextStep === "naming") return "네이밍부터 시작하기";
    if (nextStep === "concept") return "컨셉 이어서 진행하기";
    if (nextStep === "story") return "스토리 이어서 진행하기";
    if (nextStep === "logo") return "로고 이어서 진행하기";
    return "마이페이지에서 리포트 보기";
  }, [nextStep]);

  const isBrandConsultingCompleted =
    status.hasDiagnosis &&
    status.hasNaming &&
    status.hasConcept &&
    status.hasStory &&
    status.hasLogo;

  const handlePrimaryCTA = () => {
    if (nextStep === "diagnosis") {
      alert(
        "브랜드 컨설팅은 기업진단 요약을 기반으로 진행됩니다. 기업진단을 먼저 완료해주세요.",
      );
      navigate("/diagnosisinterview", { state: { mode: "start" } });
      return;
    }
    navigate(nextRoute, { state: { flow: "brand" } });
  };

  const handleViewFinalReport = () => {
    if (!isBrandConsultingCompleted) return;
    navigate("/mypage");
  };

  const labelMap = {
    logo: "로고 컨설팅",
    naming: "네이밍 컨설팅",
    homepage: "컨셉 컨설팅",
    story: "브랜드 스토리 컨설팅",
  };

  const diagSummaryText = pipeline?.diagnosisSummary?.shortText || "";

  return (
    <div className="brand-page">
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

      <section className="brand-hero">
        <div className="brand-hero-inner">
          <div className="hero-banner" aria-label="브랜딩 컨설팅 소개">
            <img
              src={bannerImage}
              alt="브랜딩 컨설팅 배너"
              className="hero-banner-image"
            />
            <div className="hero-banner-text">
              <div className="bcHero">
                <p className="bcHero__pill">AI Brand Consulting</p>
                <h1 className="bcHero__title">브랜드 컨설팅</h1>
                <p className="bcHero__sub">
                  기업진단 요약 → <b>네이밍 → 컨셉 → 스토리 → 로고</b> 순서로
                  진행되며,
                  <br />각 단계마다 <b>AI 3안</b> 중 하나를 선택해 다음 단계로
                  이어집니다.
                </p>

                {pickedSection ? (
                  <div style={{ marginTop: 14, fontSize: 14, opacity: 0.9 }}>
                    선택된 메뉴:{" "}
                    <b>{labelMap[pickedSection] ?? pickedSection}</b>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="brand-content">
        <div className="bcFlowHeader">
          <div>
            <h2 className="section-title">진행 흐름</h2>
            {/* <p className="bcFlowSub">
              각 단계에서 AI가 <b>3안을 제안</b>하고, 선택한 <b>1안</b>이 다음
              단계로 이어집니다.
            </p> */}
          </div>

          <div className="bcFlowMeta" aria-label="브랜드 컨설팅 요약">
            <span className="bcMetaPill">5단계</span>
            <span className="bcMetaPill">단계별 3안</span>
            <span className="bcMetaPill">선택 기반 연결</span>
          </div>
        </div>

        <section
          className="bcFlowCard service-card service-card--static"
          aria-label="브랜드 컨설팅 진행 순서"
        >
          <div className="bcFlowCard__head">
            <h2>브랜드 컨설팅 진행 순서</h2>
            <p>기업진단 요약 → 네이밍 → 컨셉 → 스토리 → 로고</p>
          </div>

          <div className="bcFlowCard__grid">
            <div>
              <div
                className="bcFlowList"
                role="list"
                aria-label="브랜드 컨설팅 5단계 목록"
              >
                {steps.map((s, idx) => {
                  const isDiagnosisStep = s.key === "diagnosis";
                  const stepUnlocked = isDiagnosisStep
                    ? true
                    : Boolean(unlocked[s.key]);
                  const stepDone = isDiagnosisStep
                    ? status.hasDiagnosis
                    : Boolean(
                        pipeline?.[s.key]?.selectedId ||
                        pipeline?.[s.key]?.selected,
                      );

                  return (
                    <div
                      key={s.key}
                      className="bcFlowItem"
                      role="listitem"
                      style={{
                        opacity: stepUnlocked ? 1 : 0.55,
                        filter: stepUnlocked ? "none" : "grayscale(0.2)",
                      }}
                    >
                      <div className="bcFlowItem__imgWrap">
                        <div className="bcFlowBadge">STEP {idx + 1}</div>
                        <div className="bcFlowItem__img">
                          <img src={s.img} alt={`${s.title} 예시 이미지`} />
                        </div>
                      </div>

                      <div className="bcFlowItem__text">
                        <p className="bcFlowTag">
                          {s.tag}{" "}
                          {stepDone
                            ? " · 완료"
                            : stepUnlocked
                              ? " · 진행 가능"
                              : " · 잠김"}
                        </p>
                        <h3 className="bcFlowTitle">{s.title}</h3>
                        <p className="bcFlowSub">{s.sub}</p>

                        <div style={{ marginTop: 10 }}>
                          <button
                            type="button"
                            className={`btn ghost ${stepUnlocked ? "" : "disabled"}`}
                            disabled={!stepUnlocked}
                            onClick={() => navigate(s.route)}
                          >
                            {isDiagnosisStep
                              ? stepDone
                                ? "진단 확인/수정"
                                : "기업진단 시작"
                              : stepDone
                                ? "결과 확인/수정"
                                : "이 단계 진행"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside
              className="bcFlowActions"
              aria-label="브랜드 컨설팅 시작/리포트"
            >
              <h3 className="bcFlowActions__title">다음 할 일</h3>

              {status.hasDiagnosis ? (
                <p className="bcFlowActions__desc">
                  기업진단 요약이 준비되었습니다.
                  {diagSummaryText ? (
                    <>
                      <br />
                      <span style={{ opacity: 0.9 }}>
                        <b>요약</b> · {diagSummaryText}
                      </span>
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="bcFlowActions__desc">
                  브랜드 컨설팅은 <b>기업진단 요약</b>을 기반으로 단계별 제안을
                  생성합니다.
                  <br />
                  먼저 기업진단을 완료해주세요.
                </p>
              )}

              <div className="bcFlowActions__actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={handlePrimaryCTA}
                >
                  {ctaText}
                </button>

                {/* ✅ 여기: disabled 대신 가짜 disabled + 툴팁 */}
                <button
                  type="button"
                  className={`btn ghost bcTooltipBtn ${
                    isBrandConsultingCompleted ? "" : "is-disabled"
                  }`}
                  onClick={handleViewFinalReport}
                  aria-disabled={!isBrandConsultingCompleted}
                >
                  마이페이지에서 리포트 보기
                  {!isBrandConsultingCompleted && (
                    <span className="bcTooltip" role="tooltip">
                      진행된 컨설팅이 없습니다.
                    </span>
                  )}
                </button>

                {!isBrandConsultingCompleted ? (
                  <p className="bcFlowActions__hint">
                    * 네이밍 → 컨셉 → 스토리 → 로고 선택까지 완료하면 리포트가
                    활성화돼요.
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </section>

        <p className="bcBottomCTA__hint" style={{ marginTop: 18 }}>
          * 단계별 선택 결과는 자동 저장되며, 다음 단계 생성에 그대로
          사용됩니다.
        </p>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
