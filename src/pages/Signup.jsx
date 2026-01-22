// src/pages/Signup.jsx
import React, { useMemo, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";

import SiteFooter from "../components/SiteFooter.jsx";
import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

import { authApi } from "../api";

export default function SignupApp() {
  const navigate = useNavigate();

  const [birthDate, setBirthDate] = useState(null);

  // ✅ loginId
  const [id, setId] = useState("");

  // ✅ Swagger에 있는 email
  const [email, setEmail] = useState("");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isIdLike = useMemo(() => {
    const v = id.trim();
    return /^[a-zA-Z0-9_]{4,20}$/.test(v);
  }, [id]);

  const isEmailLike = useMemo(() => {
    const v = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }, [email]);

  const isPhoneLike = useMemo(() => {
    const onlyNum = phone.replace(/\D/g, "");
    return onlyNum.length >= 10 && onlyNum.length <= 11;
  }, [phone]);

  const pwRules = useMemo(() => {
    const v = pw;
    return {
      lenOk: v.length >= 8,
      upperOk: /[A-Z]/.test(v),
      numOk: /\d/.test(v),
      specialOk: /[^a-zA-Z0-9]/.test(v),
    };
  }, [pw]);

  const pwValid =
    pwRules.lenOk && pwRules.upperOk && pwRules.numOk && pwRules.specialOk;

  const pwMatch = useMemo(() => pw && pw2 && pw === pw2, [pw, pw2]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const safeId = id.trim();
    const safeEmail = email.trim();
    const safeName = name.trim();
    const onlyPhone = phone.replace(/\D/g, "");

    if (!safeId) return setError("아이디를 입력해주세요.");
    if (!isIdLike)
      return setError("아이디는 4~20자, 영문/숫자/_ 형태로 입력해주세요.");

    if (!safeEmail) return setError("이메일을 입력해주세요.");
    if (!isEmailLike) return setError("이메일 형식을 확인해주세요.");

    if (!pwValid) {
      return setError(
        "비밀번호는 8자 이상이며 대문자/숫자/특수문자를 포함해야 합니다.",
      );
    }
    if (!pwMatch) return setError("비밀번호 확인이 일치하지 않습니다.");

    if (!safeName) return setError("이름을 입력해주세요.");
    if (!phone.trim()) return setError("휴대폰 번호를 입력해주세요.");
    if (!isPhoneLike)
      return setError("휴대폰 번호는 숫자만 10~11자리로 입력해주세요.");

    // ✅ 백 스펙에는 없지만, 너 UI 요구사항이면 프론트 검증만 유지
    if (!birthDate) return setError("생년월일을 선택해주세요.");

    if (!agreeTerms || !agreePrivacy)
      return setError("필수 약관에 동의해주세요.");

    setIsLoading(true);
    try {
      await authApi.register({
        loginId: safeId,
        email: safeEmail,
        password: pw,
        mobileNumber: onlyPhone,
        username: safeName,
      });

      alert("회원가입 완료! 로그인 해주세요.");
      navigate("/login");
    } catch (err) {
      setError(err.userMessage || "회원가입 실패");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <PolicyModal
        open={openType === "terms"}
        title="이용약관"
        onClose={closeModal}
      >
        <TermsContent />
      </PolicyModal>

      <PolicyModal
        open={openType === "privacy"}
        title="개인정보 처리방침"
        onClose={closeModal}
      >
        <PrivacyContent />
      </PolicyModal>

      <main className="signup-card">
        <h1 className="signup-title">회원가입</h1>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="signup-id">아이디</label>
            <input
              id="signup-id"
              type="text"
              placeholder="아이디 입력"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
              disabled={isLoading}
            />
            <small className="hint">
              * 4~20자, 영문/숫자/_ 형태로 입력해주세요.
            </small>
          </div>

          <div className="field">
            <label htmlFor="signup-email">이메일</label>
            <input
              id="signup-email"
              type="email"
              placeholder="이메일 입력"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label htmlFor="signup-password">비밀번호</label>
            <input
              id="signup-password"
              type="password"
              placeholder="비밀번호 입력"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
              disabled={isLoading}
            />
            <small className="hint">
              * 8자 이상, <b>대문자</b>, 숫자, 특수문자를 포함해주세요.
            </small>

            <div className="checkline">
              <span className={`pill ${pwRules.lenOk ? "ok" : ""}`}>8자+</span>
              <span className={`pill ${pwRules.upperOk ? "ok" : ""}`}>
                대문자
              </span>
              <span className={`pill ${pwRules.numOk ? "ok" : ""}`}>숫자</span>
              <span className={`pill ${pwRules.specialOk ? "ok" : ""}`}>
                특수문자
              </span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="signup-password-confirm">비밀번호 확인</label>
            <input
              id="signup-password-confirm"
              type="password"
              placeholder="비밀번호 재입력"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
              disabled={isLoading}
            />
            <div className="checkline">
              <span className={`pill ${pwMatch ? "ok" : ""}`}>일치</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="signup-name">이름</label>
            <input
              id="signup-name"
              type="text"
              placeholder="이름 입력"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label htmlFor="signup-phone">휴대폰 번호</label>
            <input
              id="signup-phone"
              type="tel"
              placeholder="휴대폰 번호 입력 (-없이 숫자만)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          <div className="terms">
            <label className="check">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                disabled={isLoading}
              />
              이용약관 동의 (필수)
            </label>
            <button
              type="button"
              className="link-button"
              onClick={() => setOpenType("terms")}
              disabled={isLoading}
            >
              보기
            </button>
          </div>

          <div className="terms">
            <label className="check">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                disabled={isLoading}
              />
              개인정보 처리방침 동의 (필수)
            </label>
            <button
              type="button"
              className="link-button"
              onClick={() => setOpenType("privacy")}
              disabled={isLoading}
            >
              보기
            </button>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="button-row">
            <button type="submit" className="primary" disabled={isLoading}>
              {isLoading ? "가입 중..." : "회원가입 하기"}
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => navigate("/login")}
              disabled={isLoading}
            >
              돌아가기
            </button>
          </div>
        </form>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}

const DateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="date-input" onClick={onClick} ref={ref}>
    <input type="text" value={value} placeholder="생년월일 선택" readOnly />
    <span className="calendar-icon">📅</span>
  </div>
));
