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

// ✅ 더미(백 연동 전, UI 확인용)
// - 마이페이지에서 "결과가 여러 개 쌓였을 때" 화면 확인을 위한 임시 데이터
// - 실제 리포트가 1개라도 있으면 더미는 생성되지 않습니다.
const BRAND_DUMMY_SEEDED_KEY = "brandReportHistory_dummySeeded_v1";

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

// ------------------------------------------------------------
// ✅ 더미 브랜드 리포트 3개 생성(마이페이지 UI 확인용)
// - 조건: 현재 브랜드 히스토리가 비어있을 때만 1회 생성
// - 실제 결과가 생기기 시작하면(히스토리 1개 이상) 자동으로 생성되지 않음
// ------------------------------------------------------------

function makeDummyBrandReport(seed) {
  const createdAt = seed?.createdAt || Date.now();
  const id = `br_dummy_${createdAt}`;
  const company = safeString(seed?.company, "브랜드");

  const naming = seed?.naming || {
    id: "n1",
    name: "AURORA",
    summary: "핵심 가치: 투명함·신뢰\n톤앤매너: 미니멀·프리미엄",
  };
  const concept = seed?.concept || {
    id: "c1",
    name: "Clear Growth",
    summary: "문제정의 → 솔루션 → 성과를 한눈에\n키워드: 정돈, 선명함, 확장",
  };
  const story = seed?.story || {
    id: "s1",
    name: "From Chaos to Clarity",
    summary:
      "우리는 복잡한 정보를 쉽게 바꿉니다.\n고객이 ‘이해’하는 순간이 ‘성장’의 시작입니다.",
  };
  const logo = seed?.logo || {
    id: "l1",
    name: "Grid Mark",
    summary: "선명한 그리드 + 포인트 라인\n디지털/오프라인 확장성 고려",
    prompt:
      "Minimal geometric logo, grid-based mark, clean lines, modern tech brand, monochrome, high contrast",
  };

  const namingTitle = safeString(naming?.name, "");
  const title = namingTitle
    ? `${company} · ${namingTitle}`
    : `${company} 브랜드 리포트`;
  const subtitle = [
    namingTitle ? `네이밍: ${namingTitle}` : null,
    concept?.name ? `컨셉: ${concept.name}` : null,
    story?.name ? `스토리: ${story.name}` : null,
    logo?.name ? `로고: ${logo.name}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id,
    kind: "brand",
    title: `[더미] ${title}`,
    subtitle,
    serviceLabel: "더미",
    createdAt,
    createdISO: toISO(createdAt),
    signature: `dummy|${company}|${createdAt}`,
    isDummy: true,
    snapshot: {
      diagnosisSummary: {
        companyName: company,
        industry: safeString(seed?.industry, "브랜딩/컨설팅"),
        targetCustomer: safeString(seed?.targetCustomer, "20-40대 직장인"),
        shortText: safeString(
          seed?.shortText,
          "백엔드 연동 전, 마이페이지 UI 확인을 위한 더미 리포트입니다.",
        ),
        oneLine: safeString(seed?.oneLine, "더미 데이터 샘플"),
      },
      selections: { naming, concept, story, logo },
      pipeline: null,
    },
  };
}

export function ensureBrandHistoryDummies() {
  const list = readList(BRAND_HISTORY_KEY);
  if (list.length > 0) return;

  // 이미 더미를 만든 적이 있으면 재생성하지 않음
  if (userGetItem(BRAND_DUMMY_SEEDED_KEY)) return;

  const now = Date.now();
  const d1 = makeDummyBrandReport({
    createdAt: now - 1000 * 60 * 60 * 24 * 12,
    company: "미드나잇 카페",
    industry: "F&B(카페)",
    targetCustomer: "퇴근 후 20-30대",
    shortText: "감성/분위기 중심의 야간 카페 브랜딩 방향 제안",
    naming: {
      id: "n_dummy_1",
      name: "MOONBREW",
      summary: "야간·휴식·향을 연상\n발음/표기 간결",
    },
    concept: {
      id: "c_dummy_1",
      name: "Night Ritual",
      summary: "하루의 마무리를 위한 의식\n키워드: 달빛, 따뜻함, 정적",
    },
    story: {
      id: "s_dummy_1",
      name: "A cup to slow down",
      summary:
        "바쁜 하루 끝, 속도를 낮추는 한 잔.\n달빛처럼 은은한 시간을 제공합니다.",
    },
    logo: {
      id: "l_dummy_1",
      name: "Crescent Cup",
      summary: "초승달+컵 실루엣\n간판/스티커 적용성 우수",
      prompt:
        "Minimal logo, crescent moon integrated with coffee cup silhouette, soft curves, simple vector, monochrome",
    },
  });

  const d2 = makeDummyBrandReport({
    createdAt: now - 1000 * 60 * 60 * 24 * 5,
    company: "그로우핏",
    industry: "헬스/피트니스",
    targetCustomer: "운동 초보/입문자",
    shortText: "초보 친화적·지속 가능한 습관 형성 컨셉",
    naming: {
      id: "n_dummy_2",
      name: "GROWFIT",
      summary: "성장(Grow)+운동(Fit) 직관적\n서비스 확장에 유리",
    },
    concept: {
      id: "c_dummy_2",
      name: "Small Wins",
      summary: "작은 성공을 쌓아 루틴화\n키워드: 지속, 동기, 기록",
    },
    story: {
      id: "s_dummy_2",
      name: "Progress you can see",
      summary:
        "하루 10분이라도 ‘보이는 변화’를 만듭니다.\n기록은 습관이 되고, 습관은 자신감이 됩니다.",
    },
    logo: {
      id: "l_dummy_2",
      name: "Step Arrow",
      summary: "계단형 화살표\n앱 아이콘/배지 활용",
      prompt:
        "Modern fitness logo, step-shaped arrow mark, bold simple shapes, scalable, monochrome, minimal",
    },
  });

  const d3 = makeDummyBrandReport({
    createdAt: now - 1000 * 60 * 60 * 24 * 1,
    company: "페이퍼클라우드",
    industry: "문구/라이프스타일",
    targetCustomer: "감성 문구를 좋아하는 10-30대",
    shortText: "감성 + 기능성 균형, 선물/패키징 확장 고려",
    naming: {
      id: "n_dummy_3",
      name: "PAPER CLOUD",
      summary:
        "가벼움·감성·정리의 이미지\n브랜드 확장(노트/다이어리/스티커) 용이",
    },
    concept: {
      id: "c_dummy_3",
      name: "Soft Organization",
      summary: "정리의 부담을 낮추는 부드러운 경험\n키워드: 여백, 차분함, 기록",
    },
    story: {
      id: "s_dummy_3",
      name: "Make space for ideas",
      summary:
        "아이디어가 쉴 수 있는 여백을 만듭니다.아이디어가 쉴 수 있는 여백을 만듭니다.아이디어가 쉴 수 있는 여백을 만듭니다.아이디어가 쉴 수 있는 여백을 만듭니다.아이디어가 쉴 수 있는 여백을 만듭니다.아이디어가 쉴 수 있는 여백을 만듭니다.\n기록이 습관이 되도록, 더 쉽게.",
    },
    logo: {
      id: "l_dummy_3",
      name: "Cloud Sheet",
      summary: "구름+종이 레이어\n패키지/라벨 적용성",
      prompt:
        "Minimal stationery brand logo, paper sheet layered with subtle cloud motif, clean lines, simple vector, monochrome",
    },
  });

  const dummyList = [d3, d2, d1].sort(
    (a, b) => (b?.createdAt || 0) - (a?.createdAt || 0),
  );
  writeList(BRAND_HISTORY_KEY, dummyList);
  userSetItem(BRAND_DUMMY_SEEDED_KEY, "1");
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
