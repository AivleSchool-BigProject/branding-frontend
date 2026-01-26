// src/pages/ConceptConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import ConsultingFlowPanel from "../components/ConsultingFlowPanel.jsx";
import ConsultingFlowMini from "../components/ConsultingFlowMini.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

const STORAGE_KEY = "conceptInterviewDraft_homepage_v6";
const RESULT_KEY = "conceptInterviewResult_homepage_v6";
const LEGACY_KEY = "brandInterview_homepage_v1";
const NEXT_PATH = "/brand/story";

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
  const s = String(v || "")
    .trim()
    .toLowerCase();
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
    const form =
      parsed?.form && typeof parsed.form === "object" ? parsed.form : parsed;
    if (form && typeof form === "object") return form;
  }
  return null;
}

function generateConceptCandidates(form, seed = 0) {
  const brandName = safeText(form?.brandName, "브랜드");
  const category = safeText(form?.category, "분야");
  const stage = stageLabel(form?.stage);
  const oneLine = safeText(form?.oneLine, "");
  const target = safeText(form?.targetCustomer, "고객");
  const pains = pickKeywords(form?.painsTop3, 6);
  const desired = pickKeywords(form?.desiredKeywords, 8);
  const avoid = pickKeywords(form?.avoidKeywords, 8);
  const promise = safeText(form?.brandPromise, "핵심 약속");
  const value = safeText(form?.valueProposition, "가치 제안");

  const pick = (arr, idx) => arr[(idx + seed) % arr.length];

  const tones = ["미니멀/신뢰", "테크/선명", "따뜻/친근", "프리미엄/정제"];
  const archetypes = [
    "가이드",
    "메이커",
    "파운더",
    "파트너",
    "엔진",
    "스튜디오",
  ];
  const slogans = [
    "계획을 실행으로 바꾸다",
    "복잡함을 단순하게",
    "성장을 설계하다",
    "작은 시작을 크게",
    "신뢰로 연결하다",
  ];

  const base = (tone, arche) => ({
    id: `${tone}-${arche}`.replace(/\s+/g, "").toLowerCase(),
    title: `${brandName} · ${tone} 컨셉`,
    summary: `${category}(${stage})에서 ${target}을 위해 '${promise}'를 전달하는 ${arche}형 브랜드`,
    positioning: `우리는 ${category}에서 ${target}이 ${pains.length ? pains[0] : "문제"}를 해결하도록 돕는 ${arche}입니다.`,
    valueProposition: value,
    tone,
    keywords: Array.from(
      new Set([...desired, tone.split("/")[0], arche]),
    ).slice(0, 10),
    avoid,
    slogan: pick(slogans, 0),
    oneLine: oneLine ? `“${oneLine}”` : `“${pick(slogans, 1)}”`,
  });

  const c1 = base(pick(tones, 0), pick(archetypes, 0));
  const c2 = base(pick(tones, 1), pick(archetypes, 2));
  const c3 = base(pick(tones, 3), pick(archetypes, 4));

  // 약간 변주
  c2.slogan = pick(slogans, 2);
  c3.slogan = pick(slogans, 3);

  return [c1, c2, c3].map((c, i) => ({ ...c, id: `concept_${i + 1}` }));
}

const INITIAL_FORM = {
  // ✅ 기업 진단에서 자동 반영(편집 X)
  brandName: "",
  category: "",
  stage: "",
  oneLine: "",
  targetCustomer: "",
  referenceLink: "",

  // ✅ 컨셉 컨설팅 질문(편집 O)
  painsTop3: "",
  valueProposition: "",
  brandPromise: "",
  desiredKeywords: "",
  avoidKeywords: "",
  notes: "",
};

export default function ConceptConsultingInterview({ onLogout }) {
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
  const refCore = useRef(null);
  const refKeywords = useRef(null);
  const refNotes = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "core", label: "컨셉 핵심", ref: refCore },
      { id: "keywords", label: "키워드", ref: refKeywords },
      { id: "notes", label: "추가 요청", ref: refNotes },
    ],
    [],
  );

  // ✅ 필수 항목(컨셉에서 사용자가 입력해야 하는 것만)
  const requiredKeys = useMemo(
    () => [
      "painsTop3",
      "valueProposition",
      "brandPromise",
      "desiredKeywords",
      "avoidKeywords",
    ],
    [],
  );
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

  const setValue = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
        brandName: safeText(
          diag.companyName || diag.brandName || diag.projectName,
          "",
        ),
        category: safeText(diag.industry || diag.category || diag.field, ""),
        stage: safeText(diag.stage, ""),
        oneLine: safeText(
          diag.oneLine ||
            diag.companyIntro ||
            diag.intro ||
            diag.serviceIntro ||
            diag.shortIntro,
          "",
        ),
        targetCustomer: safeText(
          diag.targetCustomer ||
            diag.target ||
            diag.customerTarget ||
            diag.primaryCustomer,
          "",
        ),
        referenceLink: safeText(
          diag.website || diag.homepage || diag.siteUrl,
          "",
        ),
      };

      setForm((prev) => ({
        ...prev,
        brandName: next.brandName || prev.brandName,
        category: next.category || prev.category,
        stage: next.stage || prev.stage,
        oneLine: next.oneLine || prev.oneLine,
        targetCustomer: next.targetCustomer || prev.targetCustomer,
        referenceLink: next.referenceLink || prev.referenceLink,
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

    // ✅ legacy 저장(통합 결과/결과 리포트 페이지 호환)
    try {
      const selected =
        nextCandidates.find((c) => c.id === nextSelectedId) || null;
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
    // 🔌 BACKEND 연동 포인트 (컨셉 컨설팅 - AI 분석 요청 버튼)
    // - 백엔드 연동 시(명세서 기준):
    //   A) 인터뷰 저장(공통): POST /brands/interview
    //   B) 컨셉 생성:       POST /brands/concept (또는 유사)
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 요청이 가능합니다.");
      return;
    }

    setAnalyzing(true);
    try {
      const nextSeed = mode === "regen" ? regenSeed + 1 : regenSeed;
      if (mode === "regen") setRegenSeed(nextSeed);

      await new Promise((r) => setTimeout(r, 450));
      const nextCandidates = generateConceptCandidates(form, nextSeed);

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

  const handleGoNext = () => {
    navigate(NEXT_PATH);
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
      base.brandName = safeText(
        diag.companyName || diag.brandName || diag.projectName,
        "",
      );
      base.category = safeText(
        diag.industry || diag.category || diag.field,
        "",
      );
      base.stage = safeText(diag.stage, "");
      base.oneLine = safeText(
        diag.oneLine ||
          diag.companyIntro ||
          diag.intro ||
          diag.serviceIntro ||
          diag.shortIntro,
        "",
      );
      base.targetCustomer = safeText(
        diag.targetCustomer ||
          diag.target ||
          diag.customerTarget ||
          diag.primaryCustomer,
        "",
      );
      base.referenceLink = safeText(
        diag.website || diag.homepage || diag.siteUrl,
        "",
      );
    }

    setForm(base);
    setCandidates([]);
    setSelectedId(null);
    setRegenSeed(0);
    setSaveMsg("");
    setLastSaved("-");
  };
  return (
    <div className="diagInterview consultingInterview">
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

      <main className="diagInterview__main">
        <div className="diagInterview__container">
          <div className="diagInterview__titleRow">
            <div>
              <h1 className="diagInterview__title">컨셉 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                기업 진단에서 입력한 기본 정보는 자동 반영되며, 여기서는 컨셉
                방향(문제·가치·약속·키워드)만 입력합니다.
              </p>
            </div>

            <div className="diagInterview__topActions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate("/brandconsulting")}
              >
                브랜드 컨설팅으로
              </button>
            </div>
          </div>

          <ConsultingFlowPanel activeKey="concept" />

          <div className="diagInterview__grid">
            <section className="diagInterview__left">
              {/* 1) BASIC (자동 반영) */}
              <div className="card" ref={refBasic}>
                <div className="card__head">
                  <h2>1. 기본 정보 (자동 반영)</h2>
                  <p>
                    기업 진단&인터뷰에서 입력한 정보를 자동으로 불러옵니다. (이
                    페이지에서 수정하지 않아요)
                  </p>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>회사/프로젝트명</label>
                    <input
                      value={form.brandName}
                      disabled
                      placeholder="기업 진단에서 자동 반영"
                    />
                  </div>

                  <div className="field">
                    <label>산업/분야</label>
                    <input
                      value={form.category}
                      disabled
                      placeholder="기업 진단에서 자동 반영"
                    />
                  </div>

                  <div className="field">
                    <label>성장 단계</label>
                    <input
                      value={stageLabel(form.stage)}
                      disabled
                      placeholder="기업 진단에서 자동 반영"
                    />
                  </div>

                  <div className="field">
                    <label>웹사이트/소개 링크</label>
                    <input
                      value={form.referenceLink}
                      disabled
                      placeholder="기업 진단에서 자동 반영"
                    />
                  </div>
                </div>

                {String(form.targetCustomer || "").trim() ? (
                  <div className="field">
                    <label>타깃(진단 기준)</label>
                    <input value={form.targetCustomer} disabled />
                  </div>
                ) : null}

                <div className="field">
                  <label>회사/서비스 한 줄 소개</label>
                  <textarea
                    value={form.oneLine}
                    disabled
                    placeholder="기업 진단에서 자동 반영"
                    rows={3}
                  />
                </div>
              </div>

              {/* 2) CORE */}
              <div className="card" ref={refCore}>
                <div className="card__head">
                  <h2>2. 컨셉 핵심</h2>
                  <p>문제·가치·약속을 명확히 하면 컨셉이 선명해져요.</p>
                </div>

                <div className="field">
                  <label>
                    고객의 핵심 문제 TOP 3 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.painsTop3}
                    onChange={(e) => setValue("painsTop3", e.target.value)}
                    placeholder="예) 정보가 흩어져서 결정이 느림, 실행이 이어지지 않음, 신뢰할 근거가 부족함"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>
                    가치 제안(무엇이 달라지나) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.valueProposition}
                    onChange={(e) =>
                      setValue("valueProposition", e.target.value)
                    }
                    placeholder="예) 입력만 하면 실행 체크리스트/로드맵이 자동 생성되어 바로 실행 가능"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>
                    브랜드 약속(브랜드가 지키는 1문장){" "}
                    <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.brandPromise}
                    onChange={(e) => setValue("brandPromise", e.target.value)}
                    placeholder="예) 우리는 당신의 아이디어를 실행 가능한 계획으로 바꿔줍니다."
                    rows={3}
                  />
                </div>
              </div>

              {/* 3) KEYWORDS */}
              <div className="card" ref={refKeywords}>
                <div className="card__head">
                  <h2>3. 키워드</h2>
                  <p>
                    원하는 느낌/피하고 싶은 느낌을 분리하면 결과가 좋아져요.
                  </p>
                </div>

                <div className="field">
                  <label>
                    포함하고 싶은 키워드(3~10개) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.desiredKeywords}
                    onChange={(e) =>
                      setValue("desiredKeywords", e.target.value)
                    }
                    placeholder="예) 신뢰, 미니멀, 실행, 구조, 성장, 정확"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>
                    피하고 싶은 키워드(3~10개) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.avoidKeywords}
                    onChange={(e) => setValue("avoidKeywords", e.target.value)}
                    placeholder="예) 유치함, 과장, 복잡함, 딱딱함"
                    rows={4}
                  />
                </div>
              </div>

              {/* 4) NOTES */}
              <div className="card" ref={refNotes}>
                <div className="card__head">
                  <h2>4. 추가 요청 (선택)</h2>
                  <p>참고할 톤/레퍼런스가 있으면 적어주세요.</p>
                </div>

                <div className="field">
                  <label>추가 메모</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 슬로건은 한 문장으로, 톤은 차분하고 고급스럽게"
                    rows={5}
                  />
                </div>
              </div>

              {/* 결과 영역 */}
              <div ref={refResult} />

              {analyzing ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>컨셉 후보 생성 중</h2>
                    <p>입력 내용을 바탕으로 후보 3안을 만들고 있어요.</p>
                  </div>
                  <div className="hint">잠시만 기다려주세요…</div>
                </div>
              ) : hasResult ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>컨셉 후보 3안</h2>
                    <p>
                      후보 1개를 선택하면 다음 단계로 진행할 수 있어요. (현재는
                      더미 생성)
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {candidates.map((c) => {
                      const isSelected = selectedId === c.id;
                      return (
                        <div
                          key={c.id}
                          style={{
                            borderRadius: 16,
                            padding: 14,
                            border: isSelected
                              ? "1px solid rgba(99,102,241,0.45)"
                              : "1px solid rgba(0,0,0,0.08)",
                            boxShadow: isSelected
                              ? "0 12px 30px rgba(99,102,241,0.10)"
                              : "none",
                            background: "rgba(255,255,255,0.6)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 900, fontSize: 15 }}>
                                {c.title}
                              </div>
                              <div style={{ marginTop: 6, opacity: 0.9 }}>
                                {c.summary}
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: isSelected
                                  ? "rgba(99,102,241,0.12)"
                                  : "rgba(0,0,0,0.04)",
                                border: isSelected
                                  ? "1px solid rgba(99,102,241,0.25)"
                                  : "1px solid rgba(0,0,0,0.06)",
                                color: "rgba(0,0,0,0.75)",
                                height: "fit-content",
                              }}
                            >
                              {isSelected ? "선택됨" : "후보"}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 13,
                              opacity: 0.92,
                            }}
                          >
                            <div>
                              <b>포지셔닝</b> · {c.positioning}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>가치</b> · {c.valueProposition}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>톤</b> · {c.tone}
                            </div>
                            <div style={{ marginTop: 10 }}>
                              <b>키워드</b>
                              <div
                                style={{
                                  marginTop: 6,
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 6,
                                }}
                              >
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

                            {c.avoid?.length ? (
                              <div style={{ marginTop: 8, opacity: 0.85 }}>
                                <b>피해야 할 키워드</b> · {c.avoid.join(", ")}
                              </div>
                            ) : null}

                            <div style={{ marginTop: 10, opacity: 0.9 }}>
                              <b>슬로건</b> · {c.slogan}
                            </div>

                            <div style={{ marginTop: 6, opacity: 0.9 }}>
                              <b>원라인</b> · {c.oneLine}
                            </div>
                          </div>

                          <div
                            style={{ marginTop: 12, display: "flex", gap: 8 }}
                          >
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
                    <div
                      style={{
                        marginTop: 14,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        className="btn primary"
                        onClick={handleGoNext}
                      >
                        다음 단계로
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
                      * 후보 1개를 선택하면 다음 단계로 진행할 수 있어요.
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            {/* ✅ 오른쪽: 진행률 */}
            <aside className="diagInterview__right">
              <div className="sideCard">
                <ConsultingFlowMini activeKey="concept" />

                <div className="sideCard__titleRow">
                  <h3>진행 상태</h3>
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
                  onClick={() =>
                    handleGenerateCandidates(hasResult ? "regen" : "generate")
                  }
                  disabled={!canAnalyze || analyzing}
                  style={{ width: "100%", marginBottom: 8 }}
                >
                  {analyzing
                    ? "생성 중..."
                    : hasResult
                      ? "AI 분석 재요청"
                      : "AI 분석 요청"}
                </button>

                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleResetAll}
                  style={{ width: "100%" }}
                >
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
                    <button
                      key={s.id}
                      type="button"
                      className="jumpBtn"
                      onClick={() => scrollToSection(s.ref)}
                    >
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
