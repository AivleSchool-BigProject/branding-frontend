// src/pages/MyPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hasAnyStorage(keys) {
  return keys.some((k) => {
    const raw = localStorage.getItem(k);
    if (!raw) return false;
    const parsed = safeParse(raw);
    return Boolean(parsed && parsed.form);
  });
}

export default function MyPage({ onLogout }) {
  const navigate = useNavigate();

  // ✅ 푸터 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 브랜드 선택(임시)
  const [brandName, setBrandName] = useState("");
  const hasBrand = brandName.trim().length > 0;

  // ✅ 기업진단 결과(너 프로젝트에 결과 페이지 있다고 했으니 true/false는 나중에 실제키로 바꿔도 됨)
  const diagnosisDone = useMemo(() => {
    // DiagnosisResult가 어떤 key로 저장하는지 확실치 않아서,
    // 일단 "진단을 진행했을 수 있는" 후보키를 넣어둠. 실제 키로 바꾸면 정확해짐.
    const CANDIDATES = ["diagnosisResult_v1", "diagnosisInterview_v1"];
    return hasAnyStorage(CANDIDATES);
  }, []);

  // ✅ 브랜드/홍보물 서비스 구성
  const brandServices = useMemo(
    () => [
      {
        key: "logo",
        title: "로고 컨설팅",
        storageKeys: ["brandInterview_logo_v1"],
        goPath: "/logoconsulting",
      },
      {
        key: "naming",
        title: "네이밍 컨설팅",
        storageKeys: ["brandInterview_naming_v1"],
        goPath: "/nameconsulting",
      },
      {
        key: "homepage",
        title: "홈페이지 컨설팅",
        storageKeys: ["brandInterview_homepage_v1"],
        goPath: "/homepageconsulting",
      },
      {
        key: "story",
        title: "브랜드 스토리 컨설팅",
        storageKeys: ["brandInterview_story_v1"],
        goPath: "/brand/story",
      },
    ],
    [],
  );

  const promoServices = useMemo(
    () => [
      {
        key: "digital",
        title: "디지털 이미지",
        // ✅ 프로젝트 실제 저장 키가 다르면 여기에 추가하면 됨
        storageKeys: [
          "promotionInterview_digital_v1",
          "promoInterview_digital_v1",
          "promotion_digital_v1",
        ],
        goPath: "/promotion/digital/interview",
      },
      {
        key: "offline",
        title: "오프라인 이미지",
        storageKeys: [
          "promotionInterview_offline_v1",
          "promoInterview_offline_v1",
          "promotion_offline_v1",
        ],
        goPath: "/promotion/offline/interview",
      },
      {
        key: "video",
        title: "홍보 영상",
        storageKeys: [
          "promotionInterview_video_v1",
          "promoInterview_video_v1",
          "promotion_video_v1",
        ],
        goPath: "/promotion/video/interview",
      },
    ],
    [],
  );

  // ✅ 완료/미진행 계산
  const brandStatus = useMemo(() => {
    return brandServices.map((s) => ({
      ...s,
      done: hasAnyStorage(s.storageKeys),
    }));
  }, [brandServices]);

  const promoStatus = useMemo(() => {
    return promoServices.map((s) => ({
      ...s,
      done: hasAnyStorage(s.storageKeys),
    }));
  }, [promoServices]);

  const brandDoneCount = useMemo(
    () => brandStatus.filter((s) => s.done).length,
    [brandStatus],
  );
  const promoDoneCount = useMemo(
    () => promoStatus.filter((s) => s.done).length,
    [promoStatus],
  );

  const brandProgress = useMemo(() => {
    if (brandStatus.length === 0) return 0;
    return Math.round((brandDoneCount / brandStatus.length) * 100);
  }, [brandDoneCount, brandStatus.length]);

  const promoProgress = useMemo(() => {
    if (promoStatus.length === 0) return 0;
    return Math.round((promoDoneCount / promoStatus.length) * 100);
  }, [promoDoneCount, promoStatus.length]);

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
            <h2 className="mypage-title">마이 페이지</h2>
            <p className="mypage-sub">
              진행 현황과 결과 리포트를 한 번에 확인하세요.
            </p>
          </div>

          <div className="mypage-topActions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => navigate("/main")}
            >
              홈으로
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => alert("개인 정보 설정 (준비중)")}
            >
              개인 정보 설정
            </button>
          </div>
        </div>

        {/* ✅ 프로필 */}
        <section className="mypage-card profile-card">
          <div className="profile-left">
            <div className="profile-avatar" aria-hidden="true" />
            <div className="profile-text">
              <strong className="profile-name">이름</strong>
              <p className="profile-email">이메일</p>
            </div>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => alert("프로필 편집 (준비중)")}
          >
            프로필 편집
          </button>
        </section>

        {/* ✅ 브랜드 선택 */}
        <section className="mypage-card">
          <div className="cardTitleRow">
            <h3>브랜드 선택</h3>
            <span className={`pill ${hasBrand ? "success" : "ghost"}`}>
              {hasBrand ? "선택됨" : "미선택"}
            </span>
          </div>

          <div className="select-row">
            {hasBrand ? (
              <input
                type="text"
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="브랜드명"
                aria-label="브랜드명"
              />
            ) : (
              <select
                aria-label="브랜드 선택"
                defaultValue=""
                onChange={(event) => setBrandName(event.target.value)}
              >
                <option value="" disabled>
                  브랜드 선택
                </option>
                <option value="브랜드 A">브랜드 A</option>
                <option value="브랜드 B">브랜드 B</option>
                <option value="브랜드 C">브랜드 C</option>
              </select>
            )}
          </div>
        </section>

        {/* ✅ 기업 진단 */}
        <section className="mypage-card">
          <div className="cardTitleRow">
            <h3>기업 진단 결과</h3>
            <span className={`pill ${diagnosisDone ? "success" : "ghost"}`}>
              {diagnosisDone ? "완료" : "미진행"}
            </span>
          </div>

          <div className="mypage-rowBetween">
            <p className="muted">기업 진단 리포트(결과 페이지)로 이동합니다.</p>

            <div className="btnRow">
              {!diagnosisDone ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => navigate("/diagnosis")}
                >
                  진단 진행하기
                </button>
              ) : null}

              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate("/diagnosis/result")}
              >
                리포트 보기
              </button>
            </div>
          </div>
        </section>

        {/* ✅ 브랜드 컨설팅 현황 */}
        <section className="mypage-card">
          <div className="cardTitleRow">
            <h3>브랜드 컨설팅 현황</h3>
            <span className="pill">
              {brandDoneCount}/{brandStatus.length} · {brandProgress}%
            </span>
          </div>

          <div className="statusGrid">
            {brandStatus.map((s) => (
              <div className="statusItem" key={s.key}>
                <div className="statusTop">
                  <div className="statusName">{s.title}</div>
                  <span
                    className={`status-pill ${s.done ? "success" : "ghost"}`}
                  >
                    {s.done ? "완료" : "미진행"}
                  </span>
                </div>

                <div className="statusActions">
                  {s.done ? (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => navigate(s.goPath)}
                    >
                      인터뷰 수정
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => navigate(s.goPath)}
                    >
                      지금 진행
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mypage-rowBetween" style={{ marginTop: 14 }}>
            <p className="muted">
              브랜드 통합 리포트에서 전체 결과를 한 번에 확인할 수 있어요.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => navigate("/mypage/brand-results")}
            >
              통합 리포트 보기
            </button>
          </div>
        </section>

        {/* ✅ 홍보물 컨설팅 현황 */}
        <section className="mypage-card">
          <div className="cardTitleRow">
            <h3>홍보물 컨설팅 현황</h3>
            <span className="pill">
              {promoDoneCount}/{promoStatus.length} · {promoProgress}%
            </span>
          </div>

          <div className="statusGrid">
            {promoStatus.map((s) => (
              <div className="statusItem" key={s.key}>
                <div className="statusTop">
                  <div className="statusName">{s.title}</div>
                  <span
                    className={`status-pill ${s.done ? "success" : "ghost"}`}
                  >
                    {s.done ? "완료" : "미진행"}
                  </span>
                </div>

                <div className="statusActions">
                  {s.done ? (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => navigate(s.goPath)}
                    >
                      인터뷰 수정
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => navigate(s.goPath)}
                    >
                      지금 진행
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mypage-rowBetween" style={{ marginTop: 14 }}>
            <p className="muted">
              홍보물 통합 리포트에서 전체 결과를 한 번에 확인할 수 있어요.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => navigate("/mypage/promotion-results")}
            >
              통합 리포트 보기
            </button>
          </div>
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

        {/* ✅ 빠른 이동 */}
        <div className="mypage-navRow">
          <button
            type="button"
            className="mypage-linkBtn"
            onClick={() => navigate("/main")}
          >
            홈으로
          </button>
          <button
            type="button"
            className="mypage-linkBtn"
            onClick={() => navigate("/diagnosis")}
          >
            진단으로
          </button>
          <button
            type="button"
            className="mypage-linkBtn"
            onClick={() => navigate("/brandconsulting")}
          >
            브랜드로
          </button>
          <button
            type="button"
            className="mypage-linkBtn"
            onClick={() => navigate("/promotion")}
          >
            홍보물로
          </button>
        </div>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
