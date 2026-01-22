// src/components/SiteHeader.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/SiteHeader.css";

// ✅ JWT 미사용: 토큰 관련 함수 제거하고 loginId만 지움
import { clearCurrentUserId } from "../utils/auth";

// (선택) 백에 logout API가 있으면 호출해도 되고, 없으면 안 불러도 됨.
// 지금은 “토큰 없이” 연동이 목표라서 굳이 안 불러도 됨.
// import * as authApi from "../api/authApi";

// ✅ 컴포넌트 밖으로 빼면 렌더마다 객체 새로 안 만들어짐
const BRAND_INTERVIEW_ROUTES = {
  logo: "/logoconsulting",
  naming: "/nameconsulting",
  homepage: "/homepageconsulting",
  story: "/brandstoryconsulting",
};

const PROMO_INTERVIEW_ROUTES = {
  digital: "/promotion/digital/interview",
  offline: "/promotion/offline/interview",
  video: "/promotion/video/interview",
};

export default function SiteHeader({ onLogout, onBrandPick, onPromoPick }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ✅ active 처리(진단/브랜드/홍보물/투자)
  const isDiagnosisRoute =
    pathname === "/diagnosis" ||
    pathname === "/diagnosisinterview" ||
    pathname.startsWith("/diagnosis/");

  const isBrandRoute =
    pathname === "/brandconsulting" ||
    pathname === BRAND_INTERVIEW_ROUTES.logo ||
    pathname === BRAND_INTERVIEW_ROUTES.naming ||
    pathname === BRAND_INTERVIEW_ROUTES.homepage ||
    pathname === BRAND_INTERVIEW_ROUTES.story ||
    pathname === "/namingconsulting" ||
    pathname === "/brand/naming/interview" ||
    pathname === "/brand/logo/interview" ||
    pathname === "/brand/homepage/interview" ||
    pathname === "/brand/story/interview" ||
    pathname.startsWith("/brand/") ||
    pathname.startsWith("/brandconsulting/");

  const isPromotionRoute =
    pathname === "/promotion" || pathname.startsWith("/promotion/");

  const isInvestmentRoute =
    pathname === "/investment" || pathname.startsWith("/investment/");

  const isActiveExact = (path) => pathname === path;

  // ===== Hover Dropdown: Brand =====
  const [brandOpen, setBrandOpen] = useState(false);
  const brandCloseTimerRef = useRef(null);

  const clearBrandCloseTimer = () => {
    if (brandCloseTimerRef.current) {
      clearTimeout(brandCloseTimerRef.current);
      brandCloseTimerRef.current = null;
    }
  };

  const openBrandMenu = () => {
    clearBrandCloseTimer();
    setBrandOpen(true);
  };

  const closeBrandMenu = (delay = 180) => {
    clearBrandCloseTimer();
    brandCloseTimerRef.current = setTimeout(() => setBrandOpen(false), delay);
  };

  // ===== Hover Dropdown: Promotion =====
  const [promoOpen, setPromoOpen] = useState(false);
  const promoCloseTimerRef = useRef(null);

  const clearPromoCloseTimer = () => {
    if (promoCloseTimerRef.current) {
      clearTimeout(promoCloseTimerRef.current);
      promoCloseTimerRef.current = null;
    }
  };

  const openPromoMenu = () => {
    clearPromoCloseTimer();
    setPromoOpen(true);
  };

  const closePromoMenu = (delay = 180) => {
    clearPromoCloseTimer();
    promoCloseTimerRef.current = setTimeout(() => setPromoOpen(false), delay);
  };

  useEffect(() => {
    return () => {
      clearBrandCloseTimer();
      clearPromoCloseTimer();
    };
  }, []);

  // ✅ 상단 메뉴 클릭
  const handleDiagnosisClick = () => navigate("/diagnosis");

  const handleBrandClick = () => {
    setPromoOpen(false);
    setBrandOpen(false);
    navigate("/brandconsulting");
  };

  const handleBrandItem = (action) => {
    setBrandOpen(false);
    setPromoOpen(false);

    const to = BRAND_INTERVIEW_ROUTES[action];
    if (!to) return;

    navigate(to);
    if (typeof onBrandPick === "function") onBrandPick(action);
  };

  const handlePromoClick = () => {
    setBrandOpen(false);
    setPromoOpen(false);
    navigate("/promotion");
  };

  const handlePromoItem = (action) => {
    setPromoOpen(false);
    setBrandOpen(false);

    const to = PROMO_INTERVIEW_ROUTES[action];
    if (!to) return;

    navigate(to);
    if (typeof onPromoPick === "function") onPromoPick(action);
  };

  const handleInvestmentClick = () => {
    setBrandOpen(false);
    setPromoOpen(false);
    navigate("/investment");
  };

  // ✅ JWT 미사용 로그아웃: 서버 호출 없이 localStorage만 정리
  const handleLogout = async () => {
    const ok = window.confirm("로그아웃 하시겠습니까?");
    if (!ok) return;

    try {
      // (선택) 백에 logout API가 있고 꼭 호출하고 싶으면 아래 주석 해제
      // await authApi.logout();
    } catch (e) {
      console.warn("logout API failed:", e);
    } finally {
      // ✅ 토큰 대신 loginId 삭제
      clearCurrentUserId();

      // ✅ 부모에서 추가 정리하고 싶으면(onLogout) 호출
      if (typeof onLogout === "function") onLogout();

      // ✅ 로그인 화면으로 이동
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="main-header">
      <div
        className="brand"
        role="button"
        tabIndex={0}
        onClick={() => navigate("/main")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") navigate("/main");
        }}
      >
        BRANDPILOT
      </div>

      <nav className="main-nav" aria-label="주요 메뉴">
        <button
          type="button"
          className={`nav-link ${isDiagnosisRoute ? "is-active" : ""}`}
          onClick={handleDiagnosisClick}
        >
          기업 진단 &amp; 인터뷰
        </button>

        {/* ✅ 브랜드 컨설팅 Hover 드롭다운 */}
        <div
          className={`nav-dropdown ${brandOpen ? "is-open" : ""}`}
          onMouseEnter={() => {
            openBrandMenu();
            setPromoOpen(false);
          }}
          onMouseLeave={() => closeBrandMenu(220)}
          onFocus={() => {
            openBrandMenu();
            setPromoOpen(false);
          }}
          onBlur={() => closeBrandMenu(120)}
        >
          <button
            type="button"
            className={`nav-link nav-dropdown__btn ${
              isBrandRoute ? "is-active" : ""
            }`}
            aria-expanded={brandOpen ? "true" : "false"}
            onClick={handleBrandClick}
            onKeyDown={(e) => {
              if (e.key === "Escape") setBrandOpen(false);
              if (e.key === "ArrowDown") openBrandMenu();
            }}
          >
            브랜드 컨설팅 <span className="nav-dropdown__chev">▾</span>
          </button>

          <div
            className="nav-dropdown__panel"
            role="menu"
            aria-label="브랜드 컨설팅 메뉴"
            onMouseEnter={openBrandMenu}
            onMouseLeave={() => closeBrandMenu(220)}
          >
            <button
              type="button"
              className="nav-dropdown__item"
              onClick={() => handleBrandItem("logo")}
            >
              로고 컨설팅
            </button>

            <button
              type="button"
              className="nav-dropdown__item"
              onClick={() => handleBrandItem("naming")}
            >
              네이밍 컨설팅
            </button>

            <button
              type="button"
              className="nav-dropdown__item"
              onClick={() => handleBrandItem("homepage")}
            >
              홈페이지 컨설팅
            </button>

            <button
              type="button"
              className="nav-dropdown__item"
              onClick={() => handleBrandItem("story")}
            >
              브랜드 스토리 컨설팅
            </button>
          </div>
        </div>

        {/* ✅ 홍보물 컨설팅 Hover 드롭다운 */}
        <div
          className={`nav-dropdown ${promoOpen ? "is-open" : ""}`}
          onMouseEnter={() => {
            openPromoMenu();
            setBrandOpen(false);
          }}
          onMouseLeave={() => closePromoMenu(220)}
          onFocus={() => {
            openPromoMenu();
            setBrandOpen(false);
          }}
          onBlur={() => closePromoMenu(120)}
        >
          <button
            type="button"
            className={`nav-link nav-dropdown__btn ${
              isPromotionRoute ? "is-active" : ""
            }`}
            aria-expanded={promoOpen ? "true" : "false"}
            onClick={handlePromoClick}
            onKeyDown={(e) => {
              if (e.key === "Escape") setPromoOpen(false);
              if (e.key === "ArrowDown") openPromoMenu();
            }}
          >
            홍보물 컨설팅 <span className="nav-dropdown__chev">▾</span>
          </button>

          <div
            className="nav-dropdown__panel"
            role="menu"
            aria-label="홍보물 컨설팅 메뉴"
            onMouseEnter={openPromoMenu}
            onMouseLeave={() => closePromoMenu(220)}
          >
            <button
              type="button"
              className="nav-dropdown__item"
              onClick={() => handlePromoItem("digital")}
            >
              디지털 이미지
            </button>

            <button
              type="button"
              className="nav-dropdown__item"
              onClick={() => handlePromoItem("offline")}
            >
              오프라인 이미지
            </button>

            <button
              type="button"
              className="nav-dropdown__item"
              onClick={() => handlePromoItem("video")}
            >
              홍보 영상
            </button>
          </div>
        </div>

        <button
          type="button"
          className={`nav-link ${isInvestmentRoute ? "is-active" : ""}`}
          onClick={handleInvestmentClick}
        >
          투자 라운지
        </button>
      </nav>

      <div className="account-nav">
        <button
          type="button"
          className={`nav-link ${isActiveExact("/main") ? "is-active" : ""}`}
          onClick={() => navigate("/main")}
        >
          홈
        </button>

        <button
          type="button"
          className={`nav-link ${isActiveExact("/mypage") ? "is-active" : ""}`}
          onClick={() => navigate("/mypage")}
        >
          마이페이지
        </button>

        <button type="button" className="nav-link" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
