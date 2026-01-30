// src/pages/MainPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/MainPage.css";

// UI: 메인 카드(컨설팅 시작하기)에서 사용하는 이미지 에셋
import makeset from "../Image/main_image/Brandingconsult.png";
import story from "../Image/main_image/PromotionalConsulting.png";
import mainBanner from "../Image/banner_image/AI_CONSULTING.png";

// UI: 약관/개인정보 모달 + 공통 헤더/푸터
import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import SiteHeader from "../components/SiteHeader.jsx";

// ✅ 브랜드 컨설팅(원큐) 진행 데이터 확인 + 리셋
import {
  readPipeline,
  resetBrandConsultingToDiagnosisStart,
} from "../utils/brandPipelineStorage.js";

export default function MainPage({ onLogout }) {
  const navigate = useNavigate();

  // ✅ 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 브랜드(기업진단 포함) 진행 데이터 여부
  const hasAnyBrandProgress = useMemo(() => {
    const p = readPipeline() || {};

    const hasDiagnosis = Boolean(
      p?.diagnosisSummary?.companyName || p?.diagnosisSummary?.oneLine,
    );
    const hasNaming = Boolean(p?.naming?.selectedId || p?.naming?.selected);
    const hasConcept = Boolean(p?.concept?.selectedId || p?.concept?.selected);
    const hasStory = Boolean(p?.story?.selectedId || p?.story?.selected);
    const hasLogo = Boolean(p?.logo?.selectedId || p?.logo?.selected);
    const hasFlow = Boolean(p?.brandFlow?.active || p?.brandFlow?.startedAt);

    return (
      hasDiagnosis || hasNaming || hasConcept || hasStory || hasLogo || hasFlow
    );
  }, []);

  const brandCtaLabel = hasAnyBrandProgress
    ? "기업진단부터 다시 시작하기"
    : "기업진단 인터뷰부터 시작하기";

  const handleStartBrandFromDiagnosis = () => {
    if (hasAnyBrandProgress) {
      const ok = window.confirm(
        "진행 중인 브랜드 컨설팅 데이터가 있어요.\n기업진단부터 다시 시작하면 진행 데이터가 초기화됩니다.\n계속할까요?",
      );
      if (!ok) return;
      resetBrandConsultingToDiagnosisStart("mainpage_restart");
    }
    navigate("/diagnosis");
  };

  return (
    <div className="main-page">
      {/* ✅ 개인정보/약관 모달 */}
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

      <main className="main-content">
        {/* ✅ 메인 배너 */}
        <section className="mp-hero" aria-label="AI 컨설팅 배너">
          <img className="mp-hero__img" src={mainBanner} alt="AI 컨설팅 배너" />
          <div className="mp-hero__overlay">
            <p className="mp-hero__kicker">AI 기반 컨설팅 허브</p>
            <p className="mp-hero__sub">
              브랜드 컨설팅은 <strong>기업진단부터 로고까지</strong> 원큐로
              진행돼요.
              <br />
              홍보물 컨설팅까지 한 곳에서 시작하세요.
            </p>
          </div>
        </section>

        <h2 className="mp-section-title">컨설팅 시작하기</h2>

        {/* ✅ 카드 2개만 */}
        <div className="mp-card-grid">
          {/* 1) 브랜드 컨설팅(기업진단 포함) */}
          <article
            className="mp-card mp-card--brand"
            aria-label="브랜드 컨설팅 카드"
          >
            <div
              className="mp-card__image mp-card__image--brand"
              aria-hidden="true"
            >
              <img src={makeset} alt="" />
            </div>

            <div className="mp-card__body">
              <p className="mp-card__tag">Brand Consulting · One Queue</p>
              <h3 className="mp-card__title">브랜드 컨설팅 (기업진단 포함)</h3>
              <p className="mp-card__desc">
                기업진단을 시작으로 네이밍·컨셉·스토리·로고까지 한 흐름으로
                완성합니다.
              </p>

              <div className="mp-steps" aria-label="브랜드 컨설팅 진행 순서">
                <span className="mp-step">기업진단</span>
                <span className="mp-step__arrow" aria-hidden="true">
                  →
                </span>
                <span className="mp-step">네이밍</span>
                <span className="mp-step__arrow" aria-hidden="true">
                  →
                </span>
                <span className="mp-step">컨셉</span>
                <span className="mp-step__arrow" aria-hidden="true">
                  →
                </span>
                <span className="mp-step">스토리</span>
                <span className="mp-step__arrow" aria-hidden="true">
                  →
                </span>
                <span className="mp-step">로고</span>
              </div>

              {hasAnyBrandProgress && (
                <div className="mp-warn">
                  진행 데이터가 있어요. 다시 시작하면 초기화됩니다.
                </div>
              )}

              <div className="mp-actions">
                <button
                  type="button"
                  className="mp-cta"
                  onClick={handleStartBrandFromDiagnosis}
                >
                  {brandCtaLabel}
                </button>

                <div className="mp-subactions">
                  <button
                    type="button"
                    className="mp-link"
                    onClick={() => navigate("/brandconsulting")}
                  >
                    소개 보기
                  </button>
                  <button
                    type="button"
                    className="mp-link"
                    onClick={() => navigate("/mypage/brand-results")}
                  >
                    내 리포트
                  </button>
                </div>
              </div>
            </div>
          </article>

          {/* 2) 홍보물 컨설팅 */}
          <article
            className="mp-card mp-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/promotion")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate("/promotion");
            }}
            aria-label="홍보물 컨설팅 카드"
          >
            <div
              className="mp-card__image mp-card__image--promo"
              aria-hidden="true"
            >
              <img src={story} alt="" />
            </div>

            <div className="mp-card__body">
              <p className="mp-card__tag">Promotional Consulting</p>
              <h3 className="mp-card__title">홍보물 컨설팅</h3>
              <p className="mp-card__desc">
                제품 아이콘, AI컷, 연출컷, 포스터 등 홍보물을 목적에 맞게
                제안합니다.
              </p>

              <div className="mp-pills" aria-label="홍보물 컨설팅 종류">
                <span className="mp-pill">제품 아이콘</span>
                <span className="mp-pill">AI컷 모델</span>
                <span className="mp-pill">제품 연출컷</span>
                <span className="mp-pill">SNS 포스터</span>
              </div>
            </div>
          </article>
        </div>

        {/* ===== 투자 유치 게시판(틀 유지) ===== */}
        <section className="deal-board" aria-label="투자 유치 게시판">
          <div className="deal-header">
            <div>
              <p className="deal-eyebrow">초기 스타트업과 함께 해주세요!</p>
              <h3 className="deal-title">스타트업 투자유치</h3>
            </div>

            <button
              type="button"
              className="deal-more"
              onClick={() => navigate("/investment")}
            >
              전체보기 &gt;
            </button>
          </div>

          <div className="deal-grid">
            {/* 더미 카드들(기존 그대로 사용 가능) */}
            <article className="deal-card">
              <div className="deal-card-head">
                <div>
                  <h4>셀타스퀘어</h4>
                  <p>AI 전구약알림 서비스, AI CRO</p>
                  <p>Pre A, TIPS, Series A 투자 완료</p>
                </div>
                <div className="deal-logo">SELTA</div>
              </div>
              <div className="deal-tags">
                <span>AI헬스</span>
                <span>포켓투자유치 A,B 받은팀</span>
              </div>
              <div className="deal-footer">
                <strong>[series A] 92억+ TIPS 투자유치</strong>
                <button type="button" onClick={() => alert("뉴스 (테스트)")}>
                  투자성과 뉴스
                </button>
              </div>
            </article>

            <article className="deal-card">
              <div className="deal-card-head">
                <div>
                  <h4>링크플로우</h4>
                  <p>인공지능(AI) 웨어러블 전문 링크플로우</p>
                  <p>Series B 라운드 준비 완료</p>
                </div>
                <div className="deal-logo">LINK</div>
              </div>
              <div className="deal-tags">
                <span>AI,웨어러블</span>
                <span>포켓투자유치 A,B 받은팀</span>
              </div>
              <div className="deal-footer">
                <strong>[series C 이상] 409억 투자유치</strong>
                <button type="button" onClick={() => alert("뉴스 (테스트)")}>
                  투자성과 뉴스
                </button>
              </div>
            </article>

            <article className="deal-card">
              <div className="deal-card-head">
                <div>
                  <h4>빔웍스</h4>
                  <p>초음파 AI 진단 센서 기반 고가치</p>
                  <p>서비스/임상기업 운영, Pre-IPO 완료</p>
                </div>
                <div className="deal-logo">BEAM</div>
              </div>
              <div className="deal-tags">
                <span>헬스케어, AI</span>
                <span>포켓투자유치 A,B 받은팀</span>
              </div>
              <div className="deal-footer">
                <strong>[pre-IPO] 170억 투자완료</strong>
                <button type="button" onClick={() => alert("뉴스 (테스트)")}>
                  투자성과 뉴스
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
