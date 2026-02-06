// src/pages/Signup.jsx
import React, { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";

import namingLogoImg from "../Image/login_image/네이밍_로고_추천.png";
import analyzeCompany from "../Image/login_image/기업 초기 진단.png";
import analyzeReport from "../Image/login_image/진단분석리포트.png";
import makeset from "../Image/login_image/문서초안생성.png";
import story from "../Image/login_image/스토리텔링.png";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";
import { apiRequest } from "../api/client.js";

const FLIP_MS = 850;
const SUCCESS_HOLD_MS = 260;

function shouldReduceMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function SignupApp() {
  const navigate = useNavigate();

  const [birthDate, setBirthDate] = useState(null);

  // 입력값
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // 동의 상태
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // 읽기 완료 여부 (체크 활성화 조건)
  const [readTerms, setReadTerms] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);

  // 모달 상태
  const [consentOpen, setConsentOpen] = useState(false);
  const [readOpenType, setReadOpenType] = useState(null); // "terms" | "privacy" | null

  // 메시지/로딩
  const [error, setError] = useState("");
  const [consentError, setConsentError] = useState("");
  const [loading, setLoading] = useState(false);

  // 읽기 모달 스크롤 완료 여부
  const [canMarkRead, setCanMarkRead] = useState(false);
  const policyScrollRef = useRef(null);

  // 회원가입 -> 로그인 페이지 넘김
  const [isFlippingToLogin, setIsFlippingToLogin] = useState(false);
  const [isRoutingToLogin, setIsRoutingToLogin] = useState(false);
  const timersRef = useRef([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const queueTimer = (callback, ms) => {
    const timerId = window.setTimeout(callback, ms);
    timersRef.current.push(timerId);
  };

  const warmLoginPage = () => {
    import("./Login.jsx").catch(() => {});
  };

  useEffect(() => {
    const t = window.setTimeout(warmLoginPage, 200);
    return () => window.clearTimeout(t);
  }, []);

  const goLoginWithFlip = (holdMs = 0) => {
    if (isRoutingToLogin) return;

    warmLoginPage();

    if (shouldReduceMotion()) {
      navigate("/login");
      return;
    }

    setIsRoutingToLogin(true);

    const startFlip = () => {
      setIsFlippingToLogin(true);
    };

    if (holdMs > 0) {
      queueTimer(startFlip, holdMs);
    } else {
      startFlip();
    }

    queueTimer(() => navigate("/login"), holdMs + FLIP_MS);
  };

  const isEmailLike = useMemo(() => {
    const v = email.trim();
    return v.includes("@") && v.includes(".");
  }, [email]);

  const isPhoneLike = useMemo(() => {
    const onlyNum = phone.replace(/\D/g, "");
    return onlyNum.length >= 10 && onlyNum.length <= 11;
  }, [phone]);

  // 비밀번호 규칙: 8자 + 대문자 + 숫자 + 특수문자
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

  const validateSignupForm = () => {
    if (!loginId.trim()) return "아이디를 입력해주세요.";
    if (!email.trim()) return "이메일을 입력해주세요.";
    if (!isEmailLike) return "이메일은 이메일 형식으로 입력해주세요.";

    if (!pwValid) {
      return "비밀번호는 8자 이상이며 대문자/숫자/특수문자를 포함해야 합니다.";
    }
    if (!pwMatch) return "비밀번호 확인이 일치하지 않습니다.";

    if (!name.trim()) return "이름을 입력해주세요.";
    if (!phone.trim()) return "휴대폰 번호를 입력해주세요.";
    if (!isPhoneLike) return "휴대폰 번호는 숫자만 10~11자리로 입력해주세요.";

    if (!birthDate) return "생년월일을 선택해주세요.";

    return "";
  };

  const registerAccount = async () => {
    setLoading(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        data: {
          loginId: loginId.trim(),
          email: email.trim(),
          password: pw,
          mobileNumber: phone.replace(/\D/g, ""),
          username: name.trim(),
        },
      });

      // 가입 완료: 동의 모달 닫기 -> 잠깐 유지 -> 책장 넘김
      setConsentOpen(false);
      setReadOpenType(null);
      setConsentError("");
      goLoginWithFlip(SUCCESS_HOLD_MS);
    } catch {
      setError("회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const validationMessage = validateSignupForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    // 동의 모달 열 때 체크값만 초기화 (읽음 상태는 유지)
    setAgreeTerms(false);
    setAgreePrivacy(false);
    setConsentError("");
    setConsentOpen(true);
  };

  const closeConsentModal = () => {
    if (loading) return;
    setConsentOpen(false);
    setConsentError("");
  };

  const openReadModal = (type) => {
    setReadOpenType(type);
    setCanMarkRead(false);
  };

  const closeReadModal = () => {
    setReadOpenType(null);
    setCanMarkRead(false);
  };

  const evaluateScrollBottom = () => {
    const el = policyScrollRef.current;
    if (!el) return;
    const remain = el.scrollHeight - el.scrollTop - el.clientHeight;
    setCanMarkRead(remain <= 6);
  };

  useEffect(() => {
    if (!readOpenType) return;
    const t = setTimeout(() => evaluateScrollBottom(), 30);
    return () => clearTimeout(t);
  }, [readOpenType]);

  const markAsRead = () => {
    if (!canMarkRead) return;

    if (readOpenType === "terms") setReadTerms(true);
    if (readOpenType === "privacy") setReadPrivacy(true);

    closeReadModal();
  };

  const allChecked = agreeTerms && agreePrivacy;

  const toggleAllConsent = (nextChecked) => {
    if (!nextChecked) {
      setAgreeTerms(false);
      setAgreePrivacy(false);
      setConsentError("");
      return;
    }

    // 읽은 항목만 체크 가능
    setAgreeTerms(readTerms);
    setAgreePrivacy(readPrivacy);

    if (!readTerms || !readPrivacy) {
      setConsentError(
        "약관 2개를 모두 '보기'에서 끝까지 읽어야 체크할 수 있어요.",
      );
    } else {
      setConsentError("");
    }
  };

  const handleConsentConfirm = async () => {
    setConsentError("");

    if (!readTerms || !readPrivacy) {
      setConsentError("약관 2개를 모두 읽은 뒤 동의할 수 있어요.");
      return;
    }

    if (!agreeTerms || !agreePrivacy) {
      setConsentError("이용약관과 개인정보 처리방침에 모두 동의해주세요.");
      return;
    }

    await registerAccount();
  };

  const disabled = loading || isRoutingToLogin;

  return (
    <div className="signup-page">
      {/* 필수 동의 모달 */}
      <PolicyModal
        open={consentOpen}
        title="약관 동의"
        onClose={closeConsentModal}
      >
        <div className="consent-modal consent-like-shot">
          <p className="consent-guide">
            약관 2개를 모두 <b>보기</b>에서 끝까지 읽으면 체크가 활성화됩니다.
          </p>

          <div className="consent-sheet">
            <label className="consent-check consent-check--all">
              <input
                type="checkbox"
                className="consent-box"
                checked={allChecked}
                onChange={(e) => toggleAllConsent(e.target.checked)}
                disabled={disabled}
              />
              <span className="consent-label">전체 동의</span>
            </label>

            <div className="consent-divider" />

            <label className={`consent-check ${!readTerms ? "is-locked" : ""}`}>
              <input
                type="checkbox"
                className="consent-box"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                disabled={disabled || !readTerms}
              />

              <span className="consent-label">
                (필수) 서비스 이용약관에 동의합니다.
              </span>

              <span
                className={`consent-status ${readTerms ? "done" : "pending"}`}
                aria-label={readTerms ? "열람 완료" : "미열람"}
                title={readTerms ? "열람 완료" : "미열람"}
              >
                {!readTerms ? "미열람" : null}
              </span>

              <button
                type="button"
                className="consent-view"
                onClick={() => openReadModal("terms")}
                disabled={disabled}
              >
                보기
              </button>
            </label>

            <label
              className={`consent-check ${!readPrivacy ? "is-locked" : ""}`}
            >
              <input
                type="checkbox"
                className="consent-box"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                disabled={disabled || !readPrivacy}
              />

              <span className="consent-label">
                (필수) 개인정보 처리방침에 동의합니다.
              </span>

              <span
                className={`consent-status ${readPrivacy ? "done" : "pending"}`}
                aria-label={readPrivacy ? "열람 완료" : "미열람"}
                title={readPrivacy ? "열람 완료" : "미열람"}
              >
                {!readPrivacy ? "미열람" : null}
              </span>

              <button
                type="button"
                className="consent-view"
                onClick={() => openReadModal("privacy")}
                disabled={disabled}
              >
                보기
              </button>
            </label>
          </div>

          {consentError ? (
            <p className="error consent-error" role="alert">
              {consentError}
            </p>
          ) : null}

          <div className="button-row consent-actions">
            <button
              type="button"
              className="primary"
              onClick={handleConsentConfirm}
              disabled={disabled}
            >
              동의하고 회원가입
            </button>
            <button
              type="button"
              className="secondary"
              onClick={closeConsentModal}
              disabled={disabled}
            >
              취소
            </button>
          </div>
        </div>
      </PolicyModal>

      {/* 약관/개인정보 전문 읽기 모달 */}
      <PolicyModal
        open={readOpenType === "terms"}
        title="이용약관"
        onClose={closeReadModal}
      >
        <div className="policy-read-wrap">
          <p className="policy-read-guide">
            아래 내용을 끝까지 읽으면 <b>다 읽었어요</b> 버튼이 활성화됩니다.
          </p>

          <div
            className="policy-scroll-box"
            ref={policyScrollRef}
            onScroll={evaluateScrollBottom}
          >
            <TermsContent />
          </div>

          <div className="policy-read-actions">
            <button
              type="button"
              className="primary"
              disabled={!canMarkRead}
              onClick={markAsRead}
            >
              다 읽었어요
            </button>
            <button
              type="button"
              className="secondary"
              onClick={closeReadModal}
            >
              닫기
            </button>
          </div>
        </div>
      </PolicyModal>

      <PolicyModal
        open={readOpenType === "privacy"}
        title="개인정보 처리방침"
        onClose={closeReadModal}
      >
        <div className="policy-read-wrap">
          <p className="policy-read-guide">
            아래 내용을 끝까지 읽으면 <b>다 읽었어요</b> 버튼이 활성화됩니다.
          </p>

          <div
            className="policy-scroll-box"
            ref={policyScrollRef}
            onScroll={evaluateScrollBottom}
          >
            <PrivacyContent />
          </div>

          <div className="policy-read-actions">
            <button
              type="button"
              className="primary"
              disabled={!canMarkRead}
              onClick={markAsRead}
            >
              다 읽었어요
            </button>
            <button
              type="button"
              className="secondary"
              onClick={closeReadModal}
            >
              닫기
            </button>
          </div>
        </div>
      </PolicyModal>

      <div
        className={`signup-shell ${
          isFlippingToLogin ? "is-flipping-to-login" : ""
        }`}
      >
        <div className="left-page-flip-sheet" aria-hidden="true" />

        <div
          className={`login-peek-layer ${isFlippingToLogin ? "is-visible" : ""}`}
          aria-hidden="true"
        >
          <section className="peek-login-pane">
            <div className="peek-login-card">
              <h3>LOGIN</h3>

              <div className="peek-login-form-like">
                <div className="peek-field">
                  <span className="peek-label" />
                  <span className="peek-input" />
                </div>

                <div className="peek-field">
                  <span className="peek-label" />
                  <span className="peek-input has-icon">
                    <span className="peek-input-icon" />
                  </span>
                </div>

                <div className="peek-login-links">
                  <span className="peek-link" />
                  <span className="dot" />
                  <span className="peek-link short" />
                </div>

                <span className="peek-error-space" />

                <div className="peek-login-actions">
                  <span className="peek-btn primary" />
                  <span className="peek-btn secondary" />
                </div>

                <div className="peek-login-divider" />

                <div className="peek-login-signup-row">
                  <span className="peek-signup-copy" />
                  <span className="peek-signup-btn" />
                </div>
              </div>
            </div>
          </section>

          <section className="peek-login-hero">
            <div className="peek-hero-top">
              <span className="peek-hero-title" />
              <span className="peek-hero-title short" />
            </div>
            <div className="peek-hero-cards">
              <span className="peek-hero-card" />
              <span className="peek-hero-card" />
              <span className="peek-hero-card" />
            </div>
          </section>
        </div>

        {/* Left: 소개 패널 */}
        <section className="signup-hero navy-panel">
          <div className="hero-top">
            <span className="hero-title-line">회원가입으로 더 많은 기능을</span>
            <span className="hero-title-line">BRANDPILOT에서 시작하세요.</span>
          </div>

          <div className="feature-marquee" aria-label="서비스 핵심 기능">
            <div className="marquee-track">
              <div className="marquee-card">
                <img src={namingLogoImg} alt="네이밍 로고 추천" />
                <strong>네이밍·로고 추천</strong>
                <p>요구사항에 맞는 네이밍과 로고를 추천해드립니다.</p>
              </div>

              <div className="marquee-card">
                <img src={analyzeCompany} alt="기업 진단 분석" />
                <strong>기업 진단분석</strong>
                <p>초기 상황을 분석하여 최적의 제안을 해드립니다.</p>
              </div>

              <div className="marquee-card">
                <img src={analyzeReport} alt="분석기반 리포트" />
                <strong>분석 리포트 제공</strong>
                <p>분석 내용 기반 리포트를 제공합니다.</p>
              </div>

              <div className="marquee-card">
                <img src={makeset} alt="문서초안자동생성" />
                <strong>문서 초안 자동 생성</strong>
                <p>사업제안서, IR등 문서 초안을 자동 생성해줍니다.</p>
              </div>

              <div className="marquee-card">
                <img src={story} alt="스토리텔링" />
                <strong>스타트업 스토리텔링</strong>
                <p>기업 관련 소개글 등 기업관련 홍보글을 생성해줍니다.</p>
              </div>
            </div>
          </div>

          <footer className="hero-footer">
            <div className="hero-footer-links">
              <button
                type="button"
                className="hero-footer-link"
                onClick={() => openReadModal("privacy")}
              >
                개인정보 처리방침
              </button>
              <span className="hero-footer-sep">|</span>
              <button
                type="button"
                className="hero-footer-link"
                onClick={() => openReadModal("terms")}
              >
                이용약관
              </button>
            </div>

            <div className="hero-footer-text">
              <div>
                <strong>BRANDPILOT</strong>
              </div>
              <div>
                BRANDPILOT | 대전광역시 서구 문정로48번길 30 (탄방동, KT타워)
              </div>
              <div>KT AIVLE 7반 15조</div>
              <div className="hero-footer-copy">
                © 2026 Team15 Corp. All rights reserved.
              </div>
            </div>
          </footer>
        </section>

        {/* Right: 회원가입 폼 */}
        <section className="signup-panel light-panel">
          <main className="signup-card">
            <h1 className="signup-title">회원가입</h1>

            <form className="signup-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="signup-id">아이디</label>
                <input
                  id="signup-id"
                  type="text"
                  placeholder="아이디 입력"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoComplete="username"
                  disabled={disabled}
                />
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
                  disabled={disabled}
                />
                <small className="hint">* 이메일 형식으로 입력해주세요.</small>
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
                  disabled={disabled}
                />
                <small className="hint">
                  * 8자 이상, <b>대문자</b>, 숫자, 특수문자를 포함해주세요.
                </small>

                <div className="checkline">
                  <span className={`pill ${pwRules.lenOk ? "ok" : ""}`}>
                    8자+
                  </span>
                  <span className={`pill ${pwRules.upperOk ? "ok" : ""}`}>
                    대문자
                  </span>
                  <span className={`pill ${pwRules.numOk ? "ok" : ""}`}>
                    숫자
                  </span>
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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
                />
              </div>

              {error ? <p className="error">{error}</p> : null}

              <div className="button-row">
                <button type="submit" className="primary" disabled={disabled}>
                  회원가입 하기
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => goLoginWithFlip()}
                  onMouseEnter={warmLoginPage}
                  onFocus={warmLoginPage}
                  disabled={disabled}
                >
                  돌아가기
                </button>
              </div>
            </form>
          </main>
        </section>
      </div>
    </div>
  );
}

const DateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="date-input" onClick={onClick} ref={ref}>
    <input type="text" value={value} placeholder="생년월일 선택" readOnly />
    <span className="calendar-icon">📅</span>
  </div>
));
