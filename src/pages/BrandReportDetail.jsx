// src/pages/BrandReportDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import { fetchMyBrands, mapBrandDtoToReport } from "../api/mypage.js";
import { userSafeParse } from "../utils/userLocalStorage.js";

const SELECTED_LOGO_MAP_KEY = "selectedLogoUrlByBrand_v1";

function fmt(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function bulletize(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  const s = String(value);
  return s
    .split(/\n/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function Section({ title, name, bullets, extra }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card__head">
        <h2>{title}</h2>
        {name ? <p style={{ margin: "6px 0 0" }}>{name}</p> : null}
      </div>

      {bullets?.length ? (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {bullets.map((t, i) => (
            <li key={`${title}-${i}`}>{t}</li>
          ))}
        </ul>
      ) : null}

      {extra}
    </div>
  );
}

export default function BrandReportDetail({ onLogout }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const location = useLocation();

  const [report, setReport] = useState(() => {
    const st = location?.state || {};
    return st?.report || null;
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      // ✅ MyPage에서 state로 넘긴 report가 있으면 우선 사용
      const st = location?.state || {};
      if (st?.report && String(st.report?.id) === String(id)) {
        setReport(st.report);
        return;
      }

      setLoading(true);
      setLoadError("");

      try {
        const data = await fetchMyBrands();
        const arr = Array.isArray(data) ? data : [];
        const mapped = arr
          .map((dto) => mapBrandDtoToReport(dto))
          .filter((r) => r && r.id);

        const found = mapped.find((r) => String(r.id) === String(id));
        if (found) {
          if (!alive) return;
          setReport(found);
          return;
        }
        // ✅ 서버 목록에도 없으면 종료
        if (!alive) return;
        setLoadError("리포트를 찾을 수 없습니다.");
        setReport(null);
      } catch (e) {
        const msg =
          e?.userMessage || e?.message || "리포트를 불러오지 못했습니다.";
        if (!alive) return;
        setLoadError(msg);
        setReport(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const snap = report?.snapshot || {};
  const diag = snap?.diagnosisSummary || {};
  const sel = snap?.selections || {};

  // ✅ 로고 URL: 서버 snapshot → raw dto → 로컬 fallback 순
  const selectedLogoMap = useMemo(() => {
    const v = userSafeParse(SELECTED_LOGO_MAP_KEY);
    return v && typeof v === "object" ? v : {};
  }, []);

  const logoImageUrl = useMemo(() => {
    const url =
      sel?.logo?.imageUrl ||
      sel?.logo?.url ||
      report?.logoUrl ||
      report?._raw?.logoUrl ||
      report?._raw?.logoImageUrl ||
      report?._raw?.selectedByUser ||
      report?._raw?.selectedLogoUrl ||
      (typeof selectedLogoMap?.[String(id)] === "string"
        ? selectedLogoMap[String(id)]
        : "");

    const raw = typeof url === "string" ? url.trim() : "";
    if (!raw) return "";

    // ✅ 상대경로(/uploads/.., logos/..)면 API_BASE/ASSET_BASE를 붙여서 표시
    const API_BASE =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const ASSET_BASE =
      import.meta.env.VITE_ASSET_BASE_URL ||
      import.meta.env.VITE_S3_BASE_URL ||
      "";

    if (/^(data:|blob:|https?:\/\/)/i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;

    const base = (ASSET_BASE || API_BASE || "").replace(/\/+$/, "");
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return base ? `${base}${path}` : raw;
  }, [sel, report, id, selectedLogoMap]);

  const diagDone = Boolean(
    diag?.companyName ||
    diag?.brandName ||
    diag?.projectName ||
    diag?.oneLine ||
    diag?.shortText,
  );
  const namingDone = Boolean(sel?.naming);
  const conceptDone = Boolean(sel?.concept);
  const storyDone = Boolean(sel?.story);
  const logoDone = Boolean(sel?.logo);

  const fallbackDone = [
    diagDone,
    namingDone,
    conceptDone,
    storyDone,
    logoDone,
  ].filter(Boolean).length;
  const fallbackPct = Math.round((fallbackDone / 5) * 100);

  const storedPctRaw = Number(
    report?.progress?.percent ?? report?.progressPercent ?? Number.NaN,
  );
  const pctFromStored =
    Number.isFinite(storedPctRaw) && storedPctRaw > 0
      ? storedPctRaw
      : fallbackPct;

  const isComplete = Boolean(
    report?.isDummy ? true : (report?.isComplete ?? pctFromStored >= 100),
  );

  const progressPct = Math.max(
    0,
    Math.min(100, isComplete ? 100 : pctFromStored),
  );
  const statusLabel = isComplete ? "완료" : "미완료";

  if (!report) {
    return (
      <div className="diagInterview consultingInterview">
        <SiteHeader onLogout={onLogout} />
        <main className="diagInterview__main">
          <div className="diagInterview__container">
            <div className="card">
              <div className="card__head">
                <h2>
                  {loading
                    ? "리포트를 불러오는 중..."
                    : "리포트를 찾을 수 없습니다"}
                </h2>
                <p>
                  {loading
                    ? "잠시만 기다려 주세요."
                    : loadError
                      ? loadError
                      : "마이페이지에서 다시 선택해 주세요."}
                </p>
              </div>
              <button
                type="button"
                className="btn primary"
                onClick={() => navigate("/mypage")}
              >
                마이페이지로
              </button>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="diagInterview consultingInterview">
      <SiteHeader onLogout={onLogout} />

      <main className="diagInterview__main">
        <div className="diagInterview__container">
          <div className="diagInterview__titleRow">
            <div>
              <h1 className="diagInterview__title">브랜드 컨설팅 리포트</h1>
              <p className="diagInterview__sub">
                저장된 리포트입니다. (서버 저장)
              </p>
            </div>

            <div className="diagInterview__topActions">
              <button
                type="button"
                className="btn"
                onClick={() => navigate("/mypage")}
              >
                마이페이지
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate("/brandconsulting")}
              >
                브랜드 컨설팅 홈
              </button>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card__head">
              <h2>{report.title}</h2>
              {report.subtitle ? <p>{report.subtitle}</p> : null}
              <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 13 }}>
                상태: <strong style={{ fontWeight: 900 }}>{statusLabel}</strong>{" "}
                · 진행도: {progressPct}%
              </p>
              <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 13 }}>
                생성일: {fmt(report.createdAt)}
              </p>
            </div>
          </div>

          <Section
            title="기업 진단 요약"
            name={diag?.companyName || diag?.brandName || ""}
            bullets={bulletize(diag?.shortText || diag?.oneLine)}
            extra={
              diag?.industry || diag?.targetCustomer ? (
                <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
                  {diag?.industry ? (
                    <div>업종: {String(diag.industry)}</div>
                  ) : null}
                  {diag?.targetCustomer ? (
                    <div>타겟: {String(diag.targetCustomer)}</div>
                  ) : null}
                </div>
              ) : null
            }
          />

          <Section
            title="네이밍"
            name={sel?.naming?.name || ""}
            bullets={bulletize(sel?.naming?.summary || sel?.naming?.reason)}
          />

          <Section
            title="컨셉"
            name={sel?.concept?.name || ""}
            bullets={bulletize(sel?.concept?.summary || sel?.concept?.reason)}
          />

          <Section
            title="브랜드 스토리"
            name={sel?.story?.name || ""}
            bullets={bulletize(
              sel?.story?.summary || sel?.story?.story || sel?.story?.reason,
            )}
          />

          <Section
            title="로고"
            name={sel?.logo?.name || ""}
            bullets={bulletize(sel?.logo?.summary || sel?.logo?.reason)}
            extra={
              <div style={{ marginTop: 10 }}>
                {logoImageUrl ? (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ margin: "10px 0 6px" }}>선택한 로고</h4>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <img
                        src={logoImageUrl}
                        alt="선택한 로고"
                        style={{
                          width: 260,
                          maxWidth: "100%",
                          height: "auto",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "white",
                        }}
                      />
                    </div>
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: 12,
                        color: "#6b7280",
                        wordBreak: "break-all",
                      }}
                      title={logoImageUrl}
                    >
                      {logoImageUrl}
                    </p>
                  </div>
                ) : null}

                {sel?.logo?.prompt ? (
                  <div>
                    <h4 style={{ margin: "10px 0 6px" }}>로고 프롬프트</h4>
                    <textarea
                      readOnly
                      value={sel.logo.prompt}
                      rows={6}
                      style={{ width: "100%" }}
                    />
                  </div>
                ) : null}
              </div>
            }
          />

          <details className="card" style={{ marginBottom: 18 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>
              원본 데이터 보기
            </summary>
            <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(report.snapshot, null, 2)}
            </pre>
          </details>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
