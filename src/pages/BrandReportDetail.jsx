// src/pages/BrandReportDetail.jsx
import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import { getBrandReport } from "../utils/reportHistory.js";

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

  const report = useMemo(() => getBrandReport(id), [id]);

  const snap = report?.snapshot || {};
  const diag = snap?.diagnosisSummary || {};
  const sel = snap?.selections || {};

  if (!report) {
    return (
      <div className="diagInterview consultingInterview">
        <SiteHeader onLogout={onLogout} />
        <main className="diagInterview__main">
          <div className="diagInterview__container">
            <div className="card">
              <div className="card__head">
                <h2>리포트를 찾을 수 없습니다</h2>
                <p>마이페이지에서 다시 선택해 주세요.</p>
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
                저장된 리포트 스냅샷입니다. (프론트 임시 저장)
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
              sel?.logo?.prompt ? (
                <div style={{ marginTop: 10 }}>
                  <h4 style={{ margin: "10px 0 6px" }}>로고 프롬프트</h4>
                  <textarea
                    readOnly
                    value={sel.logo.prompt}
                    rows={6}
                    style={{ width: "100%" }}
                  />
                </div>
              ) : null
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
