// src/components/ChatbotWidget.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/ChatbotWidget.css";

/**
 * 우측 하단 챗봇 위젯
 * - 플로팅 버튼 클릭 -> 패널(모달 느낌) 열림
 * - Enter: 전송 / Shift+Enter: 줄바꿈
 * - 기본은 로컬 mock 응답 (백엔드 연동은 askBot()만 바꾸면 됨)
 * - 열림/닫힘 "스르륵" 애니메이션 포함 (closing state)
 */
export default function ChatbotWidget({
  title = "AI 도우미",
  subtitle = "무엇을 도와드릴까요?",
  initialOpen = false,
}) {
  const [open, setOpen] = useState(initialOpen);
  const [closing, setClosing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const [messages, setMessages] = useState(() => [
    {
      id: cryptoId(),
      role: "assistant",
      content:
        "안녕하세요! 👋\n원하시는 기능/페이지를 말해주면 바로 안내해드릴게요.\n예: “로그인 안돼요”, “기업진단 결과 페이지 구성 추천해줘”",
      ts: Date.now(),
    },
  ]);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const closeTimerRef = useRef(null);

  const quickChips = useMemo(
    () => [
      "로그인/회원가입 문제",
      "기업진단 흐름 설명",
      "브랜드 컨설팅 결과 요약",
      "API 연동 방법",
    ],
    [],
  );

  // 열릴 때 입력창 포커스 + 스크롤 맨 아래
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 50);
    }
  }, [open, minimized]);

  // 메시지 추가될 때 스크롤 맨 아래
  useEffect(() => {
    if (open && !minimized) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, open, minimized]);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, minimized, closing]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const handleOpen = () => {
    setOpen(true);
    setClosing(false);
    setMinimized(false);
  };

  const handleClose = () => {
    if (!open || closing) return;

    setClosing(true);

    // CSS exit 애니메이션 시간과 맞추기
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setMinimized(false);
    }, 180);
  };

  const handleMinimize = () => {
    if (closing) return;
    setMinimized((v) => !v);
  };

  const handleChip = (text) => {
    if (!open) handleOpen();
    sendMessage(text);
  };

  const onSubmit = async () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput("");
    await sendMessage(text);
  };

  const sendMessage = async (text) => {
    const userMsg = {
      id: cryptoId(),
      role: "user",
      content: text,
      ts: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    try {
      const botText = await askBot(text);
      const botMsg = {
        id: cryptoId(),
        role: "assistant",
        content: botText,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      const botMsg = {
        id: cryptoId(),
        role: "assistant",
        content:
          "앗, 지금 답변 생성에 실패했어요. 😵\n잠시 후 다시 시도해 주세요!\n(백엔드 연동 전이라면 askBot()만 연결해주면 돼요)",
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setTyping(false);
    }
  };

  const onInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <>
      {/* 오버레이 (패널 열렸을 때만) */}
      {open && !minimized && (
        <div
          className={`chatbot-overlay ${closing ? "is-leaving" : ""}`}
          onClick={handleClose}
        />
      )}

      {/* 플로팅 버튼 */}
      {!open && (
        <button
          type="button"
          className="chatbot-fab"
          onClick={handleOpen}
          aria-label="챗봇 열기"
          title="챗봇 열기"
        >
          <ChatIcon />
        </button>
      )}

      {/* 패널 */}
      {open && (
        <section
          className={`chatbot-panel ${minimized ? "minimized" : ""} ${
            closing ? "is-leaving" : ""
          }`}
          role="dialog"
          aria-label="챗봇"
          aria-modal="true"
        >
          <header className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-badge">
                <SparkIcon />
              </div>
              <div className="chatbot-header-text">
                <div className="chatbot-title">{title}</div>
                <div className="chatbot-subtitle">{subtitle}</div>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-icon-btn"
                onClick={handleMinimize}
                aria-label={minimized ? "확장" : "최소화"}
                title={minimized ? "확장" : "최소화"}
              >
                {minimized ? <ExpandIcon /> : <MinimizeIcon />}
              </button>

              <button
                type="button"
                className="chatbot-icon-btn"
                onClick={handleClose}
                aria-label="닫기"
                title="닫기"
              >
                <CloseIcon />
              </button>
            </div>
          </header>

          {!minimized && (
            <>
              <div className="chatbot-body">
                <div className="chatbot-chips">
                  {quickChips.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="chatbot-chip"
                      onClick={() => handleChip(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="chatbot-messages" ref={listRef}>
                  {messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      role={m.role}
                      content={m.content}
                    />
                  ))}

                  {typing && (
                    <div className="chatbot-typing">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  )}
                </div>
              </div>

              <footer className="chatbot-footer">
                <textarea
                  ref={inputRef}
                  className="chatbot-input"
                  placeholder="메시지를 입력하세요… (Enter 전송 / Shift+Enter 줄바꿈)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  rows={2}
                />
                <button
                  type="button"
                  className="chatbot-send"
                  onClick={onSubmit}
                  disabled={!input.trim() || typing}
                >
                  보내기
                </button>
              </footer>
            </>
          )}
        </section>
      )}
    </>
  );
}

function MessageBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`chatbot-msg-row ${isUser ? "user" : "assistant"}`}>
      <div className={`chatbot-msg ${isUser ? "user" : "assistant"}`}>
        {content.split("\n").map((line, idx) => (
          <React.Fragment key={idx}>
            {line}
            <br />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * ✅ 여기를 나중에 백엔드/AI로 바꾸면 됨.
 * - 현재는 "로컬 mock 답변"을 리턴
 */
async function askBot(text) {
  // ---------------------------
  // (A) 백엔드 연동 예시 (fetch)
  // ---------------------------
  // const base = import.meta.env.VITE_API_BASE_URL; // 예: http://localhost:8080
  // const res = await fetch(`${base}/api/chat`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   credentials: "include", // 쿠키 인증 필요하면
  //   body: JSON.stringify({ message: text }),
  // });
  // if (!res.ok) throw new Error("chat api failed");
  // const data = await res.json();
  // return data?.reply ?? "응답이 비어있어요.";

  // ---------------------------
  // (B) 로컬 mock 답변
  // ---------------------------
  await sleep(450);

  const lower = text.toLowerCase();

  if (lower.includes("로그인") || lower.includes("회원가입")) {
    return (
      "로그인/회원가입 쪽이면 이런 것부터 확인해봐요:\n" +
      "1) API 서버 주소(VITE_API_BASE_URL) 맞는지\n" +
      "2) CORS/쿠키(credentials) 설정 필요한지\n" +
      "3) 토큰 저장 위치(localStorage / cookie)\n\n" +
      "원하는 방식(토큰/세션) 말해주면 그에 맞춰 코드를 더 딱 맞게 안내해줄게요."
    );
  }

  if (lower.includes("api") || lower.includes("연동")) {
    return (
      "API 연동은 보통 이렇게 나눠요:\n" +
      "✅ src/api/client.js (axios/fetch 공통)\n" +
      "✅ src/api/*Api.js (기능별 함수)\n" +
      "✅ 페이지에서 호출 + 로딩/에러 처리\n\n" +
      "지금 프로젝트 구조 기준으로는, `askBot()` 부분만 백엔드로 바꾸면 챗봇도 같은 패턴으로 연동돼요."
    );
  }

  if (lower.includes("기업진단") || lower.includes("진단")) {
    return (
      "기업진단 흐름을 한 줄로 정리하면:\n" +
      "진단 입력 → 요청 전송 → 결과 요약(상단) → 상세 리포트(하단)\n\n" +
      "원하면 결과 페이지에 ‘추천 액션(체크리스트)’ 섹션 추가하는 것도 딱 좋아요."
    );
  }

  return (
    "오케이! 👍\n" +
    "지금 말한 내용 기준으로 도와줄 수 있어요:\n" +
    "• UI/라우팅 연결\n" +
    "• 백엔드 연동(fetch/axios)\n" +
    "• 결과 페이지 구성\n\n" +
    "어떤 페이지에서 어떤 동작이 필요해요?"
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cryptoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ------------------ Icons (no dependency) ------------------ */
function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3c5.1 0 9 3.4 9 7.8 0 4.4-3.9 7.8-9 7.8-1 0-2-.1-2.9-.4L5 20l.9-3.4C4.7 15.3 3 13.2 3 10.8 3 6.4 6.9 3 12 3zm-4 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2l1.2 4.6L18 8l-4.8 1.4L12 14l-1.2-4.6L6 8l4.8-1.4L12 2zm7 9l.7 2.7L22 14l-2.3.3L19 17l-.7-2.7L16 14l2.3-.3L19 11zM5 11l.7 2.7L8 14l-2.3.3L5 17l-.7-2.7L2 14l2.3-.3L5 11z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3 1.4 1.4z"
      />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M6 15h12v2H6z" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7 10h10v2H7v-2zm0 4h10v2H7v-2z" />
    </svg>
  );
}
