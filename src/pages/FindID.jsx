import { useState } from "react";

export default function FindID({ onBack }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const safeName = name.trim() || "사용자";
    const mockId = `${safeName.replace(/\s+/g, "").toLowerCase()}@example.com`;
    setResult(`${safeName} 님의 아이디는 ${mockId} 입니다`);
  };

  return (
    <div className="findid-page">
      <main className="findid-card">
        <h1 className="findid-title">아이디 찾기</h1>
        <form className="findid-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="findid-name">이름</label>
            <input
              id="findid-name"
              type="text"
              placeholder="실명 입력"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="findid-phone">휴대폰 번호</label>
            <input
              id="findid-phone"
              type="tel"
              placeholder="- 없이 입력해주세요"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <p className="hint">
            회원가입 시 입력하신 이름, 휴대폰번호로
            <br />
            가입된 아이디가 있는지 확인합니다.
          </p>
          {result ? <p className="result">{result}</p> : null}
          <button type="submit" className="primary">
            확인
          </button>
          <button type="button" className="primary" onClick={onBack}>
            로그인 페이지로 이동
          </button>
        </form>
      </main>
      <footer className="findid-footer">
        <div className="footer-inner">
            <div className="hero-footer-text">
              <div><strong>BRANDPILOT</strong></div>
              <div>BRANDPILOT | 대전광역시 서구 문정로48번길 30 (탄방동, KT타워)</div>
              <div>KT AIVLE 7반 15조 </div>
              <div className="hero-footer-copy">© 2026 Team15 Corp. All rights reserved.</div>
            </div>
        </div>
      </footer>
    </div>
  );
}
