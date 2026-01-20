// src/pages/BrandConsulting.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import bannerImage from "../Image/banner_image/Banner.png";
import Logocon from "../Image/brandcon_image/logocon.png";
import namecon from "../Image/brandcon_image/namecon.png";
import pagecon from "../Image/brandcon_image/pagecon.png"; // ✅ story에서도 이 png 재사용

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

import SiteFooter from "../components/SiteFooter.jsx";
import SiteHeader from "../components/SiteHeader.jsx";

export default function BrandConsulting({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ 개인정보/이용약관 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ MainPage에서 state.section 받을 수 있음 (logo / naming / homepage / story)
  const pickedSection = location.state?.section || null;

  const labelMap = {
    logo: "로고 컨설팅",
    naming: "네이밍 컨설팅",
    homepage: "홈페이지 컨설팅",
    story: "브랜드 스토리 컨설팅",
  };

  // ✅ 카드 클릭 시 인터뷰 페이지로 이동
  const goInterview = (service) => {
    const routeMap = {
      logo: "/brand/logo/interview",
      naming: "/brand/naming/interview",
      homepage: "/brand/homepage/interview",

      // ✅ NEW: 브랜드 스토리 인터뷰
      // App.jsx에 /brandstoryconsulting 라우트가 있어야 함 (우리가 전에 추가했음)
      story: "/brandstoryconsulting",
    };

    const to = routeMap[service];
    if (!to) return;

    navigate(to, { state: { service } });
  };

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

      {/* ✅ 공통 헤더 사용 */}
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
              <div className="hero-carousel">
                <div className="hero-slide">
                  <strong>브랜드 컨설팅</strong>
                  <span>여러분의 이미지를 표현하세요.</span>
                </div>
                <div className="hero-slide">
                  <strong>로고 컨설팅</strong>
                  <span>여러분의 개성을 담아보세요.</span>
                </div>
                <div className="hero-slide">
                  <strong>네이밍 컨설팅</strong>
                  <span>여러분의 첫인상을 그려보세요.</span>
                </div>
                <div className="hero-slide">
                  <strong>홈페이지 컨설팅</strong>
                  <span>여러분의 얼굴을 만들어보세요.</span>
                </div>

                {/* ✅ NEW */}
                <div className="hero-slide">
                  <strong>브랜드 스토리 컨설팅</strong>
                  <span>브랜드의 ‘이야기’를 설계해보세요.</span>
                </div>
              </div>

              {/* 선택된 메뉴 표시(원하면 주석 해제)
              {pickedSection ? (
                <div style={{ marginTop: 14, fontSize: 14, opacity: 0.9 }}>
                  선택된 메뉴: <b>{labelMap[pickedSection] ?? pickedSection}</b>
                </div>
              ) : null}
              */}
            </div>
          </div>
        </div>
      </section>

      <main className="brand-content">
        <h2 className="section-title">컨설팅 시작하기</h2>

        <div className="service-grid">
          {/* 로고 */}
          <article
            className="service-card"
            role="button"
            tabIndex={0}
            onClick={() => goInterview("logo")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") goInterview("logo");
            }}
          >
            <div className="service-image">
              <img src={Logocon} alt="로고 컨설팅" />
            </div>
            <p className="service-tag">Logo Consulting</p>
            <h3>로고 컨설팅</h3>
            <div className="service-meta">
              <span>스타트업의 로고를 만들어 드립니다.</span>
              <span>↗</span>
            </div>
          </article>

          {/* 네이밍 */}
          <article
            className="service-card"
            role="button"
            tabIndex={0}
            onClick={() => goInterview("naming")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") goInterview("naming");
            }}
          >
            <div className="service-image">
              <img src={namecon} alt="네이밍 컨설팅" />
            </div>
            <p className="service-tag">Naming Consulting</p>
            <h3>네이밍 컨설팅</h3>
            <div className="service-meta">
              <span>경쟁력있는 이름을 만들어 드립니다.</span>
              <span>↗</span>
            </div>
          </article>

          {/* 홈페이지 */}
          <article
            className="service-card"
            role="button"
            tabIndex={0}
            onClick={() => goInterview("homepage")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") goInterview("homepage");
            }}
          >
            <div className="service-image">
              <img src={pagecon} alt="홈페이지 컨설팅" />
            </div>
            <p className="service-tag">Webpage Consulting</p>
            <h3>홈페이지 컨설팅</h3>
            <div className="service-meta">
              <span>사용자 최적의 웹페이지 제안 해드립니다.</span>
              <span>↗</span>
            </div>
          </article>

          {/* ✅ NEW: 브랜드 스토리 (홈페이지 컨설팅과 같은 PNG 재사용) */}
          <article
            className="service-card"
            role="button"
            tabIndex={0}
            onClick={() => goInterview("story")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") goInterview("story");
            }}
          >
            <div className="service-image">
              <img src={pagecon} alt="브랜드 스토리 컨설팅" />
            </div>
            <p className="service-tag">Brand Story Consulting</p>
            <h3>브랜드 스토리 컨설팅</h3>
            <div className="service-meta">
              <span>브랜드의 시작·문제·해결을 스토리로 정리합니다.</span>
              <span>↗</span>
            </div>
          </article>
        </div>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
