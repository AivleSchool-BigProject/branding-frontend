// src/pages/BrandAllResults.jsx
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

function fmtDate(updatedAt) {
  if (!updatedAt) return "-";
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function BrandAllResults({ onLogout }) {
  const navigate = useNavigate();

  // ✅ 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  /**
   * ✅ 브랜드 통합 결과(모아보기)
   * - 완료 기준: legacyKey(brandInterview_*_v1)에 selectedId가 존재하면 "완료"
   * - 진행중 기준: 완료는 아니지만 draftKey에 form이 있으면 "진행중"
   * - 미시작 기준: 둘 다 없으면 "미시작"
   *
   * 🔔 컨셉은 내부적으로 service=homepage 로 결과 페이지가 연결됨
   * - 결과보기: /brand/result?service=homepage
   * - 인터뷰: /brand/concept/interview
   */
  const SERVICES = useMemo(
    () => [
      {
        key: "naming",
        title: "네이밍",
        desc: "타깃/톤/키워드 기반 네이밍 3안 + 선택",
        legacyKey: "brandInterview_naming_v1",
        draftKey: "namingConsultingInterviewDraft_v1",
        interviewRoute: "/brand/naming/interview",
        resultRoute: "/brand/result?service=naming",
      },
      {
        key: "concept",
        title: "컨셉",
        desc: "사이트 목적/CTA/섹션 기반 컨셉 3안 + 선택",
        legacyKey: "brandInterview_homepage_v1",
        draftKey: "conceptInterviewDraft_homepage_v6",
        interviewRoute: "/brand/concept/interview",
        resultRoute: "/brand/result?service=homepage",
      },
      {
        key: "story",
        title: "스토리",
        desc: "Origin/Problem/Solution 기반 스토리 3안 + 선택",
        legacyKey: "brandInterview_story_v1",
        draftKey: "brandStoryConsultingInterviewDraft_v1",
        interviewRoute: "/brand/story",
        resultRoute: "/brand/result?service=story",
      },
      {
        key: "logo",
        title: "로고",
        desc: "브랜드 성격/키워드 기반 로고 방향 3안 + 선택",
        legacyKey: "brandInterview_logo_v1",
        draftKey: "logoConsultingInterviewDraft_v1",
        interviewRoute: "/brand/logo/interview",
        resultRoute: "/brand/result?service=logo",
      },
    ],
    [],
  );

  const cards = useMemo(() => {
    return SERVICES.map((s) => {
      const legacy = safeParse(localStorage.getItem(s.legacyKey));
      const draft = safeParse(localStorage.getItem(s.draftKey));

      const selectedId = legacy?.selectedId || legacy?.selected?.id;

      const selected =
        legacy?.selected ||
        (Array.isArray(legacy?.candidates)
          ? legacy.candidates.find((c) => c.id === selectedId)
          : null);

      const isDone = Boolean(selectedId);
      const inProgress =
        !isDone &&
        Boolean(draft?.form || legacy?.form || legacy?.candidates?.length);

      const updatedAt = legacy?.updatedAt || draft?.updatedAt;

      return {
        ...s,
        isDone,
        inProgress,
        updatedLabel: fmtDate(updatedAt),
        selectedTitle: selected?.name || "",
      };
    });
  }, [SERVICES]);

  const doneCount = useMemo(
    () => cards.filter((c) => c.isDone).length,
    [cards],
  );

  const progress = useMemo(() => {
    if (!cards.length) return 0;
    return Math.round((doneCount / cards.length) * 100);
  }, [doneCount, cards.length]);

  return (
    <div className="brandAll-page">
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

      <main className="brandAll-main">
        <div className="brandAll-container">
          <div className="brandAll-titleRow">
            <div>
              <h1 className="brandAll-title">브랜드 컨설팅 결과 모아보기</h1>
              <p className="brandAll-sub">
                네이밍 · 컨셉 · 스토리 · 로고 결과를 한 곳에서 확인할 수 있어요.
              </p>
            </div>

            <div className="brandAll-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate("/brandconsulting")}
              >
                브랜드 컨설팅 홈
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => navigate("/mypage")}
              >
                마이페이지
              </button>
            </div>
          </div>

          <div className="brandAll-grid">
            {/* Left: 서비스 카드 리스트 */}
            <section className="brandAll-left">
              {cards.map((c) => (
                <article
                  key={c.key}
                  id={`svc-${c.key}`}
                  className="card brandAll-card"
                >
                  <div className="card__head brandAll-cardHead">
                    <div>
                      <h2 className="brandAll-cardTitle">{c.title}</h2>
                      <p className="brandAll-cardDesc">{c.desc}</p>
                    </div>

                    {c.isDone ? (
                      <span className="status-pill success">완료</span>
                    ) : c.inProgress ? (
                      <span className="status-pill progress">진행중</span>
                    ) : (
                      <span className="status-pill ghost">미시작</span>
                    )}
                  </div>

                  <div className="brandAll-meta">
                    <div className="brandAll-metaRow">
                      <span className="k">마지막 저장</span>
                      <span className="v">{c.updatedLabel}</span>
                    </div>

                    {c.isDone && c.selectedTitle ? (
                      <div className="brandAll-metaRow">
                        <span className="k">선택한 안</span>
                        <span className="v">{c.selectedTitle}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="brandAll-cardActions">
                    {c.isDone ? (
                      <>
                        <button
                          type="button"
                          className="btn primary"
                          onClick={() => navigate(c.resultRoute)}
                        >
                          결과 보기
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => navigate(c.interviewRoute)}
                        >
                          다시 인터뷰
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => navigate(c.interviewRoute)}
                      >
                        {c.inProgress ? "인터뷰 진행하기" : "인터뷰 시작"}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>

            {/* Right: 사이드 요약 */}
            <aside className="brandAll-right">
              <div className="sideCard">
                <div className="sideCard__titleRow">
                  <h3>진행 현황</h3>
                  <span className="badge">{progress}%</span>
                </div>

                <div
                  className="progressBar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="progressBar__fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="sideMeta">
                  <div className="sideMeta__row">
                    <span className="k">완료</span>
                    <span className="v">
                      {doneCount}/{cards.length}
                    </span>
                  </div>
                </div>

                <div className="divider" />

                <h4 className="sideSubTitle">빠른 이동</h4>
                <div className="jumpGrid">
                  {cards.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className="jumpBtn"
                      onClick={() => {
                        const el = document.getElementById(`svc-${c.key}`);
                        if (el)
                          el.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>

                <div className="divider" />

                <button
                  type="button"
                  className="btn primary w100"
                  onClick={() => navigate("/brandconsulting")}
                >
                  브랜드 컨설팅 홈으로
                </button>

                <p className="hint">
                  * 이 페이지는 localStorage에 저장된 brandInterview_*_v1 /
                  Draft 값을 기준으로 상태를 표시합니다.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
