// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

/** ✅ 라이브러리 CSS */
import "react-datepicker/dist/react-datepicker.css";

/** ✅ 전역 CSS */
import "./styles/Login.css";
import "./styles/Signup.css";
import "./styles/FindID.css";
import "./styles/FindPassword.css";
import "./styles/MainPage.css";
import "./styles/BrandConsulting.css";

import "./styles/DiagnosisHome.css";
import "./styles/DiagnosisInterview.css";

import "./styles/EasyLogin.css";
import "./styles/EasyLoginModal.css";

import "./styles/PolicyModal.css";
import "./styles/SiteHeader.css";
import "./styles/SiteFooter.css";

import "./styles/NamingConsultingInterview.css";
import "./styles/LogoConsultingInterview.css";
import "./styles/ConceptConsultingInterview.css";
import "./styles/ConsultingFlowPanel.css";

import "./styles/Promotion.css";

import "./styles/MyPage.css";

import "./styles/DigitalImageConsultingInterview.css";
import "./styles/OfflineImageConsultingInterview.css";
import "./styles/PromoVideoConsultingInterview.css";

import "./styles/DiagnosisResult.css";
import "./styles/PromotionResult.css";
import "./styles/BrandConsultingResult.css";

import "./styles/InvestmentBoard.css";
import "./styles/InvestmentPostCreate.css";
import "./styles/InvestmentPostDetail.css";
import "./styles/BrandStoryConsultingInterview.css";

import "./styles/BrandAllResults.css";
import "./styles/PromotionAllResults.css";

// NOTE: 개발 환경(React 18)에서 React.StrictMode는 useEffect 등을 2번 실행해서
// API 조회가 네트워크에 2번 찍히는 현상이 생길 수 있어요.
// (프로덕션 빌드에서는 보통 1번만 실행)
// 네트워크 중복 호출이 거슬리면 StrictMode를 제거하고, 디버깅이 필요하면 다시 켜세요.

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
