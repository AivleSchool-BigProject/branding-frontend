// src/pages/MyPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

import { getCurrentUserId } from "../api/auth.js";

import { userSafeParse, userSetJSON } from "../utils/userLocalStorage.js";

import {
  ensureBrandHistorySeeded,
  listBrandReports,
  listPromoReports,
} from "../utils/reportHistory.js";

function fmt(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

const PROFILE_KEY = "userProfile_v1";

function getInitialLabel(userId) {
  const raw = String(userId ?? "").trim();
  if (!raw) return "U";
  // 숫자면 그대로, 문자는 첫 글자
  const first = raw[0];
  return first ? first.toUpperCase() : "U";
}

export default function MyPage({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 푸터 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 결과 탭
  const [tab, setTab] = useState("brand"); // brand | promo
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent"); // recent | old

  const [brandReports, setBrandReports] = useState([]);
  const [promoReports, setPromoReports] = useState([]);

  // ✅ 기존 1회 완료된 리포트(이전 버전)도 카드로 보이게 시드 + 목록 로드
  useEffect(() => {
    // URL 파라미터로 탭 이동(/mypage?tab=promo)
    try {
      const sp = new URLSearchParams(location.search || "");
      const t = sp.get("tab");
      if (t === "promo") setTab("promo");
      if (t === "brand") setTab("brand");
    } catch {
      // ignore
    }

    ensureBrandHistorySeeded();
    setBrandReports(listBrandReports());
    setPromoReports(listPromoReports());
  }, [location.search]);

  const userId = useMemo(() => {
    try {
      return getCurrentUserId();
    } catch {
      return null;
    }
  }, []);

  // ✅ 프로필(사용자 스코프 localStorage)
  const savedProfile = useMemo(() => {
    return userSafeParse(PROFILE_KEY) || {};
  }, []);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(
    savedProfile.displayName || "",
  );
  const [bio, setBio] = useState(savedProfile.bio || "");

  const profileName = displayName.trim() || "사용자";
  const profileIdLabel = userId ? String(userId) : "-";
  const profileInitial = getInitialLabel(profileIdLabel);

  const openProfileEdit = () => {
    const cur = userSafeParse(PROFILE_KEY) || {};
    setDisplayName(cur.displayName || "");
    setBio(cur.bio || "");
    setIsEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    const cur = userSafeParse(PROFILE_KEY) || {};
    setDisplayName(cur.displayName || "");
    setBio(cur.bio || "");
    setIsEditingProfile(false);
  };

  const saveProfile = () => {
    userSetJSON(PROFILE_KEY, {
      displayName: displayName.trim(),
      bio: bio.trim(),
      updatedAt: Date.now(),
    });
    setIsEditingProfile(false);
  };

  const activeReports = tab === "brand" ? brandReports : promoReports;

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    const base = [...activeReports];

    const sorted = base.sort((a, b) => {
      const at = a?.createdAt || 0;
      const bt = b?.createdAt || 0;
      return sort === "old" ? at - bt : bt - at;
    });

    if (!keyword) return sorted;
    return sorted.filter((r) => {
      const t = String(r?.title || "").toLowerCase();
      const s = String(r?.subtitle || "").toLowerCase();
      const lab = String(r?.serviceLabel || "").toLowerCase();
      return (
        t.includes(keyword) || s.includes(keyword) || lab.includes(keyword)
      );
    });
  }, [activeReports, q, sort]);

  const goStart = () => {
    if (tab === "promo") {
      navigate("/promotion");
    } else {
      navigate("/brandconsulting");
    }
  };

  const goDetail = (r) => {
    if (!r?.id) return;
    if (r.kind === "promo") navigate(`/mypage/promo-report/${r.id}`);
    else navigate(`/mypage/brand-report/${r.id}`);
  };

  return (
    <div className="mypage-page">
      {/* ✅ 약관/방침 모달 */}
      <PolicyModal
        open={openType === "privacy"}
        title="개인정보 처리방침"
        onClose={closeModal}
      >
        <PrivacyContent />
      </PolicyModal>

      <PolicyModal
        open={openType === "terms"}
        title="이용약관"
        onClose={closeModal}
      >
        <TermsContent />
      </PolicyModal>

      <SiteHeader onLogout={onLogout} />

      <main className="mypage-content">
        <div className="mypage-headerRow">
          <div>
            <h2 className="mypage-title">마이페이지</h2>
            <p className="mypage-sub">
              내가 만든 리포트를 모아보고, 다시 실행할 수 있어요.
            </p>
          </div>
          <div className="mypage-headerActions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => navigate("/main")}
            >
              홈으로
            </button>
            <button type="button" className="btn" onClick={goStart}>
              {tab === "promo" ? "홍보물 컨설팅 시작" : "브랜드 컨설팅 시작"}
            </button>
          </div>
        </div>

        {/* ✅ 프로필(리뉴얼) */}
        <section className="mypage-card myprofileCard">
          <div className="myprofileBanner">
            <div className="myprofileLeft">
              <div className="myprofileAvatar" aria-hidden="true">
                {profileInitial}
              </div>

              <div className="myprofileText">
                <div className="myprofileNameRow">
                  <div className="myprofileName">{profileName}</div>
                  <span className="myprofileId">ID · {profileIdLabel}</span>
                </div>

                <div className="myprofileBio">
                  {bio.trim() || "로그인 계정 기준으로 결과가 분리 저장됩니다."}
                </div>

                <div className="myprofileChips">
                  <span className="metaChip">브랜드 {brandReports.length}</span>
                  <span className="metaChip">홍보물 {promoReports.length}</span>
                </div>
              </div>
            </div>

            <div className="myprofileActions">
              <button
                type="button"
                className="btn ghost"
                onClick={openProfileEdit}
              >
                프로필 편집
              </button>
            </div>
          </div>

          {isEditingProfile ? (
            <div className="myprofileEdit">
              <div className="myprofileField">
                <label>표시 이름</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="예: 홍길동 / 팀명 / 닉네임"
                />
              </div>

              <div className="myprofileField">
                <label>한 줄 소개</label>
                <input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="예: 내 리포트는 이곳에 저장돼요"
                />
              </div>

              <div className="btnRow" style={{ marginTop: 4 }}>
                <button type="button" className="btn" onClick={saveProfile}>
                  저장
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={cancelProfileEdit}
                >
                  취소
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {/* ✅ 결과 섹션 */}
        <section className="mypage-card">
          <div className="cardTitleRow" style={{ marginBottom: 12 }}>
            <h3>내 리포트</h3>
            <span className="pill ghost">카드형 히스토리</span>
          </div>

          <div className="myhub-tabs" role="tablist" aria-label="리포트 종류">
            <button
              type="button"
              className={`myhub-tab ${tab === "brand" ? "is-active" : ""}`}
              onClick={() => setTab("brand")}
            >
              브랜드 컨설팅 결과
              <span className="myhub-count">{brandReports.length}</span>
            </button>
            <button
              type="button"
              className={`myhub-tab ${tab === "promo" ? "is-active" : ""}`}
              onClick={() => setTab("promo")}
            >
              홍보물 컨설팅 결과
              <span className="myhub-count">{promoReports.length}</span>
            </button>
          </div>

          <div className="myhub-toolbar">
            <div className="myhub-search">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  tab === "promo"
                    ? "서비스/키워드로 검색"
                    : "브랜드/키워드로 검색"
                }
              />
            </div>
            <div className="myhub-right">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">최신순</option>
                <option value="old">오래된순</option>
              </select>
              <button type="button" className="btn" onClick={goStart}>
                새로 만들기
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="myhub-empty">
              <div>
                <h4 style={{ margin: 0 }}>아직 저장된 리포트가 없습니다</h4>
                <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
                  컨설팅을 완료하면 카드가 자동으로 쌓입니다.
                </p>
              </div>
              <button type="button" className="btn primary" onClick={goStart}>
                지금 시작하기
              </button>
            </div>
          ) : (
            <div className="reportStack">
              {filtered.map((r) => (
                <article key={r.id} className="reportCard">
                  <div className="reportCard__top">
                    <div>
                      <h4 className="reportCard__title">{r.title}</h4>
                      {r.subtitle ? (
                        <p className="reportCard__sub">{r.subtitle}</p>
                      ) : null}
                      <div className="reportMeta">
                        {r.serviceLabel ? (
                          <span className="metaChip">{r.serviceLabel}</span>
                        ) : null}
                        <span className="metaChip ghost">
                          {fmt(r.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="reportCard__actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => goDetail(r)}
                      >
                        리포트 보기
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ✅ 계정 관리 */}
        <section className="mypage-card">
          <div className="cardTitleRow">
            <h3>계정 관리</h3>
            <span className="pill ghost">주의</span>
          </div>

          <div className="btnRow">
            <button
              type="button"
              className="btn ghost"
              onClick={() => alert("비밀번호 변경 (준비중)")}
            >
              비밀번호 변경
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => alert("회원 탈퇴 (준비중)")}
            >
              회원 탈퇴
            </button>
          </div>
        </section>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
