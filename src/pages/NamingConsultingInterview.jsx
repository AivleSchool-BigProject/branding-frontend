// src/pages/NamingConsultingInterview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

import ConsultingFlowPanel from "../components/ConsultingFlowPanel.jsx";
import ConsultingFlowMini from "../components/ConsultingFlowMini.jsx";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

const STORAGE_KEY = "namingConsultingInterviewDraft_v1";
const RESULT_KEY = "namingConsultingInterviewResult_v1";
const LEGACY_KEY = "brandInterview_naming_v1";

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

function generateNamingCandidates(form, seed = 0) {
  const industry = safeText(form?.industry, "분야");
  const target = safeText(form?.targetCustomer, "고객");
  const tone = safeText(form?.tone, "신뢰/미니멀");
  const kws = pickKeywords(form?.keywords, 10);
  const avoid = pickKeywords(form?.avoidWords || "", 8);
  const lang = safeText(form?.language, "ko");
  const style = safeText(form?.namingStyle, "브랜드형");
  const emotion = safeText(form?.targetEmotion, "신뢰감");
  const goal = safeText(form?.goal, "기억하기 쉬운 이름");

  const pick = (arr, idx) => arr[(idx + seed) % arr.length];

  const baseRootsKo = ["브랜", "스파크", "웨이브", "그로우", "코어", "링크", "퀘스트", "플랜", "루트", "포지"];
  const baseRootsEn = ["Spark", "Wave", "Grow", "Core", "Link", "Quest", "Plan", "Bloom", "Forge", "Nova"];

  const mkKo = (prefix, root, suffix = "") => `${prefix}${root}${suffix}`.replace(/\s+/g, "");
  const mkEn = (prefix, root, suffix = "") => `${prefix}${root}${suffix}`.replace(/\s+/g, "");

  const makeSamples = (mode) => {
    const roots = mode === "en" ? baseRootsEn : baseRootsKo;
    const p1 = pick(mode === "en" ? ["", "Neo", "Pro", "Meta", "Bright"] : ["", "뉴", "프로", "메타", "브랜드"], 0);
    const s1 = pick(mode === "en" ? ["", "ly", "io", "lab", "works"] : ["", "온", "랩", "웍스", "플랜"], 1);

    const list = [];
    for (let i = 0; i < 6; i += 1) {
      const r = pick(roots, i);
      if (mode === "en") list.push(mkEn(p1, r, s1));
      else list.push(mkKo(p1, r, s1));
    }
    return Array.from(new Set(list)).slice(0, 6);
  };

  const mode = lang === "en" ? "en" : "ko";

  const candidates = [
    {
      id: "nameA",
      name: "A · 브랜드형(기억/발음 중심)",
      oneLiner: `${goal}을 우선으로, 짧고 단단한 브랜드 네임`,
      keywords: Array.from(new Set(["간결", "가독", "브랜드형", emotion, ...kws.slice(0, 4)])).slice(0, 10),
      style: `${style} · ${tone}`,
      samples: makeSamples(mode),
      rationale: `타깃(${target})이 한 번 듣고도 기억할 수 있게 짧은 길이 중심으로 제안합니다. 업종(${industry})에서도 범용 확장에 유리합니다.`,
      checks: ["발음/철자 난이도 낮음", "검색 중복 가능성 점검", "도메인/상표 사전 조사 권장"],
      avoid,
    },
    {
      id: "nameB",
      name: "B · 의미형(문제/해결 강조)",
      oneLiner: `업종(${industry})의 ‘가치/해결’을 담은 의미 중심 네이밍`,
      keywords: Array.from(new Set(["의미", "가치", "해결", emotion, ...kws.slice(0, 4)])).slice(0, 10),
      style: `${style} · 메시지형`,
      samples: makeSamples(mode).map((s) => (mode === "en" ? `${s}Solve` : `${s}솔브`)).slice(0, 6),
      rationale: `고객이 ‘무슨 서비스인지’를 빠르게 이해하도록 설계합니다. 소개 문구(원라인)와 함께 쓸 때 전환에 유리합니다.`,
      checks: ["의미 과잉/직설적 표현 주의", "경쟁사 유사 키워드 회피", "슬로건과 조합 권장"],
      avoid,
    },
    {
      id: "nameC",
      name: "C · 테크/프리미엄(느낌 중심)",
      oneLiner: `톤(${tone})을 살려 ‘프리미엄/테크’ 무드를 만드는 네이밍`,
      keywords: Array.from(new Set(["테크", "프리미엄", "세련", emotion, ...kws.slice(0, 4)])).slice(0, 10),
      style: `${style} · 프리미엄`,
      samples: makeSamples(mode).map((s) => (mode === "en" ? `Aurum${s}` : `오룸${s}`)).slice(0, 6),
      rationale: `로고/브랜드 톤과의 결을 맞춰 ‘보는 순간 느낌이 오는’ 이름을 제안합니다. 투자/제휴 문서에서도 신뢰 인상을 강화합니다.`,
      checks: ["발음이 어려워지지 않게 길이 제한", "특정 업종과 오해되지 않게 의미 보완", "영문 표기 통일"],
      avoid,
    },
  ];

  return candidates.slice(0, 3);
}

const INITIAL_FORM = {
  // ✅ 기업 진단에서 자동 반영(편집 X)
  companyName: "",
  industry: "",
  stage: "",
  website: "",
  oneLine: "",
  brandDesc: "",
  targetCustomer: "",

  // ✅ 네이밍에 필요한 질문(편집 O)
  tone: "",
  keywords: "",
  avoidWords: "",
  language: "ko",
  lengthPref: "mid",
  namingStyle: "",
  targetEmotion: "",
  mustInclude: "",
  competitorNames: "",
  domainNeed: "",
  goal: "",
  useCase: "",
  notes: "",
};

export default function NamingConsultingInterview({ onLogout }) {
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
  const refBrand = useRef(null);
  const refDirection = useRef(null);
  const refConstraints = useRef(null);
  const refGoal = useRef(null);

  const sections = useMemo(
    () => [
      { id: "basic", label: "기본 정보", ref: refBasic },
      { id: "brand", label: "브랜드 요약", ref: refBrand },
      { id: "direction", label: "네이밍 방향", ref: refDirection },
      { id: "constraints", label: "제약/리스크", ref: refConstraints },
      { id: "goal", label: "목표/요청", ref: refGoal },
    ],
    [],
  );

  // ✅ 필수 항목(네이밍에서 사용자가 입력해야 하는 것만)
  const requiredKeys = useMemo(() => ["tone", "keywords", "goal"], []);
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
        brandDesc: safeText(diag.brandDesc || diag.companyDesc || diag.detailIntro || diag.serviceDesc, ""),
        targetCustomer: safeText(diag.targetCustomer || diag.target || diag.customerTarget || diag.primaryCustomer, ""),
      };

      setForm((prev) => ({
        ...prev,
        companyName: next.companyName || prev.companyName,
        industry: next.industry || prev.industry,
        stage: next.stage || prev.stage,
        website: next.website || prev.website,
        oneLine: next.oneLine || prev.oneLine,
        brandDesc: next.brandDesc || prev.brandDesc,
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

    // 현재 단계 결과 저장
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
    // 🔌 BACKEND 연동 포인트 (네이밍 컨설팅 - AI 분석 요청 버튼)
    // - 현재 로직: 프론트에서 더미 후보(3안) 생성 → 1개 선택 → 다음 단계로 이동
    // - 백엔드 연동 시(명세서 기준):
    //   A) 인터뷰 저장(공통): POST /brands/interview
    //   B) 네이밍 생성:      POST /brands/naming
    if (!canAnalyze) {
      alert("필수 항목을 모두 입력하면 요청이 가능합니다.");
      return;
    }

    setAnalyzing(true);
    try {
      const nextSeed = mode === "regen" ? regenSeed + 1 : regenSeed;
      if (mode === "regen") setRegenSeed(nextSeed);

      await new Promise((r) => setTimeout(r, 400));
      const nextCandidates = generateNamingCandidates(form, nextSeed);

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
    navigate("/conceptconsulting");
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

    // 진단 값은 다시 자동 반영되도록(초기화 후에도 기본 정보 유지)
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
      base.brandDesc = safeText(diag.brandDesc || diag.companyDesc || diag.detailIntro || diag.serviceDesc, "");
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
    // 기본/요약은 자동 반영이므로, 실제 입력 섹션 위주로 다음 이동
    if (!String(form.tone || "").trim() || !String(form.keywords || "").trim()) {
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
              <h1 className="diagInterview__title">네이밍 컨설팅 인터뷰</h1>
              <p className="diagInterview__sub">
                기업 진단에서 입력한 기본 정보는 자동 반영되며, 여기서는 네이밍 방향만 입력합니다.
              </p>
            </div>

            <div className="diagInterview__topActions">
              <button type="button" className="btn ghost" onClick={() => navigate("/brandconsulting")}>
                브랜드 컨설팅으로
              </button>
            </div>
          </div>

          {/* ✅ 전체 4단계 진행 표시 */}
          <ConsultingFlowPanel activeKey="naming" />

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

              {/* 2) BRAND (자동 반영) */}
              <div className="card" ref={refBrand}>
                <div className="card__head">
                  <h2>2. 브랜드 요약 (자동 반영)</h2>
                  <p>상세 설명은 기업 진단&인터뷰의 입력 내용을 자동 반영합니다.</p>
                </div>

                <div className="field">
                  <label>상세 설명</label>
                  <textarea
                    value={form.brandDesc}
                    disabled
                    placeholder="(선택) 진단 인터뷰에 입력한 값이 없다면 비어 있을 수 있어요"
                    rows={5}
                  />
                </div>
              </div>

              {/* 3) DIRECTION */}
              <div className="card" ref={refDirection}>
                <div className="card__head">
                  <h2>3. 네이밍 방향</h2>
                  <p>톤/키워드/목표가 핵심이에요.</p>
                </div>

                <div className="field">
                  <label>
                    원하는 톤/성격 <span className="req">*</span>
                  </label>
                  <input
                    value={form.tone}
                    onChange={(e) => setValue("tone", e.target.value)}
                    placeholder="예) 신뢰감, 테크, 프리미엄, 미니멀, 따뜻함"
                  />
                </div>

                <div className="field">
                  <label>
                    핵심 키워드(3~10개) <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.keywords}
                    onChange={(e) => setValue("keywords", e.target.value)}
                    placeholder="예) AI, 성장, 로드맵, 실행, 신뢰, 속도"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>피하고 싶은 단어/뉘앙스 (선택)</label>
                  <input
                    value={form.avoidWords}
                    onChange={(e) => setValue("avoidWords", e.target.value)}
                    placeholder="예) 유치함, 과장됨, 너무 길어짐"
                  />
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>언어 (선택)</label>
                    <select value={form.language} onChange={(e) => setValue("language", e.target.value)}>
                      <option value="ko">한국어</option>
                      <option value="en">영어</option>
                      <option value="mix">혼합(한/영)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>길이 선호 (선택)</label>
                    <select value={form.lengthPref} onChange={(e) => setValue("lengthPref", e.target.value)}>
                      <option value="short">짧게(1~6자/짧은 단어)</option>
                      <option value="mid">중간(7~12자)</option>
                      <option value="long">길게(설명형)</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>네이밍 스타일 선호 (선택)</label>
                  <input
                    value={form.namingStyle}
                    onChange={(e) => setValue("namingStyle", e.target.value)}
                    placeholder="예) 조합형, 약자/이니셜, 은유형, 직관형"
                  />
                </div>

                <div className="field">
                  <label>타깃에게 주고 싶은 감정 (선택)</label>
                  <input
                    value={form.targetEmotion}
                    onChange={(e) => setValue("targetEmotion", e.target.value)}
                    placeholder="예) 신뢰, 기대감, 안심, 설렘"
                  />
                </div>
              </div>

              {/* 4) CONSTRAINTS */}
              <div className="card" ref={refConstraints}>
                <div className="card__head">
                  <h2>4. 제약/리스크 (선택)</h2>
                  <p>피해야 할 충돌(도메인/유사명) 등을 적어주세요.</p>
                </div>

                <div className="field">
                  <label>반드시 포함(단어/이니셜) (선택)</label>
                  <input value={form.mustInclude} onChange={(e) => setValue("mustInclude", e.target.value)} placeholder="예) BP, Pilot" />
                </div>

                <div className="field">
                  <label>경쟁사/유사 서비스 이름 (선택)</label>
                  <textarea
                    value={form.competitorNames}
                    onChange={(e) => setValue("competitorNames", e.target.value)}
                    placeholder="예) 경쟁사명/유사명(겹치지 않게 참고)"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>도메인/계정 고려사항 (선택)</label>
                  <input
                    value={form.domainNeed}
                    onChange={(e) => setValue("domainNeed", e.target.value)}
                    placeholder="예) .com 필요 / 인스타 계정 확보 중요"
                  />
                </div>
              </div>

              {/* 5) GOAL */}
              <div className="card" ref={refGoal}>
                <div className="card__head">
                  <h2>5. 목표/추가 요청</h2>
                  <p>원하는 결과/활용처를 정리하면 후보가 더 좋아져요.</p>
                </div>

                <div className="field">
                  <label>
                    네이밍 목표 <span className="req">*</span>
                  </label>
                  <textarea
                    value={form.goal}
                    onChange={(e) => setValue("goal", e.target.value)}
                    placeholder="예) 투자자/고객에게 신뢰감 전달, 기억에 남는 이름"
                    rows={4}
                  />
                </div>

                <div className="field">
                  <label>사용처 (선택)</label>
                  <input
                    value={form.useCase}
                    onChange={(e) => setValue("useCase", e.target.value)}
                    placeholder="예) 앱 이름, 서비스 이름, 캠페인/프로젝트명"
                  />
                </div>

                <div className="field">
                  <label>추가 메모 (선택)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setValue("notes", e.target.value)}
                    placeholder="예) 발음이 쉬웠으면 좋겠고, 의미가 너무 직설적이진 않았으면 해요."
                    rows={5}
                  />
                </div>
              </div>

              {/* 결과 영역 */}
              <div ref={refResult} />

              {analyzing ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>네이밍 후보 생성 중</h2>
                    <p>입력 내용을 바탕으로 후보 3안을 만들고 있어요.</p>
                  </div>
                  <div className="hint">잠시만 기다려주세요…</div>
                </div>
              ) : hasResult ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card__head">
                    <h2>네이밍 후보 3안</h2>
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

                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontWeight: 800, marginBottom: 6 }}>키워드</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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

                          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                            <div>
                              <b>스타일</b> · {c.style}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <b>샘플</b>
                              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {c.samples.map((s) => (
                                  <span
                                    key={s}
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
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div style={{ marginTop: 10, opacity: 0.85 }}>
                              <b>근거</b> · {c.rationale}
                            </div>

                            <div style={{ marginTop: 8, opacity: 0.85 }}>
                              <b>체크</b> · {c.checks.join(" · ")}
                            </div>

                            {c.avoid?.length ? (
                              <div style={{ marginTop: 8, opacity: 0.85 }}>
                                <b>피해야 할 단어</b> · {c.avoid.join(", ")}
                              </div>
                            ) : null}
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

              {/* 하단 버튼 */}
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
                <ConsultingFlowMini activeKey="naming" />

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
