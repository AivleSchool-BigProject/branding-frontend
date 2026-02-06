// src/components/EasyLoginModal.jsx
import { useEffect, useState } from "react";
import { startGoogleEasyLogin } from "../lib/googleEasyLogin.js";
import { setAccessToken } from "../api/client.js";
import { setCurrentUserId, setIsLoggedIn } from "../api/auth.js";

/**
 * [EasyLoginModal] 간편로그인 모달(UI)
 * ------------------------------------------------------------
 * ✅ 프론트 단독으로 즉시 동작:
 * - Google: 실제 로그인 동작
 * - Kakao/Naver/Apple: 현재 준비중 안내
 *
 * ✅ Props
 * - open: 모달 열림 여부(boolean)
 * - onClose: 닫기 콜백
 * - onSuccess: 로그인 성공 시 콜백(선택)
 */
export default function EasyLoginModal({ open, onClose, onSuccess }) {
  const [loadingProvider, setLoadingProvider] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleGoogleLogin = async () => {
    setLoadingProvider("Google");
    setStatusMsg("");

    try {
      const result = await startGoogleEasyLogin();

      if (typeof onSuccess === "function") {
        onSuccess(result);
      } else {
        // 부모에서 onSuccess를 연결하지 않은 경우에도 동작하도록 안전장치
        if (result?.accessToken) setAccessToken(result.accessToken);

        const fallbackId =
          result?.user?.email ||
          result?.user?.id ||
          result?.user?.name ||
          `google_${Date.now()}`;

        setCurrentUserId(String(fallbackId));
        setIsLoggedIn(true);

        onClose?.();
        window.location.assign("/main");
      }
    } catch (error) {
      setStatusMsg(
        error?.message || "Google 로그인 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setLoadingProvider("");
    }
  };

  const handleNotReadyProvider = (provider) => {
    setStatusMsg(
      `${provider}는 현재 백엔드 연동 전 단계라 준비중입니다. 지금은 Google만 실제 로그인됩니다.`,
    );
  };

  return (
    <div
      className="easyModal__overlay"
      role="dialog"
      aria-modal="true"
      aria-label="간편 로그인"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="easyModal__panel">
        <div className="easyModal__head">
          <div>
            <h2 className="easyModal__title">간편 로그인</h2>
            <p className="easyModal__desc">
              자주 쓰는 계정으로 빠르게 로그인하세요.
            </p>
          </div>

          <button
            type="button"
            className="easyModal__close"
            aria-label="닫기"
            onClick={() => onClose?.()}
            disabled={!!loadingProvider}
          >
            ✕
          </button>
        </div>

        <div className="easyModal__providers">
          <button
            type="button"
            className="easyModal__providerBtn"
            onClick={handleGoogleLogin}
            disabled={!!loadingProvider}
          >
            <span className="easyModal__icon" aria-hidden="true">
              G
            </span>
            <span className="easyModal__text">Google로 계속하기</span>
            <span className="easyModal__right">
              {loadingProvider === "Google" ? "진행 중..." : "→"}
            </span>
          </button>

          <button
            type="button"
            className="easyModal__providerBtn"
            onClick={() => handleNotReadyProvider("Kakao")}
            disabled={!!loadingProvider}
          >
            <span className="easyModal__icon" aria-hidden="true">
              K
            </span>
            <span className="easyModal__text">Kakao로 계속하기</span>
            <span className="easyModal__right">준비중</span>
          </button>

          <button
            type="button"
            className="easyModal__providerBtn"
            onClick={() => handleNotReadyProvider("Naver")}
            disabled={!!loadingProvider}
          >
            <span className="easyModal__icon" aria-hidden="true">
              N
            </span>
            <span className="easyModal__text">Naver로 계속하기</span>
            <span className="easyModal__right">준비중</span>
          </button>

          <button
            type="button"
            className="easyModal__providerBtn"
            onClick={() => handleNotReadyProvider("Apple")}
            disabled={!!loadingProvider}
          >
            <span className="easyModal__icon" aria-hidden="true">
              
            </span>
            <span className="easyModal__text">Apple로 계속하기</span>
            <span className="easyModal__right">준비중</span>
          </button>
        </div>

        <div className="easyModal__divider" />

        <div className="easyModal__bottom">
          <button
            type="button"
            className="easyModal__ghost"
            onClick={() => onClose?.()}
            disabled={!!loadingProvider}
          >
            나중에 할게요
          </button>

          {statusMsg ? <p className="easyModal__status">{statusMsg}</p> : null}

          <p className="easyModal__footnote">
            * 프론트 단독 단계: Google만 실제 로그인 동작
          </p>
        </div>
      </div>
    </div>
  );
}
