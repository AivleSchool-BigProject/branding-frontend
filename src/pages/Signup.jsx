import { useState, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"

export default function SignupApp({ onBack }) {
  const [birthDate, setBirthDate] = useState(null);
  return (
    <div className="signup-page">
      <main className="signup-card">
        <h1 className="signup-title">회원가입</h1>
        <form className="signup-form">
          <div className="field">
            <label htmlFor="signup-id">아이디</label>
            <input id="signup-id" type="email" placeholder="이메일 아이디" />
            <small className="hint">* 이메일 형식으로 입력해주세요.</small>
          </div>
          <div className="field">
            <label htmlFor="signup-password">비밀번호</label>
            <input id="signup-password" type="password" placeholder="비밀번호 입력" />
            <small className="hint">* 8자 이상, 영문, 숫자, 특수문자를 포함해주세요.</small>
          </div>
          <div className="field">
            <label htmlFor="signup-password-confirm">비밀번호 확인</label>
            <input
              id="signup-password-confirm"
              type="password"
              placeholder="비밀번호 재입력"
            />
          </div>
          <div className="field">
            <label htmlFor="signup-name">이름</label>
            <input id="signup-name" type="text" placeholder="이름 입력" />
          </div>
          <div className="field">
            <label htmlFor="signup-phone">휴대폰 번호</label>
            <input id="signup-phone" type="tel" placeholder="휴대폰 번호 입력 (-없이 숫자만)" />
          </div>
          <div className="field">
            <label>생년월일</label>
            <DatePicker
                selected={birthDate}
                onChange={(date) => setBirthDate(date)}
                dateFormat = "yyyy-MM-dd"
                placeholderText = "생년월일 선택"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                maxDate={new Date()}
                customInput={<DateInput />}
            />
          </div>
          <div className="terms">
            <label className="check">
              <input type="checkbox" />
              이용약관 동의 (필수)
            </label>
            <button type="button" className="link-button">보기</button>
          </div>
          <div className="terms">
            <label className="check">
              <input type="checkbox" />
              개인정보 처리방침 동의 (필수)
            </label>
            <button type="button" className="link-button">보기</button>
          </div>
            <div className="button-row">
                <button type="submit" className="primary">
                    회원가입 하기
                </button>
                <button type="button" className="primary" onClick={onBack}>
                    돌아가기
                </button>
            </div>
        </form>
      </main>
      <footer className="signup-footer" style={{ backgroundColor: "#001F66" }}>
        <div className="footer-inner">
            <div><strong>BRANDPILOT</strong></div>
            <div>BRANDPILOT | 대전광역시 서구 문정로48번길 30 (탄방동, KT타워)</div>    
            <div>KT AIVLE 7반 15조 </div>
            <div>© 2026 Team15 Corp. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

const DateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="date-input" onClick={onClick} ref={ref}>
    <input
      type="text"
      value={value}
      placeholder="생년월일 선택"
      readOnly
    />
    <span className="calendar-icon">📅</span>
  </div>
));
