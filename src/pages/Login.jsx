// src/pages/Login.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import namingLogoImg from "../login_image/네이밍_로고_추천.png";
import analyzeCompany from "../login_image/기업 초기 진단.png";
import analyzeReport from "../login_image/진단분석리포트.png";
import makeset from "../login_image/문서초안생성.png";
import story from "../login_image/스토리텔링.png";

import "../styles/Login.css";

// ✅ 모달/콘텐츠(이미 만들어둔 파일 그대로 사용)
import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// ✅ (추가) 간편로그인 모달
import EasyLoginModal from "../components/EasyLoginModal.jsx"; // 너가 만들었던 파일명에 맞춰 수정 가능

export default function LoginApp() {
  const navigate = useNavigate();

  // ✅ "privacy" | "terms" | null
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ (추가) 간편로그인 모달 상태
  const [easyOpen, setEasyOpen] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate("/main");
  };

  return (
    <div className="login-page navy">
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

      {/* ✅ (추가) 간편로그인 모달 */}
      <EasyLoginModal open={easyOpen} onClose={() => setEasyOpen(false)} />

      <div className="login-shell split">
        <section className="login-hero navy-panel">
          <div className="hero-top">
            <span className="hero-title-line">여러분의 새로운 시작</span>
            <span className="hero-title-line">BRANDPILOT이 함께 합니다.</span>
          </div>

          <div className="feature-marquee" aria-label="서비스 핵심 기능">
            <div className="marquee-track">
              <div className="marquee-card">
                <img src={namingLogoImg} alt="네이밍 로고 추천" />
                <strong>네이밍·로고 추천</strong>
                <p>요구사항에 맞는 네이밍과 로고를 추천해드립니다.</p>
              </div>

              <div className="marquee-card">
                <img src={analyzeCompany} alt="기업 진단 분석" />
                <strong>기업 진단분석</strong>
                <p>초기 상황을 분석하여 최적의 제안을 해드립니다.</p>
              </div>

              <div className="marquee-card">
                <img src={analyzeReport} alt="분석기반 리포트" />
                <strong>분석 리포트 제공</strong>
                <p>분석 내용 기반 리포트를 제공합니다.</p>
              </div>

              <div className="marquee-card">
                <img src={makeset} alt="문서초안자동생성" />
                <strong>문서 초안 자동 생성</strong>
                <p>사업제안서, IR등 문서 초안을 자동 생성해줍니다.</p>
              </div>

              <div className="marquee-card">
                <img src={story} alt="스토리텔링" />
                <strong>스타트업 스토리텔링</strong>
                <p>기업 관련 소개글 등 기업관련 홍보글을 생성해줍니다.</p>
              </div>

              {/* 끊김 방지 반복 */}
              <div className="marquee-card">
                <img src={namingLogoImg} alt="네이밍 로고 추천" />
                <strong>네이밍·로고 추천</strong>
                <p>요구사항에 맞는 네이밍과 로고를 추천해드립니다.</p>
              </div>
              <div className="marquee-card">
                <img src={analyzeCompany} alt="기업 진단 분석" />
                <strong>기업 진단분석</strong>
                <p>초기 상황을 분석하여 최적의 제안을 해드립니다.</p>
              </div>
              <div className="marquee-card">
                <img src={analyzeReport} alt="분석기반 리포트" />
                <strong>분석 리포트 제공</strong>
                <p>분석 내용 기반 리포트를 제공합니다.</p>
              </div>
              <div className="marquee-card">
                <img src={makeset} alt="문서초안자동생성" />
                <strong>문서 초안 자동 생성</strong>
                <p>사업제안서, IR등 문서 초안을 자동 생성해줍니다.</p>
              </div>
              <div className="marquee-card">
                <img src={story} alt="스토리텔링" />
                <strong>스타트업 스토리텔링</strong>
                <p>기업 관련 소개글 등 기업관련 홍보글을 생성해줍니다.</p>
              </div>
            </div>
          </div>

          <footer className="hero-footer">
            <div className="hero-footer-links">
              <button
                type="button"
                className="hero-footer-link"
                onClick={() => setOpenType("privacy")}
              >
                개인정보 처리방침
              </button>
              <span className="hero-footer-sep">|</span>
              <button
                type="button"
                className="hero-footer-link"
                onClick={() => setOpenType("terms")}
              >
                이용약관
              </button>
            </div>

            <div className="hero-footer-text">
              <div>
                <strong>BRANDPILOT</strong>
              </div>
              <div>
                BRANDPILOT | 대전광역시 서구 문정로48번길 30 (탄방동, KT타워)
              </div>
              <div>KT AIVLE 7반 15조 </div>
              <div className="hero-footer-copy">
                © 2026 Team15 Corp. All rights reserved.
              </div>
            </div>
          </footer>
        </section>

        <section className="login-panel light-panel">
          <h2>LOGIN</h2>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login-id">아이디 (E-mail 계정)</label>
              <input
                id="login-id"
                type="email"
                placeholder="이메일 아이디"
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label htmlFor="login-password">비밀번호</label>
              <input
                id="login-password"
                type="password"
                placeholder="비밀번호 입력"
                autoComplete="current-password"
              />
            </div>

            <div className="login-links">
              <button type="button" onClick={() => navigate("/findid")}>
                아이디 찾기
              </button>
              <span className="dot" aria-hidden="true" />
              <button type="button" onClick={() => navigate("/findpw")}>
                비밀번호 찾기
              </button>
            </div>

            <button type="submit" className="login-primary">
              로그인
            </button>

            {/* ✅ 여기! 클릭 시 easyOpen true */}
            <button
              type="button"
              className="login-easy"
              onClick={() => setEasyOpen(true)}
            >
              간편로그인
            </button>

            <div className="login-divider" />

            <div className="signup-row">
              <div className="signup-copy">
                회원가입하고 <strong>BrandPliot</strong>의<br />
                <strong>더 많은 컨설팅</strong>를 받아보세요!
              </div>
              <button
                type="button"
                className="signup-cta"
                onClick={() => navigate("/signup")}
              >
                회원가입
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
