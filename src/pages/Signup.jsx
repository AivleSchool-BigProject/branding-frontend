// // src/pages/Signup.jsx
// import { useMemo, useState, forwardRef } from "react";
// import { useNavigate } from "react-router-dom";
// import DatePicker from "react-datepicker";

// export default function SignupApp() {
//   const navigate = useNavigate();
//   const [birthDate, setBirthDate] = useState(null);

//   // ✅ 입력값 state (검증용)
//   const [email, setEmail] = useState("");
//   const [pw, setPw] = useState("");
//   const [pw2, setPw2] = useState("");
//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");

//   // 약관
//   const [agreeTerms, setAgreeTerms] = useState(false);
//   const [agreePrivacy, setAgreePrivacy] = useState(false);

//   // 메시지
//   const [error, setError] = useState("");

//   const isEmailLike = useMemo(() => {
//     const v = email.trim();
//     return v.includes("@") && v.includes(".");
//   }, [email]);

//   const isPhoneLike = useMemo(() => {
//     const onlyNum = phone.replace(/\D/g, "");
//     return onlyNum.length >= 10 && onlyNum.length <= 11;
//   }, [phone]);

//   // ✅ 비밀번호 규칙: 8자 + 대문자 + 숫자 + 특수문자
//   const pwRules = useMemo(() => {
//     const v = pw;
//     return {
//       lenOk: v.length >= 8,
//       upperOk: /[A-Z]/.test(v),
//       numOk: /\d/.test(v),
//       specialOk: /[^a-zA-Z0-9]/.test(v),
//     };
//   }, [pw]);

//   const pwValid =
//     pwRules.lenOk && pwRules.upperOk && pwRules.numOk && pwRules.specialOk;

//   const pwMatch = useMemo(() => pw && pw2 && pw === pw2, [pw, pw2]);

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     setError("");

//     if (!email.trim()) return setError("아이디(이메일)를 입력해주세요.");
//     if (!isEmailLike) return setError("아이디는 이메일 형식으로 입력해주세요.");

//     if (!pwValid) {
//       return setError(
//         "비밀번호는 8자 이상이며 대문자/숫자/특수문자를 포함해야 합니다."
//       );
//     }
//     if (!pwMatch) return setError("비밀번호 확인이 일치하지 않습니다.");

//     if (!name.trim()) return setError("이름을 입력해주세요.");
//     if (!phone.trim()) return setError("휴대폰 번호를 입력해주세요.");
//     if (!isPhoneLike)
//       return setError("휴대폰 번호는 숫자만 10~11자리로 입력해주세요.");

//     if (!birthDate) return setError("생년월일을 선택해주세요.");

//     if (!agreeTerms || !agreePrivacy)
//       return setError("필수 약관에 동의해주세요.");

//     // ✅ 테스트 동작
//     alert("회원가입 (테스트)");
//     navigate("/login");
//   };

//   return (
//     <div className="signup-page">
//       <main className="signup-card">
//         <h1 className="signup-title">회원가입</h1>

//         <form className="signup-form" onSubmit={handleSubmit}>
//           <div className="field">
//             <label htmlFor="signup-id">아이디</label>
//             <input
//               id="signup-id"
//               type="email"
//               placeholder="이메일 아이디"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               autoComplete="email"
//             />
//             <small className="hint">* 이메일 형식으로 입력해주세요.</small>
//           </div>

//           <div className="field">
//             <label htmlFor="signup-password">비밀번호</label>
//             <input
//               id="signup-password"
//               type="password"
//               placeholder="비밀번호 입력"
//               value={pw}
//               onChange={(e) => setPw(e.target.value)}
//               autoComplete="new-password"
//             />
//             <small className="hint">
//               * 8자 이상, <b>대문자</b>, 숫자, 특수문자를 포함해주세요.
//             </small>

//             {/* ✅ 규칙 체크(선택) */}
//             <div className="checkline">
//               <span className={`pill ${pwRules.lenOk ? "ok" : ""}`}>8자+</span>
//               <span className={`pill ${pwRules.upperOk ? "ok" : ""}`}>
//                 대문자
//               </span>
//               <span className={`pill ${pwRules.numOk ? "ok" : ""}`}>숫자</span>
//               <span className={`pill ${pwRules.specialOk ? "ok" : ""}`}>
//                 특수문자
//               </span>
//             </div>
//           </div>

//           <div className="field">
//             <label htmlFor="signup-password-confirm">비밀번호 확인</label>
//             <input
//               id="signup-password-confirm"
//               type="password"
//               placeholder="비밀번호 재입력"
//               value={pw2}
//               onChange={(e) => setPw2(e.target.value)}
//               autoComplete="new-password"
//             />
//             <div className="checkline">
//               <span className={`pill ${pwMatch ? "ok" : ""}`}>일치</span>
//             </div>
//           </div>

//           <div className="field">
//             <label htmlFor="signup-name">이름</label>
//             <input
//               id="signup-name"
//               type="text"
//               placeholder="이름 입력"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               autoComplete="name"
//             />
//           </div>

//           <div className="field">
//             <label htmlFor="signup-phone">휴대폰 번호</label>
//             <input
//               id="signup-phone"
//               type="tel"
//               placeholder="휴대폰 번호 입력 (-없이 숫자만)"
//               value={phone}
//               onChange={(e) => setPhone(e.target.value)}
//               autoComplete="tel"
//             />
//           </div>

//           <div className="field">
//             <label>생년월일</label>
//             <DatePicker
//               selected={birthDate}
//               onChange={(date) => setBirthDate(date)}
//               dateFormat="yyyy-MM-dd"
//               placeholderText="생년월일 선택"
//               showYearDropdown
//               showMonthDropdown
//               dropdownMode="select"
//               maxDate={new Date()}
//               customInput={<DateInput />}
//             />
//           </div>

//           <div className="terms">
//             <label className="check">
//               <input
//                 type="checkbox"
//                 checked={agreeTerms}
//                 onChange={(e) => setAgreeTerms(e.target.checked)}
//               />
//               이용약관 동의 (필수)
//             </label>
//             <button type="button" className="link-button">
//               보기
//             </button>
//           </div>

//           <div className="terms">
//             <label className="check">
//               <input
//                 type="checkbox"
//                 checked={agreePrivacy}
//                 onChange={(e) => setAgreePrivacy(e.target.checked)}
//               />
//               개인정보 처리방침 동의 (필수)
//             </label>
//             <button type="button" className="link-button">
//               보기
//             </button>
//           </div>

//           {/* ✅ 에러 표시 */}
//           {error ? <p className="error">{error}</p> : null}

//           <div className="button-row">
//             <button type="submit" className="primary">
//               회원가입 하기
//             </button>
//             <button
//               type="button"
//               className="primary"
//               onClick={() => navigate("/login")}
//             >
//               돌아가기
//             </button>
//           </div>
//         </form>
//       </main>

//       <footer className="signup-footer" style={{ backgroundColor: "#001F66" }}>
//         <div className="footer-inner">
//           <div>
//             <strong>BRANDPILOT</strong>
//           </div>
//           <div>
//             BRANDPILOT | 대전광역시 서구 문정로48번길 30 (탄방동, KT타워)
//           </div>
//           <div>KT AIVLE 7반 15조 </div>
//           <div>© 2026 Team15 Corp. All rights reserved.</div>
//         </div>
//       </footer>
//     </div>
//   );
// }

// const DateInput = forwardRef(({ value, onClick }, ref) => (
//   <div className="date-input" onClick={onClick} ref={ref}>
//     <input type="text" value={value} placeholder="생년월일 선택" readOnly />
//     <span className="calendar-icon">📅</span>
//   </div>
// ));

import { useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/Signup.css";
import SiteFooter from "../components/SiteFooter.jsx";

export default function SignupApp() {
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("회원가입 (테스트)");
    navigate("/login");
  };

  return (
    <div className="signup-page">
      <main className="signup-card">
        <h1 className="signup-title">회원가입</h1>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="signup-id">아이디</label>
            <input id="signup-id" type="email" placeholder="이메일 아이디" />
            <small className="hint">* 이메일 형식으로 입력해주세요.</small>
          </div>

          <div className="field">
            <label htmlFor="signup-password">비밀번호</label>
            <input
              id="signup-password"
              type="password"
              placeholder="비밀번호 입력"
            />
            <small className="hint">
              * 8자 이상, 영문, 숫자, 특수문자를 포함해주세요.
            </small>
          </div>

          <div className="field">
            <label htmlFor="signup-password-confirm">비밀번호 확인</label>
            <input
              id="signup-password-confirm"
              type="password"
              placeholder="비밀번호 재입력"
            />
          </div>

          <div className="field">
            <label htmlFor="signup-name">이름</label>
            <input id="signup-name" type="text" placeholder="이름 입력" />
          </div>

          <div className="field">
            <label htmlFor="signup-phone">휴대폰 번호</label>
            <input
              id="signup-phone"
              type="tel"
              placeholder="휴대폰 번호 입력 (-없이 숫자만)"
            />
          </div>

          <div className="field">
            <label>생년월일</label>
            <DatePicker
              selected={birthDate}
              onChange={(date) => setBirthDate(date)}
              dateFormat="yyyy-MM-dd"
              placeholderText="생년월일 선택"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              maxDate={new Date()}
              customInput={<DateInput />}
            />
          </div>

          <div className="terms">
            <label className="check">
              <input type="checkbox" />
              이용약관 동의 (필수)
            </label>
            <button type="button" className="link-button">
              보기
            </button>
          </div>

          <div className="terms">
            <label className="check">
              <input type="checkbox" />
              개인정보 처리방침 동의 (필수)
            </label>
            <button type="button" className="link-button">
              보기
            </button>
          </div>

          <div className="button-row">
            <button type="submit" className="primary">
              회원가입 하기
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => navigate("/login")}
            >
              돌아가기
            </button>
          </div>
        </form>
      </main>

      {/* ✅ footer 교체 */}
      <SiteFooter />
    </div>
  );
}

const DateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="date-input" onClick={onClick} ref={ref}>
    <input type="text" value={value} placeholder="생년월일 선택" readOnly />
    <span className="calendar-icon">📅</span>
  </div>
));
