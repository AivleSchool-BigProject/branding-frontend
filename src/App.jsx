// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import FindID from "./pages/FindID.jsx";
import FindPassword from "./pages/FindPassword.jsx";
import MainPage from "./pages/MainPage.jsx";
import DiagnosisHome from "./pages/DiagnosisHome.jsx";
import EasyLogin from "./pages/EasyLogin.jsx";
import BrandConsulting from "./pages/BrandConsulting.jsx";
import DiagnosisInterview from "./pages/DiagnosisInterview.jsx";

import NamingConsultingInterview from "./pages/NamingConsultingInterview.jsx";
import LogoConsultingInterview from "./pages/LogoConsultingInterview.jsx";

// ✅ 여기 오타 주의: Hompage -> Homepage (파일명에 맞춰서 사용)
import HomepageConsultingInterview from "./pages/HomepageConsultingInterview.jsx";
// import HomepageConsultingInterview from "./pages/HompageConsultingInterview.jsx";

export default function App() {
  return (
    <Routes>
      {/* 로그인/메인 */}
      <Route path="/" element={<Login />} />
      <Route path="/main" element={<MainPage />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/findid" element={<FindID />} />
      <Route path="/findpw" element={<FindPassword />} />

      {/* 진단 */}
      <Route path="/diagnosis" element={<DiagnosisHome />} />
      <Route path="/diagnosisinterview" element={<DiagnosisInterview />} />

      {/* 간편 로그인 */}
      <Route path="/easylogin" element={<EasyLogin />} />

      {/* 브랜드 컨설팅 메인 */}
      <Route path="/brandconsulting" element={<BrandConsulting />} />

      {/* ✅ 기존 너가 쓰던 인터뷰 경로들 (유지) */}
      <Route path="/nameconsulting" element={<NamingConsultingInterview />} />
      <Route path="/logoconsulting" element={<LogoConsultingInterview />} />
      <Route
        path="/homepageconsulting"
        element={<HomepageConsultingInterview />}
      />

      {/* ✅ (추천) 헷갈림 방지: naming 풀네임 alias도 같이 지원 */}
      <Route path="/namingconsulting" element={<NamingConsultingInterview />} />

      <Route
        path="/brand/naming/interview"
        element={<NamingConsultingInterview />}
      />
      <Route
        path="/brand/logo/interview"
        element={<LogoConsultingInterview />}
      />
      <Route
        path="/brand/homepage/interview"
        element={<HomepageConsultingInterview />}
      />

      {/* 없는 경로는 메인으로 */}
      <Route path="*" element={<Navigate to="/main" replace />} />
    </Routes>
  );
}
