// src/pages/BrandStoryConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import ConsultingFlowPanel from "../components/ConsultingFlowPanel.jsx";
import ConsultingFlowMini from "../components/ConsultingFlowMini.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

const STORAGE_KEY = "brandStoryConsultingInterviewDraft_v1";
const RESULT_KEY = "brandStoryConsultingInterviewResult_v1";
const LEGACY_KEY = "brandInterview_story_v1";
const NEXT_PATH = "/logoconsulting";

const DIAG_KEYS = ["diagnosisInterviewDraft_v1", "diagnosisInterviewDraft"];

function safeText(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function pickKeywords(text, max = 8) {
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

function generateStoryCandidates(form, seed = 0) {
  const companyName = safeText(form?.companyName, "우리");
  const industry = safeText(form?.industry, "분야");
  const stage = stageLabel(form?.stage);
  const target = safeText(form?.targetCustomer, "고객");
  const oneLine = safeText(form?.oneLine, "");
  const core = safeText(form?.brandCore, "핵심 가치");
  const origin = safeText(form?.originStory, "");
  const problem = safeText(form?.problemStory, "문제");
  const solution = safeText(form?.solutionStory, "해결");
  const tone = safeText(form?.tone, "담백하고 신뢰감");
  const proof = safeText(form?.proof, "");
  const goal = safeText(form?.goal, "브랜드 신뢰를 높이는 스토리");

  const pick = (arr, idx) => arr[(idx + seed) % arr.length];

  const structures = [
    { label: "문제→전환→해결", order: ["problem", "turning", "solution"] },
    { label: "창업 계기 중심", order: ["origin", "problem", "solution"] },
    { label: "고객 여정 중심", order: ["problem", "customer", "solution"] },
  ];
  const hooks = [
    "왜 이렇게 복잡해야 할까요?",
    "시작은 언제나 막막합니다.",
    "좋은 결정은 좋은 정보에서 시작됩니다.",
    "계획은 많은데 실행이 어렵습니다.",
  ];
  const endings = [
    "우리는 오늘도 실행 가능한 다음 한 걸음을 설계합니다.",
    "우리는 당신의 성장을 함께 설계하는 파트너입니다.",
    "우리는 더 단순하고 더 확실한 선택을 만들겠습니다.",
  ];

  const mk = (type, title, structure) => {
    const hook = pick(hooks, type);
    const end = pick(endings, type);

    const turning = `그래서 ${companyName}는 ${industry}에서 ${target}을 위해, ‘${core}’를 기준으로 다시 설계하기로 했습니다.`;
    const customer = `고객은 ${industry}의 여정에서 ‘${problem}’ 때문에 멈추고, 우리는 그 지점을 ‘${solution}’로 연결합니다.`;

    const blocks = {
      origin: origin
        ? `시작은 아주 개인적인 불편함에서 출발했습니다. ${origin}`
        : `시작은 작은 질문에서 출발했습니다. ‘${hook}’`,
      problem: `현실에서 ${target}은(는) ${problem} 때문에 중요한 순간에 시간을 잃습니다.`,
      turning,
      customer,
      solution: `그리고 우리는 ${solution}을 통해, ${target}이(가) 더 빠르게 결정하고 더 꾸준히 실행하도록 돕습니다.`,
    };

    const body = structure.order.map((k) => blocks[k]).filter(Boolean).join("\n\n");

    return {
      id: title,
      name: title,
      oneLiner: oneLine ? `“${oneLine}”` : `“${goal}”`,
      tone: `${tone} · ${structure.label}`,
      story: body,
      proof: proof ? `근거/신뢰 요소: ${proof}` : "근거/신뢰 요소: (선택) 성과/지표/사례를 추가하면 설득력이 커집니다.",
      ending: end,
      keywords: Array.from(new Set([industry, stage, "신뢰", "실행", ...pickKeywords(form?.keywords || "", 6)])).slice(0, 10),
    };
  };

  const s = pick(structures, 0);

  return [
    mk(0, "A · 담백한 문제해결형", { ...s, order: ["problem", "turning", "solution"] }),
    mk(1, "B · 창업 계기/창업자형", { ...s, order: ["origin", "problem", "solution"] }),
    mk(2, "C · 고객 여정/감정형", { ...s, order: ["problem", "customer", "solution"] }),
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

  // ✅ 스토리 컨설팅 질문(편집 O)
  brandCore: "",
  originStory: "",
  problemStory: "",
  solutionStory: "",
  tone: "",
  proof: "",
  goal: "",
  keywords: "",
  notes: "",
};

export default function BrandStoryConsultingInterview({ onLogout }) {
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
  const refStory = useRef(null);
  const refGoal = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "core", label: "핵심/톤", ref: refCore },
      { id: "story", label: "스토리 재료", ref: refStory },
      { id: "goal", label: "목표/요청", ref: refGoal },
    ],
    [],
  );

  // ✅ 필수 항목(스토리에서 사용자가 입력해야 하는 것만)
  const requiredKeys = useMemo(() => ["brandCore", "problemStory", "solutionStory", "goal"], []);
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
    // 🔌 BACKEND 연동 포인트 (브랜드 스토리 컨설팅 - AI 분석 요청 버튼)
    // - 백엔드 연동 시(명세서 기준):
    //   A) 인터뷰 저장(공통): POST /brands/interview
    //   B) 스토리 생성:     POST /brands/story (또는 유사)
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 요청이 가능합니다.");
      return;
    }

    setAnalyzing(true);
    try {
      const nextSeed = mode === "regen" ? regenSeed + 1 : regenSeed;
      if (mode === "regen") setRegenSeed(nextSeed);

      await new Promise((r) => setTimeout(r, 450));
      const nextCandidates = generateStoryCandidates(form, nextSeed);

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
    if (!String(form.brandCore || "").trim()) {
      scrollToSection(refCore);
      return;
    }
    if (!String(form.problemStory || "").trim() || !String(form.solutionStory || "").trim()) {
      scrollToSection(refStory);
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
              <h1 className="diagInterview__title">브랜드 스토리 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                기업 진단에서 입력한 기본 정보는 자동 반영되며, 여기서는 스토리 재료(핵심·문제·해결·목표)만 입력합니다.
              </p>
            </div>

            <div className="diagInterview__topActions">
              <button type="button" className="btn ghost" onClick={() => navigate("/brandconsulting")}>
                브랜드 컨설팅으로
              </button>
            </div>
          </div>

          <ConsultingFlowPanel activeKey="story" />

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

              {/* 2) CORE */}
              <div className="card" ref={refCore}>
                <div className="card__head">
                  <h2>2. 핵심/톤</h2>
                  <p>스토리의 중심이 되는 가치와 톤을 정리합니다.</p>
                </div>

                <div className="field">
                  <label>
                    브랜드 핵심 가치(1~2문장) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.brandCore}
                    onChange={(e) => setValue("brandCore", e.target.value)}
                    placeholder="예) 우리는 창업자가 실행을 지속하도록 구조화된 계획을 제공한다."
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>스토리 톤/문체 (선택)</label>
                  <input
                    value={form.tone}
                    onChange={(e) => setValue("tone", e.target.value)}
                    placeholder="예) 담백, 따뜻, 선명, 프리미엄, 유머(과하지 않게)"
                  />
                </div>

                <div className="field">
                  <label>신뢰 근거(지표/성과/사례) (선택)</label>
                  <textarea
                    value={form.proof}
                    onChange={(e) => setValue("proof", e.target.value)}
                    placeholder="예) 2주만에 실행률 30% 증가, 베타 사용자 200명, 파트너사 3곳"
                    rows={3}
                  />
                </div>
              </div>

              {/* 3) STORY MATERIAL */}
              <div className="card" ref={refStory}>
                <div className="card__head">
                  <h2>3. 스토리 재료</h2>
                  <p>‘문제’와 ‘해결’이 명확해야 설득이 됩니다.</p>
                </div>

                <div className="field">
                  <label>시작(창업 계기/개인 경험) (선택)</label>
                  <textarea
                    value={form.originStory}
                    onChange={(e) => setValue("originStory", e.target.value)}
                    placeholder="예) 창업자가 직접 겪은 불편함/실패 경험"
                    rows={3}
                  />
                </div>

                <div className="field">
                  <label>
                    고객이 겪는 문제(현실) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.problemStory}
                    onChange={(e) => setValue("problemStory", e.target.value)}
                    placeholder="예) 정보가 흩어져 결정이 느리고, 실행이 이어지지 않는다."
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>
                    우리가 해결하는 방식(변화) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.solutionStory}
                    onChange={(e) => setValue("solutionStory", e.target.value)}
                    placeholder="예) 체크리스트/로드맵을 자동 생성해 실행의 마찰을 줄인다."
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>강조 키워드 (선택)</label>
                  <input
                    value={form.keywords}
                    onChange={(e) => setValue("keywords", e.target.value)}
                    placeholder="예) 신뢰, 실행, 구조, 성장"
                  />
                </div>
              </div>

              {/* 4) GOAL */}
              <div className="card" ref={refGoal}>
                <div className="card__head">
                  <h2>4. 목표/추가 요청</h2>
                  <p>스토리를 어디에 쓰는지 명확하면 문장 구조가 좋아져요.</p>
                </div>

                <div className="field">
                  <label>
                    스토리 목표 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.goal}
                    onChange={(e) => setValue("goal", e.target.value)}
                    placeholder="예) 투자자 설득용 / 랜딩 페이지 소개용 / 브랜드 소개서용"
                    rows={3}
                  />
                </div>

                <div className="field">
                  <label>추가 메모 (선택)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 너무 길지 않게, 4~6문장으로 요약 버전도 필요해요."
                    rows={4}
                  />
                </div>
              </div>

              {/* 결과 영역 */}
              <div ref={refResult} />

              {analyzing ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>스토리 후보 생성 중</h2>
                    <p>입력 내용을 바탕으로 후보 3안을 만들고 있어요.</p>
                  </div>
                  <div className="hint">잠시만 기다려주세요…</div>
                </div>
              ) : hasResult ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>스토리 후보 3안</h2>
                    <p>후보 1개를 선택하면 다음 단계로 진행할 수 있어요. (현재는 더미 생성)</p>
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
                              <div style={{ marginTop: 6, opacity: 0.9 }}>{c.oneLiner}</div>
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

                          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.92, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                            {c.story}

                            <div style={{ marginTop: 10, opacity: 0.9 }}>
                              <b>톤</b> · {c.tone}
                            </div>
                            <div style={{ marginTop: 6, opacity: 0.9 }}>
                              <b>근거</b> · {c.proof}
                            </div>
                            <div style={{ marginTop: 6, opacity: 0.9 }}>
                              <b>마무리</b> · {c.ending}
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
                      <button type="button" className="btn primary" onClick={handleGoNext}>
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
                <ConsultingFlowMini activeKey="story" />

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
