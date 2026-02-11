// src/components/CurrentUserWidget.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CurrentUserWidget.css";

import { apiRequest, clearAccessToken } from "../api/client.js";
import {
  getCurrentUserId,
  getIsLoggedIn,
  clearCurrentUserId,
  clearIsLoggedIn,
} from "../api/auth.js";

export default function CurrentUserWidget() {
  const navigate = useNavigate();
  const rootRef = useRef(null);

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return getIsLoggedIn();
    } catch {
      return false;
    }
  });
  const [userId, setUserId] = useState(() => {
    try {
      return getCurrentUserId();
    } catch {
      return null;
    }
  });
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ brand: 0, promotion: 0 });
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());

  const label = useMemo(() => {
    const id = String(userId ?? "").trim();
    if (!id) return "";
    if (id.length <= 24) return id;
    return `${id.slice(0, 12)}…${id.slice(-8)}`;
  }, [userId]);

  const relativeUpdated = useMemo(() => {
    const diffSec = Math.max(
      1,
      Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000),
    );
    if (diffSec < 60) return "방금 전";
    const m = Math.floor(diffSec / 60);
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    return `${d}일 전`;
  }, [lastUpdatedAt]);

  const countPromotionFromStorage = () => {
    try {
      // 1) 사용자 분리 저장소 기준(정확)
      const promoList = listPromoReports();
      if (Array.isArray(promoList)) return promoList.length;

      // 2) 사용자 분리 키 직접 조회(폴백)
      const scopedKeys = [
        "promoConsultingHistory_v1",
        "promoReportHistory",
        "promotionReportHistory",
        "promotionHistory",
      ];
      for (const key of scopedKeys) {
        const parsed = userSafeParse(key);
        if (Array.isArray(parsed)) return parsed.length;
      }

      // 3) 레거시 전역 키 폴백
      for (const key of scopedKeys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.length;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const countBrandFromStorage = () => {
    try {
      const raw = localStorage.getItem("myBrands");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.length;
      }
      let brand = 0;
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = String(localStorage.key(i) || "");
        const v = String(localStorage.getItem(k) || "");
        if (
          /brand/i.test(k + " " + v) &&
          /(result|history|done|completed|consulting)/i.test(k + " " + v)
        ) {
          brand += 1;
        }
      }
      return brand;
    } catch {
      return 0;
    }
  };

  const refreshCounts = useCallback(async () => {
    let brandCount = 0;
    try {
      // 백엔드 스펙 차이를 고려해서 순차적으로 시도
      const candidates = ["/mypage/brands", "/brands/mine", "/brands"];
      for (const url of candidates) {
        try {
          const res = await apiRequest(url, { method: "GET" });
          const arr = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : null;
          if (arr) {
            brandCount = arr.length;
            break;
          }
        } catch {
          // 다음 후보로 진행
        }
      }
      if (brandCount === 0) brandCount = countBrandFromStorage();
    } catch {
      brandCount = countBrandFromStorage();
    }

    const promotionCount = countPromotionFromStorage();
    setStats({ brand: brandCount, promotion: promotionCount });
    setLastUpdatedAt(new Date());
  }, []);

  useEffect(() => {
    const syncIdentity = () => {
      try {
        setIsLoggedIn(getIsLoggedIn());
      } catch {
        setIsLoggedIn(false);
      }
      try {
        setUserId(getCurrentUserId());
      } catch {
        setUserId(null);
      }
    };

    syncIdentity();
    refreshCounts();

    const onStorage = () => {
      syncIdentity();
      refreshCounts();
    };
    const onUpdated = () => refreshCounts();
    const onFocus = () => refreshCounts();

    window.addEventListener("storage", onStorage);
    window.addEventListener("consulting:updated", onUpdated);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("consulting:updated", onUpdated);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCounts]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    const ok = window.confirm("로그아웃 하시겠습니까?");
    if (!ok) return;
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {}
    clearAccessToken();
    clearCurrentUserId();
    clearIsLoggedIn();
    setOpen(false);
    navigate("/login", { replace: true });
  };

  if (!isLoggedIn || !userId) return null;

  return (
    <div
      ref={rootRef}
      className={`current-user-widget ${open ? "is-open" : ""}`}
      aria-label="현재 로그인 계정"
    >
      <button
        type="button"
        className="current-user-pill"
        onClick={() => {
          setOpen((v) => !v);
          refreshCounts();
        }}
        title="현재 로그인 계정"
        aria-expanded={open}
      >
        <span className="current-user-dot" aria-hidden="true" />
        <span className="current-user-text">
          {/* <span className="current-user-label">로그인 중</span> */}
          <span className="current-user-id">{label}</span>
          <span className="current-user-meta">
            최근 업데이트: {relativeUpdated}
          </span>
        </span>
        <span className="current-user-chev" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>

      <div className="current-user-panel" role="menu" aria-hidden={!open}>
        <section className="current-user-stats">
          <h4>BRANDPILOT</h4>
        </section>

        <button
          type="button"
          className="current-user-menu-item"
          onClick={() => go("/mypage")}
        >
          마이페이지
        </button>
        <button
          type="button"
          className="current-user-menu-item"
          onClick={() => go("/brandconsulting")}
        >
          브랜드 컨설팅 시작하기
        </button>
        <button
          type="button"
          className="current-user-menu-item"
          onClick={() => go("/promotion")}
        >
          홍보물 컨설팅 시작하기
        </button>
        <button
          type="button"
          className="current-user-menu-item danger"
          onClick={handleLogout}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
