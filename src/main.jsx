// // src/main.jsx
// import React from "react";
// import ReactDOM from "react-dom/client";
// import { BrowserRouter } from "react-router-dom";
// import App from "./App.jsx";

// /** ✅ 전역/라이브러리 CSS는 여기서 한 번만 import */
// import "react-datepicker/dist/react-datepicker.css";

// /** ✅ 전역 CSS(원하면 여기서 한 번에 관리) */
// import "./styles/Login.css";
// import "./styles/Signup.css";
// import "./styles/FindID.css";
// import "./styles/FindPassword.css";
// import "./styles/MainPage.css";
// import "./styles/BrandConsulting.css";

// import "./styles/DiagnosisHome.css";
// import "./styles/PolicyModal.css";
// import "./styles/EasyLogin.css";
// import "./styles/EasyLoginModal.css";
// import "./styles/SiteFooter.css";
// import "./styles/DiagnosisInterview.css";
// import "./styles/SiteFooter.css";
// import "./styles/SiteHeader.css";

// import "./styles/HomepageConsultingInterview.css";
// import "./styles/Promotion.css";

// ReactDOM.createRoot(document.getElementById("root")).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <App />
//     </BrowserRouter>
//   </React.StrictMode>
// );

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
import "./styles/HomepageConsultingInterview.css";

import "./styles/Promotion.css";

import "./styles/MyPage.css";

import "./styles/DigitalImageConsultingInterview.css";
import "./styles/OfflineImageConsultingInterview.css";
import "./styles/PromoVideoConsultingInterview.css";

import "./styles/DiagnosisResult.css";
import "./styles/PromotionResult.css";
import "./styles/BrandConsultingResult.css";

import "./styles/InvestmentBoard.css";
import "./styles/BrandStoryConsultingInterview.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
