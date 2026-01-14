// import React, { useState } from "react";
// import ReactDOM from "react-dom/client";
// import LoginApp from "./pages/Login.jsx";
// import SignupApp from "./pages/Signup.jsx";
// import FindID from "./pages/FindID.jsx";
// import FindPassword from "./pages/FindPassword.jsx";
// import "./styles/Login.css";
// import "./styles/Signup.css";
// import "./styles/FindID.css";
// import "./styles/FindPassword.css";

// function App() {
//   const [view, setView] = useState("login");

//   if (view === "signup") {
//     return <SignupApp onBack={() => setView("login")} />;
//   }

//   if (view === "findid") {
//     return <FindID onBack={() => setView("login")} />;
//   }

//   if (view === "findpw") {
//     return <FindPassword onBack={() => setView("login")} />;
//   }

//   return (
//     <LoginApp
//       onSignup={() => setView("signup")}
//       onFindId={() => setView("findid")}
//       onFindPw={() => setView("findpw")}
//     />
//   );
// }

// ReactDOM.createRoot(document.getElementById("root")).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );

import React from "react";
import ReactDOM from "react-dom/client";

import DiagnosisHome from "./pages/DiagnosisHome.jsx";

// 기존 css import 유지
import "./styles/Login.css";
import "./styles/Signup.css";
import "./styles/FindID.css";
import "./styles/FindPassword.css";
import "./styles/DiagnosisHome.css"; // ✅ 진단 홈 css 추가 (파일명 맞춰서)

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DiagnosisHome />
  </React.StrictMode>
);
