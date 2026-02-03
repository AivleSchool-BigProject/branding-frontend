// src/pages/InvestmentPostEdit.jsx
// 2026-01-20
// 게시글 수정 페이지 구현
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";
import { apiRequest } from "../api/client.js";

const LOCATION_OPTIONS = [
  "수도권",
  "강원도",
  "충남/충북",
  "경남/경북",
  "전남/전북",
  "제주",
];
const COMPANY_SIZE_OPTIONS = [
  "예비 창업 / 개인",
  "스타트업",
  "중소기업",
  "중견기업",
  "대기업",
];
export default function InvestmentPostEdit({ onLogout }) {
  const navigate = useNavigate();
  const { id } = useParams();

  // ✅ 드롭다운 닫기 UX는 "옵션 선택 시 즉시 닫기"만 사용

  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  const [form, setForm] = useState({
    company: "",
    oneLiner: "",
    locations: [],
    companySizes: [],
    logoImageUrl: "",
    hashtags: ["", "", "", "", ""],
    contactName: "",
    contactEmail: "",
    summary: "",
  });
  const [notFound, setNotFound] = useState(false);
  const [logoFileName, setLogoFileName] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const tagList = useMemo(() => {
    return form.hashtags.map((tag) => tag.trim()).filter(Boolean);
  }, [form.hashtags]);

  const previewLogo = (form.company || "회사").slice(0, 2).toUpperCase();
  const logoSrc = logoPreview || form.logoImageUrl;

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoFileName("");
      setLogoPreview("");
      setLogoFile(null);
      return;
    }

    setLogoFileName(file.name);
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  // ✅ 단일 선택: 지역 1개만 저장 + 옵션 선택 시 즉시 닫기
  const selectLocation = (value) => {
    setForm((prev) => ({ ...prev, locations: value ? [value] : [] }));
    setLocationOpen(false);
  };

  const removeLocation = (value) => {
    setForm((prev) => ({
      ...prev,
      locations: prev.locations.filter((loc) => loc !== value),
    }));
  };

  // ✅ 단일 선택: 회사 규모 1개만 저장 + 옵션 선택 시 즉시 닫기
  const selectCompanySize = (value) => {
    setForm((prev) => ({ ...prev, companySizes: value ? [value] : [] }));
    setSizeOpen(false);
  };

  const removeCompanySize = (value) => {
    setForm((prev) => ({
      ...prev,
      companySizes: prev.companySizes.filter((size) => size !== value),
    }));
  };

  useEffect(() => {
    let mounted = true;
    const fetchPost = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const data = await apiRequest(`/brands/posts/${id}`);
        if (!data) {
          if (mounted) setNotFound(true);
          return;
        }
        if (!mounted) return;
        setForm((prev) => ({
          ...prev,
          company: data.companyName || "",
          oneLiner: data.shortDescription || "",
          locations: data.region ? [data.region] : [],
          companySizes: data.companySize ? [data.companySize] : [],
          logoImageUrl: data.logoImageUrl || "",
          hashtags: Array.isArray(data.hashtags)
            ? [...data.hashtags, "", "", "", "", ""].slice(0, 5)
            : prev.hashtags,
          contactName: data.contactName || "",
          contactEmail: data.contactEmail || "",
          summary: data.companyDescription || "",
        }));
        setLogoPreview(data.logoImageUrl || "");
      } catch (error) {
        console.error(error);
        const status = error?.response?.status;
        if (!mounted) return;

        if (status === 403) {
          alert("수정 권한이 없습니다.");
          navigate(-1);
          return;
        }

        if (status === 404) {
          setNotFound(true);
          return;
        }

        alert(
          error?.userMessage
            ? `${error.userMessage}${status ? ` (에러코드: ${status})` : ""}`
            : status
              ? `오류가 발생했습니다. (에러코드: ${status})`
              : "오류가 발생했습니다.",
        );
        setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPost();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setLoading(true);

    const payload = {
      companyName: form.company.trim(),
      shortDescription: form.oneLiner.trim(),
      region: form.locations[0] || "",
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim(),
      companyDescription: form.summary.trim(),
      companySize: form.companySizes[0] || "",
      hashtag1: form.hashtags[0] || "",
      hashtag2: form.hashtags[1] || "",
      hashtag3: form.hashtags[2] || "",
      hashtag4: form.hashtags[3] || "",
      hashtag5: form.hashtags[4] || "",
    };

    const formData = new FormData();
    formData.append(
      "data",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
    if (logoFile) formData.append("image", logoFile);

    try {
      await apiRequest(`/brands/posts/${id}`, {
        method: "PUT",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      navigate("/investment");
    } catch (error) {
      console.error(error);
      const status = error?.response?.status;
      if (status === 403) {
        alert("수정 권한이 없습니다.");
        navigate(-1);
        return;
      }
      setSubmitError(error?.userMessage || "게시글 수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm("정말 삭제하시겠습니까?");
    if (!ok) return;
    try {
      await apiRequest(`/brands/posts/${id}`, { method: "DELETE" });
      alert("삭제되었습니다.");
    } catch (error) {
      console.error(error);
      const status = error?.response?.status;
      if (status === 403) {
        alert("삭제 권한이 없습니다.");
        return;
      }
      alert(
        error?.userMessage ||
          "삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    navigate("/investment");
  };

  return (
    <div className="invest-create-page">
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

      <main className="invest-create-main">
        <section className="invest-create-hero">
          <div>
            <h1 className="invest-create-title">투자 게시글 수정</h1>
            <p className="invest-create-sub">
              작성한 투자 게시글을 수정하거나 삭제할 수 있습니다.
            </p>
          </div>
          <div className="invest-create-hero-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => navigate("/investment")}
            >
              목록으로
            </button>
          </div>
        </section>

        {loading ? (
          <section className="invest-create-card">
            <p>불러오는 중...</p>
          </section>
        ) : notFound ? (
          <section className="invest-create-card">
            <p>수정할 게시글을 찾을 수 없습니다.</p>
            <div className="invest-form-actions">
              <button
                type="button"
                className="btn"
                onClick={() => navigate("/investment")}
              >
                목록으로
              </button>
            </div>
          </section>
        ) : (
          <section className="invest-create-grid">
            <form
              id="invest-edit"
              className="invest-create-card"
              onSubmit={handleSubmit}
            >
              <div className="invest-form-row two-col">
                <label className="invest-form-label">
                  회사명
                  <input
                    type="text"
                    value={form.company}
                    onChange={updateField("company")}
                    placeholder="브랜드 파일럿"
                    required
                  />
                </label>
                <label className="invest-form-label">
                  한 줄 소개
                  <input
                    type="text"
                    value={form.oneLiner}
                    onChange={updateField("oneLiner")}
                    placeholder="예: AI 기반 B2B 영업 효율화 SaaS"
                  />
                </label>
              </div>

              <div className="invest-form-row">
                <label className="invest-form-label">
                  로고 이미지 업로드
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                </label>
                {logoFileName ? (
                  <div className="invest-form-helper">
                    선택된 파일: {logoFileName}
                  </div>
                ) : logoSrc ? (
                  <div className="invest-form-helper">
                    현재 로고가 등록되어 있습니다.
                  </div>
                ) : null}
              </div>

              <div className="invest-form-row two-col">
                <label className="invest-form-label">
                  지역
                  <div className="invest-location-select">
                    <button
                      type="button"
                      className="invest-location-control"
                      onClick={() => setLocationOpen((prev) => !prev)}
                      aria-expanded={locationOpen ? "true" : "false"}
                    >
                      <div className="invest-location-chips">
                        {form.locations.length === 0 ? (
                          <span className="placeholder">지역을 선택하세요</span>
                        ) : (
                          form.locations.map((loc) => (
                            <span key={loc} className="invest-location-chip">
                              {loc}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeLocation(loc);
                                }}
                                aria-label={`${loc} 제거`}
                              >
                                x
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <span className={`chev ${locationOpen ? "is-open" : ""}`}>
                        ▾
                      </span>
                    </button>
                    {locationOpen ? (
                      <div className="invest-location-panel">
                        {LOCATION_OPTIONS.map((loc) => {
                          const selected = form.locations.includes(loc);
                          return (
                            <button
                              key={loc}
                              type="button"
                              className={`invest-location-option ${
                                selected ? "is-selected" : ""
                              }`}
                              // ✅ 옵션 클릭 시 즉시 닫기 (키보드 Enter도 onClick으로 지원)
                              onMouseDown={(event) => {
                                event.preventDefault();
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                selectLocation(loc);
                              }}
                            >
                              {loc}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </label>
                <label className="invest-form-label">
                  회사 규모
                  <div className="invest-location-select">
                    <button
                      type="button"
                      className="invest-location-control"
                      onClick={() => setSizeOpen((prev) => !prev)}
                      aria-expanded={sizeOpen ? "true" : "false"}
                    >
                      <div className="invest-location-chips">
                        {form.companySizes.length === 0 ? (
                          <span className="placeholder">
                            회사 규모를 선택하세요
                          </span>
                        ) : (
                          form.companySizes.map((size) => (
                            <span key={size} className="invest-location-chip">
                              {size}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeCompanySize(size);
                                }}
                                aria-label={`${size} 제거`}
                              >
                                x
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <span className={`chev ${sizeOpen ? "is-open" : ""}`}>
                        ▾
                      </span>
                    </button>
                    {sizeOpen ? (
                      <div className="invest-location-panel">
                        {COMPANY_SIZE_OPTIONS.map((size) => {
                          const selected = form.companySizes.includes(size);
                          return (
                            <button
                              key={size}
                              type="button"
                              className={`invest-location-option ${
                                selected ? "is-selected" : ""
                              }`}
                              // ✅ 옵션 클릭 시 즉시 닫기 (키보드 Enter도 onClick으로 지원)
                              onMouseDown={(event) => {
                                event.preventDefault();
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                selectCompanySize(size);
                              }}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </label>
              </div>

              <div className="invest-form-row">
                <label className="invest-form-label">
                  태그 (최대 5개)
                  <div className="invest-tag-grid">
                    {form.hashtags.map((value, index) => (
                      <input
                        key={`hashtag-${index}`}
                        type="text"
                        value={value}
                        onChange={(event) => {
                          const next = [...form.hashtags];
                          next[index] = event.target.value;
                          setForm((prev) => ({ ...prev, hashtags: next }));
                        }}
                        placeholder={`해시태그 ${index + 1}`}
                      />
                    ))}
                  </div>
                </label>
              </div>

              <div className="invest-form-row two-col">
                <label className="invest-form-label">
                  담당자 이름
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={updateField("contactName")}
                    placeholder="홍길동"
                  />
                </label>
                <label className="invest-form-label">
                  담당자 이메일
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={updateField("contactEmail")}
                    placeholder="contact@brandpilot.kr"
                  />
                </label>
              </div>

              <div className="invest-form-row">
                <label className="invest-form-label">
                  상세 소개
                  <textarea
                    value={form.summary}
                    onChange={updateField("summary")}
                    placeholder="사업 모델, traction, 지표 등 투자자가 바로 이해할 수 있도록 작성해 주세요."
                    rows={5}
                  />
                </label>
              </div>

              <div className="invest-form-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleDelete}
                >
                  삭제
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={loading}
                >
                  수정 저장
                </button>
              </div>
              {submitError ? (
                <div className="invest-form-error">{submitError}</div>
              ) : null}
            </form>

            <aside className="invest-create-side">
              <div className="invest-preview invest-preview--board">
                <div className="invest-preview-top">
                  <div className="invest-preview-text">
                    <h3>{form.company || "회사명 입력"}</h3>
                    <p className="invest-preview-oneliner">
                      {form.oneLiner || "한 줄 소개가 표시됩니다."}
                    </p>
                  </div>
                  <div className="invest-preview-logo" aria-hidden="true">
                    {logoSrc ? (
                      <img src={logoSrc} alt="로고 미리보기" />
                    ) : (
                      previewLogo
                    )}
                  </div>
                </div>
                <div className="invest-preview-tags">
                  {tagList.length === 0 ? (
                    <span className="empty">태그를 입력해 주세요.</span>
                  ) : (
                    tagList.map((tag) => <span key={tag}>#{tag}</span>)
                  )}
                </div>
                <div className="invest-preview-bottom">
                  <div className="invest-preview-meta">
                    <div className="invest-preview-status">
                      {[
                        form.locations.length
                          ? form.locations.join(", ")
                          : "지역 미선택",
                        form.companySizes.length
                          ? form.companySizes.join(", ")
                          : "회사 규모 미선택",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    <div className="invest-preview-updated">
                      업데이트: {new Date().toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <span className="invest-preview-link" aria-hidden="true">
                    ↗
                  </span>
                </div>
              </div>
            </aside>
          </section>
        )}
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
