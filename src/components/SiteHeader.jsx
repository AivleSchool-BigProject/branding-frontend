// src/components/SiteHeader.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/SiteHeader.css";

export default function SiteHeader({ onLogout, onBrandPick }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [brandOpen, setBrandOpen] = useState(false);
  const closeTimerRef = useRef(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openBrandMenu = () => {
    clearCloseTimer();
    setBrandOpen(true);
  };

  const closeBrandMenu = (delay = 180) => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setBrandOpen(false);
    }, delay);
  };

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleDiagnosisClick = () => navigate("/diagnosis");

  // ✅ 로고/네이밍/홈페이지 -> 각 인터뷰 페이지로 이동
  const handleBrandItem = (action) => {
    setBrandOpen(false);

    const routeMap = {
      logo: "/brand/logo/interview",
      naming: "/brand/naming/interview",
      homepage: "/brand/homepage/interview",
    };

    const to = routeMap[action];
    if (!to) return;

    navigate(to, { state: { service: action } });

    if (typeof onBrandPick === "function") onBrandPick(action);
  };

  // ✅ “브랜드 컨설팅” 클릭은 소개 페이지로 이동
  const handleBrandClick = () => navigate("/brandconsulting");

  const handleLogout = () => {
    if (typeof onLogout === "function") onLogout();
    else navigate("/login");
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
          className={`nav-link ${isActive("/diagnosis") ? "is-active" : ""}`}
          onClick={handleDiagnosisClick}
        >
          기업 진단 &amp; 인터뷰
        </button>

        <div
          className={`nav-dropdown ${brandOpen ? "is-open" : ""}`}
          onMouseEnter={openBrandMenu}
          onMouseLeave={() => closeBrandMenu(220)}
          onFocus={openBrandMenu}
          onBlur={() => closeBrandMenu(120)}
        >
          <button
            type="button"
            className={`nav-link nav-dropdown__btn ${
              isActive("/brandconsulting") ? "is-active" : ""
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
          </div>
        </div>

        <button
          type="button"
          className="nav-link"
          onClick={() => alert("홍보물 컨설팅 (준비중)")}
        >
          홍보물 컨설팅
        </button>
      </nav>

      <div className="account-nav">
        <button
          type="button"
          className={`nav-link ${isActive("/main") ? "is-active" : ""}`}
          onClick={() => navigate("/main")}
        >
          홈
        </button>

        <button
          type="button"
          className="nav-link"
          onClick={() => alert("마이페이지 (준비중)")}
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
