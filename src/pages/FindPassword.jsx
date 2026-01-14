import { useState } from "react";
import "../styles/FindPassword.css";

export default function FindPassword({ onBack }) {
  const [userId, setUserId] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const safeId = userId.trim() || "사용자";
    setResult(`${safeId} 님의 비밀번호는 0000입니다.`);
  };

  return (
    <div className="findpw-page">
      <main className="findpw-card">
        <h1 className="findpw-title">비밀번호 찾기</h1>
        <form className="findpw-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="findpw-id">아이디</label>
            <input
              id="findpw-id"
              type="text"
              placeholder="아이디 입력"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="findpw-phone">휴대폰 번호</label>
            <input
              id="findpw-phone"
              type="tel"
              placeholder="- 없이 입력해주세요"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <p className="hint">회원가입시 비밀번호를 안내드립니다.</p>
          {result ? <p className="result">{result}</p> : null}
          <button type="submit" className="primary">
            확인
          </button>
          <button type="button" className="primary" onClick={onBack}>
            로그인 페이지로 이동
          </button>
        </form>
      </main>
      <footer className="findpw-footer">
        <div className="footer-inner">
          <div className="hero-footer-text">
            <div>
              <strong>BRANDPILOT</strong>
            </div>
            <div>
              BRANDPILOT | 대전광역시 서구 문정로48번길 30 (탄방동, KT타워)
            </div>
            <div>KT AIVLE 7반 15조 </div>
            <div className="hero-footer-copy">
              © 2026 Team15 Corp. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
