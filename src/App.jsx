import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import FindID from "./pages/FindID.jsx";
import FindPassword from "./pages/FindPassword.jsx";
import MainPage from "./pages/MainPage.jsx";
import DiagnosisHome from "./pages/DiagnosisHome.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/login" element={<Login />} />

      <Route path="/signup" element={<Signup />} />
      <Route path="/findid" element={<FindID />} />
      <Route path="/findpw" element={<FindPassword />} />

      <Route path="/diagnosis" element={<DiagnosisHome />} />

      {/* 없는 경로는 메인으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
