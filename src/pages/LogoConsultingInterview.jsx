// src/pages/LogoConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import ConsultingFlowPanel from "../components/ConsultingFlowPanel.jsx";
import ConsultingFlowMini from "../components/ConsultingFlowMini.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

const STORAGE_KEY = "logoConsultingInterviewDraft_v1";
const RESULT_KEY = "logoConsultingInterviewResult_v1";
const LEGACY_KEY = "brandInterview_logo_v1";

const DIAG_KEYS = ["diagnosisInterviewDraft_v1", "diagnosisInterviewDraft"];

function safeText(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function pickKeywords(text, max = 10) {
  const raw = String(text || "")
    .split(/[,\n\t]/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const uniq = Array.from(new Set(raw));
  return uniq.slice(0, max);
}

function stageLabel(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return "-";
  if (s === "idea") return "아이디어";
  if (s === "mvp") return "MVP";
  if (s === "pmf") return "PMF";
  if (s === "revenue" || s === "early_revenue") return "매출";
  if (s === "invest") return "투자";
  if (s === "scaleup" || s === "scaling") return "스케일업";
  if (s === "rebrand") return "리브랜딩";
  return String(v);
}

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readDiagnosisForm() {
  for (const k of DIAG_KEYS) {
    const parsed = safeParse(localStorage.getItem(k));
    if (!parsed) continue;
    const form = parsed?.form && typeof parsed.form === "object" ? parsed.form : parsed;
    if (form && typeof form === "object") return form;
  }
  return null;
}

function generateLogoCandidates(form, seed = 0) {
  const companyName = safeText(form?.companyName, "브랜드");
  const industry = safeText(form?.industry, "분야");
  const stage = stageLabel(form?.stage);
  const target = safeText(form?.targetCustomer, "고객");
  const oneLine = safeText(form?.oneLine, "");
  const personality = safeText(form?.brandPersonality, "신뢰/미니멀");
  const keywords = pickKeywords(form?.keywords, 10);
  const goal = safeText(form?.goal, "브랜드 인상을 강화");

  const pick = (arr, idx) => arr[(idx + seed) % arr.length];

  const palettes = [
    ["네이비", "화이트", "실버"],
    ["블랙", "오프화이트", "라임 포인트"],
    ["블루", "화이트", "그레이"],
    ["버건디", "오프화이트", "골드 포인트"],
    ["그린", "오프화이트", "차콜"],
  ];
  const shapes = [
    ["심볼: 정사각/원형 그리드", "형태: 단단한 기하학", "여백: 넉넉하게"],
    ["심볼: 모노그램(이니셜)", "형태: 스트로크 기반", "확장: 앱 아이콘 최적"],
    ["심볼: 방향/화살표/로드맵", "형태: 라인 + 포인트", "의미: 진행/성장"],
    ["심볼: 배지/엠블럼", "형태: 라운드 배지", "느낌: 프리미엄"],
    ["심볼: 캐릭터/아이콘화", "형태: 라운드", "느낌: 친근"],
  ];
  const typefaces = [
    "산세리프(굵기 600~800) · 가독 우선",
    "산세리프(세미라운드) · 친근/현대",
    "세리프(조심스럽게) · 프리미엄/정제",
    "모노스페이스 · 테크/정확",
  ];

  const mk = (id, title, mood, shapeIdx, paletteIdx, typeIdx) => ({
    id,
    name: title,
    summary: `${industry}(${stage})에서 ${target}에게 '${personality}' 무드를 전달하는 ${mood} 로고 방향`,
    mood,
    palette: pick(palettes, paletteIdx),
    symbol: pick(shapes, shapeIdx),
    typography: pick(typefaces, typeIdx),
    keywords: Array.from(new Set([personality, "신뢰", "가독", ...keywords.slice(0, 6)])).slice(0, 10),
    usage: [
      "앱 아이콘/파비콘에서 식별 가능한가?",
      "작게 써도 무너지지 않는가?",
      "흑백/단색 버전에서도 유지되는가?",
    ],
    rationale: `목표(${goal})를 위해 ‘명확한 형태 + 일관된 팔레트’를 우선합니다. ${oneLine ? `원라인(“${oneLine}”)의 톤과도 결을 맞춥니다.` : ""}`,
  });

  return [
    mk("logoA", "A · 미니멀/신뢰", "미니멀", 0, 0, 0),
    mk("logoB", "B · 테크/선명", "테크", 2, 2, 3),
    mk("logoC", "C · 프리미엄/정제", "프리미엄", 3, 3, 2),
  ];
}

const INITIAL_FORM = {
  // ✅ 기업 진단에서 자동 반영(편집 X)
  companyName: "",
  industry: "",
  stage: "",
  website: "",
  oneLine: "",
  targetCustomer: "",

  // ✅ 로고 컨설팅 질문(편집 O)
  brandPersonality: "",
  keywords: "",
  logoType: "",
  avoidStyle: "",
  references: "",
  mustHave: "",
  goal: "",
  useCase: "",
  notes: "",
};

export default function LogoConsultingInterview({ onLogout }) {
  const navigate = useNavigate();

  // ✅ 약관/방침 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ 폼 상태
  const [form, setForm] = useState(INITIAL_FORM);

  // ✅ 저장 상태 UI
  const [saveMsg, setSaveMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("-");

  // ✅ 결과(후보/선택) 상태
  const [analyzing, setAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [regenSeed, setRegenSeed] = useState(0);
  const refResult = useRef(null);

  // 섹션 ref
  const refBasic = useRef(null);
  const refDirection = useRef(null);
  const refConstraints = useRef(null);
  const refGoal = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "direction", label: "로고 방향", ref: refDirection },
      { id: "constraints", label: "제약/레퍼런스", ref: refConstraints },
      { id: "goal", label: "목표/요청", ref: refGoal },
    ],
    [],
  );

  // ✅ 필수 항목(로고에서 사용자가 입력해야 하는 것만)
  const requiredKeys = useMemo(() => ["brandPersonality", "keywords", "goal"], []);
  const requiredStatus = useMemo(() => {
    const status = {};
    requiredKeys.forEach((k) => {
      status[k] = Boolean(String(form?.[k] || "").trim());
    });
    return status;
  }, [form, requiredKeys]);

  const completedRequired = useMemo(
    () => requiredKeys.filter((k) => requiredStatus[k]).length,
    [requiredKeys, requiredStatus],
  );

  const progress = useMemo(() => {
    if (requiredKeys.length === 0) return 0;
    return Math.round((completedRequired / requiredKeys.length) * 100);
  }, [completedRequired, requiredKeys.length]);

  const canAnalyze = completedRequired === requiredKeys.length;
  const hasResult = candidates.length > 0;
  const canGoNext = Boolean(hasResult && selectedId);

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToResult = () => {
    if (!refResult?.current) return;
    refResult.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ✅ draft 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.form && typeof parsed.form === "object") {
        setForm((prev) => ({ ...prev, ...parsed.form }));
      }
      if (parsed?.updatedAt) {
        const d = new Date(parsed.updatedAt);
        if (!Number.isNaN(d.getTime())) setLastSaved(d.toLocaleString());
      }
    } catch {
      // ignore
    }
  }, []);

  // ✅ 기업 진단&인터뷰 값 자동 반영(중복 질문 제거)
  useEffect(() => {
    try {
      const diag = readDiagnosisForm();
      if (!diag) return;

      const next = {
        companyName: safeText(diag.companyName || diag.brandName || diag.projectName, ""),
        industry: safeText(diag.industry || diag.category || diag.field, ""),
        stage: safeText(diag.stage, ""),
        website: safeText(diag.website || diag.homepage || diag.siteUrl, ""),
        oneLine: safeText(diag.oneLine || diag.companyIntro || diag.intro || diag.serviceIntro || diag.shortIntro, ""),
        targetCustomer: safeText(diag.targetCustomer || diag.target || diag.customerTarget || diag.primaryCustomer, ""),
      };

      setForm((prev) => ({
        ...prev,
        companyName: next.companyName || prev.companyName,
        industry: next.industry || prev.industry,
        stage: next.stage || prev.stage,
        website: next.website || prev.website,
        oneLine: next.oneLine || prev.oneLine,
        targetCustomer: next.targetCustomer || prev.targetCustomer,
      }));
    } catch {
      // ignore
    }
  }, []);

  // ✅ 결과 로드(후보/선택)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RESULT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.candidates)) setCandidates(parsed.candidates);
      if (parsed?.selectedId) setSelectedId(parsed.selectedId);
      if (typeof parsed?.regenSeed === "number") setRegenSeed(parsed.regenSeed);
    } catch {
      // ignore
    }
  }, []);

  // ✅ 자동 저장(디바운스)
  useEffect(() => {
    setSaveMsg("");
    const t = setTimeout(() => {
      try {
        const payload = { form, updatedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setLastSaved(new Date(payload.updatedAt).toLocaleString());
        setSaveMsg("자동 저장됨");
      } catch {
        // ignore
      }
    }, 600);

    return () => clearTimeout(t);
  }, [form]);

  const handleTempSave = () => {
    try {
      const payload = { form, updatedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSaved(new Date(payload.updatedAt).toLocaleString());
      setSaveMsg("임시 저장 완료");
    } catch {
      setSaveMsg("저장 실패");
    }
  };

  const persistResult = (nextCandidates, nextSelectedId, nextSeed) => {
    const updatedAt = Date.now();

    try {
      localStorage.setItem(
        RESULT_KEY,
        JSON.stringify({
          candidates: nextCandidates,
          selectedId: nextSelectedId,
          regenSeed: nextSeed,
          updatedAt,
        }),
      );
    } catch {
      // ignore
    }

    try {
      const selected = nextCandidates.find((c) => c.id === nextSelectedId) || null;
      localStorage.setItem(
        LEGACY_KEY,
        JSON.stringify({
          form,
          candidates: nextCandidates,
          selectedId: nextSelectedId,
          selected,
          regenSeed: nextSeed,
          updatedAt,
        }),
      );
    } catch {
      // ignore
    }
  };

  const handleGenerateCandidates = async (mode = "generate") => {
    // 🔌 BACKEND 연동 포인트 (로고 컨설팅 - AI 분석 요청 버튼)
    // - 백엔드 연동 시(명세서 기준):
    //   A) 인터뷰 저장(공통): POST /brands/interview
    //   B) 로고 가이드:     POST /brands/logo (또는 유사)
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 요청이 가능합니다.");
      return;
    }

    setAnalyzing(true);
    try {
      const nextSeed = mode === "regen" ? regenSeed + 1 : regenSeed;
      if (mode === "regen") setRegenSeed(nextSeed);

      await new Promise((r) => setTimeout(r, 450));
      const nextCandidates = generateLogoCandidates(form, nextSeed);

      setCandidates(nextCandidates);
      setSelectedId(null);
      persistResult(nextCandidates, null, nextSeed);
      scrollToResult();
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectCandidate = (id) => {
    setSelectedId(id);
    persistResult(candidates, id, regenSeed);
  };

  const handleFinish = () => {
    navigate("/mypage/brand-results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetAll = () => {
    const ok = window.confirm("입력/결과를 모두 초기화할까요?");
    if (!ok) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(RESULT_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // ignore
    }

    const diag = (() => {
      try {
        return readDiagnosisForm();
      } catch {
        return null;
      }
    })();

    const base = { ...INITIAL_FORM };
    if (diag) {
      base.companyName = safeText(diag.companyName || diag.brandName || diag.projectName, "");
      base.industry = safeText(diag.industry || diag.category || diag.field, "");
      base.stage = safeText(diag.stage, "");
      base.website = safeText(diag.website || diag.homepage || diag.siteUrl, "");
      base.oneLine = safeText(diag.oneLine || diag.companyIntro || diag.intro || diag.serviceIntro || diag.shortIntro, "");
      base.targetCustomer = safeText(diag.targetCustomer || diag.target || diag.customerTarget || diag.primaryCustomer, "");
    }

    setForm(base);
    setCandidates([]);
    setSelectedId(null);
    setRegenSeed(0);
    setSaveMsg("");
    setLastSaved("-");
  };

  const handleNextSection = () => {
    if (!String(form.brandPersonality || "").trim() || !String(form.keywords || "").trim()) {
      scrollToSection(refDirection);
      return;
    }
    if (!String(form.goal || "").trim()) {
      scrollToSection(refGoal);
      return;
    }
    scrollToResult();
  };

  return (
    <div className="diagInterview consultingInterview">
      <PolicyModal open={openType === "privacy"} title="개인정보 처리방침" onClose={closeModal}>
        <PrivacyContent />
      </PolicyModal>

      <PolicyModal open={openType === "terms"} title="이용약관" onClose={closeModal}>
        <TermsContent />
      </PolicyModal>

      <SiteHeader onLogout={onLogout} />

      <main className="diagInterview__main">
        <div className="diagInterview__container">
          <div className="diagInterview__titleRow">
            <div>
              <h1 className="diagInterview__title">로고 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                기업 진단에서 입력한 기본 정보는 자동 반영되며, 여기서는 로고 방향(성격·키워드·목표)만 입력합니다.
              </p>
            </div>

            <div className="diagInterview__topActions">
              <button type="button" className="btn ghost" onClick={() => navigate("/brandconsulting")}>
                브랜드 컨설팅으로
              </button>
            </div>
          </div>

          <ConsultingFlowPanel activeKey="logo" />

          <div className="diagInterview__grid">
            <section className="diagInterview__left">
              {/* 1) BASIC (자동 반영) */}
              <div className="card" ref={refBasic}>
                <div className="card__head">
                  <h2>1. 기본 정보 (자동 반영)</h2>
                  <p>기업 진단&인터뷰에서 입력한 정보를 자동으로 불러옵니다. (이 페이지에서 수정하지 않아요)</p>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>회사/프로젝트명</label>
                    <input value={form.companyName} disabled placeholder="기업 진단에서 자동 반영" />
                  </div>

                  <div className="field">
                    <label>산업/분야</label>
                    <input value={form.industry} disabled placeholder="기업 진단에서 자동 반영" />
                  </div>

                  <div className="field">
                    <label>성장 단계</label>
                    <input value={stageLabel(form.stage)} disabled placeholder="기업 진단에서 자동 반영" />
                  </div>

                  <div className="field">
                    <label>웹사이트/소개 링크</label>
                    <input value={form.website} disabled placeholder="기업 진단에서 자동 반영" />
                  </div>
                </div>

                {String(form.targetCustomer || "").trim() ? (
                  <div className="field">
                    <label>타깃(진단 기준)</label>
                    <input value={form.targetCustomer} disabled />
                  </div>
                ) : null}

                <div className="field">
                  <label>회사/서비스 소개</label>
                  <textarea value={form.oneLine} disabled placeholder="기업 진단에서 자동 반영" rows={3} />
                </div>
              </div>

              {/* 2) DIRECTION */}
              <div className="card" ref={refDirection}>
                <div className="card__head">
                  <h2>2. 로고 방향</h2>
                  <p>브랜드가 어떤 성격으로 보이길 원하는지 적어주세요.</p>
                </div>

                <div className="field">
                  <label>
                    브랜드 성격/무드 <span className="req">*</span>
                  </label>
                  <input
                    value={form.brandPersonality}
                    onChange={(e) => setValue("brandPersonality", e.target.value)}
                    placeholder="예) 미니멀, 신뢰, 테크, 따뜻, 프리미엄"
                  />
                </div>

                <div className="field">
                  <label>
                    핵심 키워드(3~10개) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.keywords}
                    onChange={(e) => setValue("keywords", e.target.value)}
                    placeholder="예) 실행, 구조, 성장, 정확, 신뢰, 속도"
                    rows={4}
                  />
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>원하는 로고 타입 (선택)</label>
                    <select value={form.logoType} onChange={(e) => setValue("logoType", e.target.value)}>
                      <option value="">선택 안 함</option>
                      <option value="symbol">심볼형</option>
                      <option value="wordmark">워드마크형</option>
                      <option value="combo">콤비네이션(심볼+워드)</option>
                      <option value="monogram">모노그램(이니셜)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>피하고 싶은 스타일 (선택)</label>
                    <input
                      value={form.avoidStyle}
                      onChange={(e) => setValue("avoidStyle", e.target.value)}
                      placeholder="예) 유치함, 너무 복잡, 과장"
                    />
                  </div>
                </div>
              </div>

              {/* 3) CONSTRAINTS */}
              <div className="card" ref={refConstraints}>
                <div className="card__head">
                  <h2>3. 제약/레퍼런스 (선택)</h2>
                  <p>참고할 레퍼런스가 있다면 링크나 설명을 적어주세요.</p>
                </div>

                <div className="field">
                  <label>레퍼런스(브랜드/링크) (선택)</label>
                  <textarea
                    value={form.references}
                    onChange={(e) => setValue("references", e.target.value)}
                    placeholder="예) 애플처럼 미니멀 / 노션처럼 단정한 느낌 / 링크"
                    rows={3}
                  />
                </div>

                <div className="field">
                  <label>반드시 들어가야 하는 요소 (선택)</label>
                  <input
                    value={form.mustHave}
                    onChange={(e) => setValue("mustHave", e.target.value)}
                    placeholder="예) 이니셜 포함, 원형 아이콘, 특정 색상"
                  />
                </div>
              </div>

              {/* 4) GOAL */}
              <div className="card" ref={refGoal}>
                <div className="card__head">
                  <h2>4. 목표/추가 요청</h2>
                  <p>어떤 상황에서 로고를 쓰는지 적어주세요.</p>
                </div>

                <div className="field">
                  <label>
                    로고 목표 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.goal}
                    onChange={(e) => setValue("goal", e.target.value)}
                    placeholder="예) 투자자/고객에게 신뢰감 전달, 앱 아이콘에서도 잘 보이게"
                    rows={3}
                  />
                </div>

                <div className="field">
                  <label>사용처 (선택)</label>
                  <input value={form.useCase} onChange={(e) => setValue("useCase", e.target.value)} placeholder="예) 앱 아이콘, 웹 헤더, IR 자료" />
                </div>

                <div className="field">
                  <label>추가 메모 (선택)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 단색 버전도 필요하고, 가로/세로 버전이 모두 있으면 좋아요."
                    rows={4}
                  />
                </div>
              </div>

              {/* 결과 영역 */}
              <div ref={refResult} />

              {analyzing ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>로고 방향 후보 생성 중</h2>
                    <p>입력 내용을 바탕으로 후보 3안을 만들고 있어요.</p>
                  </div>
                  <div className="hint">잠시만 기다려주세요…</div>
                </div>
              ) : hasResult ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>로고 방향 후보 3안</h2>
                    <p>후보 1개를 선택하면 결과 히스토리로 이동할 수 있어요. (현재는 더미 생성)</p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {candidates.map((c) => {
                      const isSelected = selectedId === c.id;
                      return (
                        <div
                          key={c.id}
                          style={{
                            borderRadius: 16,
                            padding: 14,
                            border: isSelected ? "1px solid rgba(99,102,241,0.45)" : "1px solid rgba(0,0,0,0.08)",
                            boxShadow: isSelected ? "0 12px 30px rgba(99,102,241,0.10)" : "none",
                            background: "rgba(255,255,255,0.6)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div>
                              <div style={{ fontWeight: 900, fontSize: 15 }}>{c.name}</div>
                              <div style={{ marginTop: 6, opacity: 0.9 }}>{c.summary}</div>
                            </div>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: isSelected ? "rgba(99,102,241,0.12)" : "rgba(0,0,0,0.04)",
                                border: isSelected ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(0,0,0,0.06)",
                                color: "rgba(0,0,0,0.75)",
                                height: "fit-content",
                              }}
                            >
                              {isSelected ? "선택됨" : "후보"}
                            </span>
                          </div>

                          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.92, lineHeight: 1.55 }}>
                            <div>
                              <b>무드</b> · {c.mood}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>팔레트</b> · {c.palette.join(" / ")}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>심볼</b>
                              <ul style={{ margin: "6px 0 0 18px" }}>
                                {c.symbol.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>타이포</b> · {c.typography}
                            </div>

                            <div style={{ marginTop: 10 }}>
                              <b>키워드</b>
                              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {c.keywords.map((kw) => (
                                  <span
                                    key={kw}
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 800,
                                      padding: "4px 10px",
                                      borderRadius: 999,
                                      background: "rgba(0,0,0,0.04)",
                                      border: "1px solid rgba(0,0,0,0.06)",
                                      color: "rgba(0,0,0,0.75)",
                                    }}
                                  >
                                    #{kw}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div style={{ marginTop: 10, opacity: 0.9 }}>
                              <b>사용성 체크</b> · {c.usage.join(" · ")}
                            </div>

                            <div style={{ marginTop: 10, opacity: 0.9 }}>
                              <b>근거</b> · {c.rationale}
                            </div>
                          </div>

                          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className={`btn primary ${isSelected ? "disabled" : ""}`}
                              disabled={isSelected}
                              onClick={() => handleSelectCandidate(c.id)}
                            >
                              {isSelected ? "선택 완료" : "이 방향 선택"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {canGoNext ? (
                    <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" className="btn primary" onClick={handleFinish}>
                        완료(히스토리로)
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
                      * 후보 1개를 선택하면 완료 버튼이 활성화됩니다.
                    </div>
                  )}
                </div>
              ) : null}

              <div className="bottomBar">
                <button type="button" className="btn ghost" onClick={handleTempSave}>
                  임시 저장
                </button>
                <button type="button" className="btn ghost" onClick={handleNextSection}>
                  다음 섹션
                </button>
              </div>
            </section>

            {/* ✅ 오른쪽: 진행률 */}
            <aside className="diagInterview__right">
              <div className="sideCard">
                <ConsultingFlowMini activeKey="logo" />

                <div className="sideCard__titleRow">
                  <h3>진행 상태</h3>
                  <span className="badge">{progress}%</span>
                </div>

                <div className="progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                  <div className="progressBar__fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="sideMeta">
                  <div className="sideMeta__row">
                    <span className="k">필수 완료</span>
                    <span className="v">
                      {completedRequired}/{requiredKeys.length}
                    </span>
                  </div>
                  <div className="sideMeta__row">
                    <span className="k">마지막 저장</span>
                    <span className="v">{lastSaved}</span>
                  </div>
                  <div className="sideMeta__row">
                    <span className="k">단계</span>
                    <span className="v">{stageLabel(form.stage)}</span>
                  </div>
                </div>

                {saveMsg ? <p className="saveMsg">{saveMsg}</p> : null}

                <div className="divider" />

                <h4 className="sideSubTitle">빠른 작업</h4>

                <button
                  type="button"
                  className={`btn primary ${canAnalyze && !analyzing ? "" : "disabled"}`}
                  onClick={() => handleGenerateCandidates(hasResult ? "regen" : "generate")}
                  disabled={!canAnalyze || analyzing}
                  style={{ width: "100%", marginBottom: 8 }}
                >
                  {analyzing ? "생성 중..." : hasResult ? "AI 분석 재요청" : "AI 분석 요청"}
                </button>

                <button type="button" className="btn ghost" onClick={handleResetAll} style={{ width: "100%" }}>
                  전체 초기화
                </button>

                {!canAnalyze ? (
                  <p className="hint" style={{ marginTop: 10 }}>
                    * 필수 항목을 채우면 분석 버튼이 활성화됩니다.
                  </p>
                ) : null}

                <div className="divider" />

                <h4 className="sideSubTitle">섹션 바로가기</h4>
                <div className="jumpGrid">
                  {sections.map((s) => (
                    <button key={s.id} type="button" className="jumpBtn" onClick={() => scrollToSection(s.ref)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
