// // src/pages/FindID.jsx
// import { useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";

// /**
//  * 아이디(이메일) 찾기 - 보안형 표시
//  * - 이름 + 휴대폰으로 확인
//  * - 결과는 이메일 전체 노출 X
//  *   => @ 뒤 도메인은 보여주고, @ 앞(local part)은 일부만 남기고 * 마스킹
//  *
//  * 실제 서비스에서는 결과 이메일을 서버에서 받아오고,
//  * 프론트에서는 "마스킹된 값만" 표시하는 것이 더 안전함.
//  */
// export default function FindID() {
//   const navigate = useNavigate();

//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [maskedEmail, setMaskedEmail] = useState("");
//   const [message, setMessage] = useState(""); // 안내 메시지
//   const [error, setError] = useState(""); // 에러

//   const isPhoneLike = useMemo(() => {
//     const onlyNum = phone.replace(/\D/g, "");
//     return onlyNum.length >= 10 && onlyNum.length <= 11;
//   }, [phone]);

//   // ✅ 이메일 마스킹 함수: local part 일부만 남기고 * 처리
//   // ex) "abcdef@gmail.com" -> "ab****@gmail.com"
//   // ex) "ab@gmail.com" -> "a*@gmail.com"
//   // ex) "a@gmail.com" -> "*@gmail.com"
//   const maskEmail = (email) => {
//     if (!email || !email.includes("@")) return "";
//     const [local, domain] = email.split("@");
//     if (!domain) return "";

//     // local part 길이에 따라 남길 글자 수 결정
//     if (local.length <= 1) return `*@${domain}`;
//     if (local.length === 2) return `${local[0]}*@${domain}`;

//     const keep = Math.min(2, local.length - 1); // 기본 2글자 유지
//     const masked = `${local.slice(0, keep)}${"*".repeat(local.length - keep)}`;
//     return `${masked}@${domain}`;
//   };

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     setError("");
//     setMessage("");
//     setMaskedEmail("");

//     const safeName = name.trim();
//     if (!safeName) return setError("이름을 입력해주세요.");
//     if (!phone.trim()) return setError("휴대폰 번호를 입력해주세요.");
//     if (!isPhoneLike)
//       return setError("휴대폰 번호는 숫자만 10~11자리로 입력해주세요.");

//     try {
//       // ✅ 실제 서비스에서는 아래를 백엔드 API로 대체
//       // 예) const res = await api.post("/auth/find-id", { name: safeName, phone: phoneNormalized });
//       //     서버가 "마스킹된 이메일"만 내려주도록 설계하는 것이 가장 안전
//       const phoneNormalized = phone.replace(/\D/g, "");

//       // ---- 테스트용 mock 이메일(서버에서 받는다고 가정) ----
//       // 이름 기반으로 임시 이메일을 생성해서 마스킹 시연
//       const mockLocal = safeName.replace(/\s+/g, "").toLowerCase() || "user";
//       const mockEmail = `${mockLocal}${phoneNormalized.slice(-2)}@example.com`;
//       // ---------------------------------------------

//       const masked = maskEmail(mockEmail);
//       setMaskedEmail(masked);

//       // 보안 UX 관점: "없습니다"를 명확히 말하지 않고 통일된 문구로 처리하는 경우도 많음
//       setMessage("입력하신 정보로 가입된 아이디를 확인했습니다.");
//     } catch (e) {
//       setError("아이디 조회에 실패했습니다. 잠시 후 다시 시도해주세요.");
//     }
//   };

//   return (
//     <div className="findid-page">
//       <main className="findid-card">
//         <h1 className="findid-title">아이디 찾기</h1>

//         <form className="findid-form" onSubmit={handleSubmit}>
//           <div className="field">
//             <label htmlFor="findid-name">이름</label>
//             <input
//               id="findid-name"
//               type="text"
//               placeholder="실명 입력"
//               value={name}
//               onChange={(event) => setName(event.target.value)}
//               autoComplete="name"
//             />
//           </div>

//           <div className="field">
//             <label htmlFor="findid-phone">휴대폰 번호</label>
//             <input
//               id="findid-phone"
//               type="tel"
//               placeholder="- 없이 입력해주세요"
//               value={phone}
//               onChange={(event) => setPhone(event.target.value)}
//               autoComplete="tel"
//             />
//           </div>

//           <p className="hint">
//             회원가입 시 입력하신 이름, 휴대폰번호로
//             <br />
//             가입된 아이디가 있는지 확인합니다.
//           </p>

//           {message ? <p className="notice">{message}</p> : null}
//           {error ? <p className="error">{error}</p> : null}

//           {/* ✅ 결과는 "마스킹된 이메일"로만 표시 */}
//           {maskedEmail ? (
//             <div className="resultBox" role="status" aria-live="polite">
//               <div className="resultLabel">확인된 아이디</div>
//               <div className="resultValue">{maskedEmail}</div>
//               <div className="resultHint">
//                 보안상 아이디는 일부 마스킹되어 표시됩니다.
//               </div>
//             </div>
//           ) : null}

//           <button type="submit" className="primary">
//             확인
//           </button>

//           <button
//             type="button"
//             className="secondary"
//             onClick={() => navigate("/login")}
//           >
//             로그인 페이지로 이동
//           </button>
//         </form>
//       </main>

//       <footer className="findid-footer">
//         <div className="footer-inner">
//           <div className="hero-footer-text">
//             <div>
//               <strong>BRANDPILOT</strong>
//             </div>
//             <div>
//               BRANDPILOT | 대전광역시 서구 문정로48번길 30 (탄방동, KT타워)
//             </div>
//             <div>KT AIVLE 7반 15조 </div>
//             <div className="hero-footer-copy">
//               © 2026 Team15 Corp. All rights reserved.
//             </div>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }

// src/pages/FindID.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/FindID.css";
import SiteFooter from "../components/SiteFooter.jsx";

export default function FindID() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [maskedEmail, setMaskedEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isPhoneLike = useMemo(() => {
    const onlyNum = phone.replace(/\D/g, "");
    return onlyNum.length >= 10 && onlyNum.length <= 11;
  }, [phone]);

  const maskEmail = (email) => {
    if (!email || !email.includes("@")) return "";
    const [local, domain] = email.split("@");
    if (!domain) return "";

    if (local.length <= 1) return `*@${domain}`;
    if (local.length === 2) return `${local[0]}*@${domain}`;

    const keep = Math.min(2, local.length - 1);
    const masked = `${local.slice(0, keep)}${"*".repeat(local.length - keep)}`;
    return `${masked}@${domain}`;
  };

  const resetAlerts = () => {
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetAlerts();
    setMaskedEmail("");

    const safeName = name.trim();
    if (!safeName) return setError("이름을 입력해주세요.");
    if (!phone.trim()) return setError("휴대폰 번호를 입력해주세요.");
    if (!isPhoneLike)
      return setError("휴대폰 번호는 숫자만 10~11자리로 입력해주세요.");

    setLoading(true);
    try {
      // ✅ 실제 서비스라면 백엔드 API 호출로 교체
      const phoneNormalized = phone.replace(/\D/g, "");
      const mockLocal = safeName.replace(/\s+/g, "").toLowerCase() || "user";
      const mockEmail = `${mockLocal}${phoneNormalized.slice(-2)}@example.com`;

      setMaskedEmail(maskEmail(mockEmail));
      setMessage("입력하신 정보로 가입된 아이디를 확인했습니다.");
    } catch {
      setError("아이디 조회에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const locked = Boolean(maskedEmail); // ✅ 결과가 뜨면 입력 잠금(선택)

  return (
    <div className="findid-page">
      <main className="findid-card">
        <h1 className="findid-title">아이디 찾기</h1>

        <p className="findid-sub">
          회원가입 시 입력한 <strong>이름</strong>과{" "}
          <strong>휴대폰 번호</strong>로 가입된 아이디를 확인합니다.
        </p>

        {message ? <p className="notice">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <form className="findid-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="findid-name">이름</label>
            <input
              id="findid-name"
              type="text"
              placeholder="실명 입력"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={loading || locked}
            />
          </div>

          <div className="field">
            <label htmlFor="findid-phone">휴대폰 번호</label>
            <input
              id="findid-phone"
              type="tel"
              placeholder="- 없이 입력해주세요"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              disabled={loading || locked}
            />
            <small className="helper">
              보안상 아이디 전체는 노출되지 않으며 일부 마스킹 처리됩니다.
            </small>
          </div>

          {/* ✅ 결과 박스 */}
          {maskedEmail ? (
            <div className="resultBox" role="status" aria-live="polite">
              <div className="resultTop">
                <span className="resultBadge">확인 완료</span>
                <span className="resultLabel">확인된 아이디</span>
              </div>
              <div className="resultValue">{maskedEmail}</div>
              <div className="resultHint">
                보안상 아이디는 일부 마스킹되어 표시됩니다.
              </div>
            </div>
          ) : null}

          {/* ✅ 핵심: 결과가 뜨면 확인 버튼 숨김 */}
          {!maskedEmail ? (
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "조회 중..." : "확인"}
            </button>
          ) : null}

          {/* ✅ 로그인 버튼은 항상 남기기 + 파란색(primary) */}
          <button
            type="button"
            className="primary"
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            로그인 페이지로 이동
          </button>
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
