// src/utils/reportHistory.js
// ------------------------------------------------------------
// ✅ 마이페이지 카드(히스토리) 저장/조회 유틸
// - 사용자별 localStorage 분리(userLocalStorage) 기반
// - 현재는 프론트(localStorage) 기준이지만,
//   추후 백엔드에서 reportId/brandId 기반으로 대체하기 쉬운 형태로 구성
// ------------------------------------------------------------

import { userGetItem, userSetItem } from "./userLocalStorage.js";
import {
  migrateLegacyToPipelineIfNeeded,
  readPipeline,
  getSelected,
} from "./brandPipelineStorage.js";

const BRAND_HISTORY_KEY = "brandReportHistory_v1";
const PROMO_HISTORY_KEY = "promoReportHistory_v1";

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeString(v, fallback = "") {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function toISO(ts) {
  const d = new Date(ts || Date.now());
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function buildBrandSignature(pipeline) {
  const n =
    pipeline?.naming?.selectedId || pipeline?.naming?.selected?.id || "";
  const c =
    pipeline?.concept?.selectedId || pipeline?.concept?.selected?.id || "";
  const s = pipeline?.story?.selectedId || pipeline?.story?.selected?.id || "";
  const l = pipeline?.logo?.selectedId || pipeline?.logo?.selected?.id || "";
  const diag = pipeline?.diagnosisSummary?.shortText || "";
  return [diag, n, c, s, l].join("|");
}

function readList(key) {
  const raw = userGetItem(key);
  const parsed = safeParse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function writeList(key, list) {
  try {
    userSetItem(key, JSON.stringify(list || []));
  } catch {
    // ignore
  }
}

export function listBrandReports() {
  const list = readList(BRAND_HISTORY_KEY);
  // 최신순 정렬
  return [...list].sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));
}

export function getBrandReport(id) {
  if (!id) return null;
  const list = readList(BRAND_HISTORY_KEY);
  return list.find((r) => r?.id === id) || null;
}

export function addBrandReport(report) {
  if (!report?.id) return;
  const list = readList(BRAND_HISTORY_KEY);

  // ✅ 중복 방지(같은 시그니처가 이미 가장 최신이면 skip)
  const latest = list[0];
  if (
    latest?.signature &&
    report.signature &&
    latest.signature === report.signature
  ) {
    return;
  }

  const next = [report, ...list].slice(0, 50);
  writeList(BRAND_HISTORY_KEY, next);
}

export function createBrandReportSnapshot() {
  // legacy → pipeline 1회 마이그레이션
  const pipeline =
    migrateLegacyToPipelineIfNeeded?.() || readPipeline?.() || {};

  const naming = getSelected?.("naming", pipeline) || null;
  const concept = getSelected?.("concept", pipeline) || null;
  const story = getSelected?.("story", pipeline) || null;
  const logo = getSelected?.("logo", pipeline) || null;

  const company =
    pipeline?.diagnosisSummary?.companyName ||
    pipeline?.diagnosisSummary?.brandName ||
    pipeline?.diagnosisSummary?.projectName ||
    "브랜드";

  const namingTitle = safeString(naming?.name, "");
  const conceptTitle = safeString(concept?.name, "");
  const storyTitle = safeString(story?.name, "");
  const logoTitle = safeString(logo?.name, "");

  const title = namingTitle
    ? `${company} · ${namingTitle}`
    : `${company} 브랜드 리포트`;
  const subtitle = [
    namingTitle ? `네이밍: ${namingTitle}` : null,
    conceptTitle ? `컨셉: ${conceptTitle}` : null,
    storyTitle ? `스토리: ${storyTitle}` : null,
    logoTitle ? `로고: ${logoTitle}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const createdAt = Date.now();
  const id = `br_${createdAt}`;
  const signature = buildBrandSignature(pipeline);

  return {
    id,
    kind: "brand",
    title,
    subtitle,
    createdAt,
    createdISO: toISO(createdAt),
    signature,
    snapshot: {
      diagnosisSummary: pipeline?.diagnosisSummary || null,
      selections: { naming, concept, story, logo },
      pipeline,
    },
  };
}

export function ensureBrandHistorySeeded() {
  const pipeline =
    migrateLegacyToPipelineIfNeeded?.() || readPipeline?.() || {};
  const isDone = Boolean(
    pipeline?.diagnosisSummary?.shortText &&
    (pipeline?.naming?.selectedId || pipeline?.naming?.selected) &&
    (pipeline?.concept?.selectedId || pipeline?.concept?.selected) &&
    (pipeline?.story?.selectedId || pipeline?.story?.selected) &&
    (pipeline?.logo?.selectedId || pipeline?.logo?.selected),
  );
  if (!isDone) return;

  const signature = buildBrandSignature(pipeline);
  const list = readList(BRAND_HISTORY_KEY);
  if (list.some((r) => r?.signature && r.signature === signature)) return;

  addBrandReport(createBrandReportSnapshot());
}

// -----------------------------
// ✅ 홍보물(개별 서비스) 히스토리
// -----------------------------

export function listPromoReports() {
  const list = readList(PROMO_HISTORY_KEY);
  return [...list].sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));
}

export function getPromoReport(id) {
  if (!id) return null;
  const list = readList(PROMO_HISTORY_KEY);
  return list.find((r) => r?.id === id) || null;
}

export function addPromoReport(report) {
  if (!report?.id) return;
  const list = readList(PROMO_HISTORY_KEY);
  const next = [report, ...list].slice(0, 80);
  writeList(PROMO_HISTORY_KEY, next);
}

// NOTE)
// ✅ 홍보물 컨설팅은 서비스 종류가 계속 늘어날 수 있어서,
//    다양한 호출 형태를 허용(선택안/폼을 직접 넘기거나, result payload를 통째로 넘기는 방식)
export function createPromoReportSnapshot(opts = {}) {
  const {
    serviceKey,
    serviceLabel,
    selected: selectedArg,
    form: formArg,
    result,
    interviewRoute,
  } = opts;

  const selected = selectedArg || result?.selected || null;
  const form = formArg || result?.form || null;

  const createdAt = Date.now();
  const id = `pr_${safeString(serviceKey, "promo")}_${createdAt}`;

  const title = safeString(
    selected?.name,
    safeString(serviceLabel, "홍보물 컨설팅 리포트"),
  );
  const subtitle = safeString(
    form?.productName || form?.brandName || form?.serviceName || "",
    safeString(serviceLabel, ""),
  );

  return {
    id,
    kind: "promo",
    serviceKey: safeString(serviceKey, ""),
    serviceLabel: safeString(serviceLabel, ""),
    interviewRoute: safeString(interviewRoute, ""),
    createdAt,
    createdISO: toISO(createdAt),
    title,
    subtitle,
    snapshot: {
      selected,
      form,
      // (선택) 기존 결과 payload도 같이 보관해두면, 추후 상세페이지 확장에 유리
      result: result || null,
    },
  };
}
