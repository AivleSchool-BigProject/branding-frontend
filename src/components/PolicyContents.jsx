// src/components/PolicyContents.jsx
import React from "react";

export function PrivacyContent() {
  return (
    <div className="policyDoc">
      <p className="policyDoc__lead">
        본 개인정보 처리방침은 BRANDPILOT(이하 “서비스”) 이용 과정에서 수집되는
        개인정보의 처리 목적, 보관 기간, 이용자 권리 등을 안내합니다.
      </p>

      <section className="policyDoc__section">
        <h3>1. 수집 항목</h3>
        <ul>
          <li>
            <strong>필수:</strong> 이메일(아이디), 비밀번호(암호화 저장), 이름,
            휴대폰 번호
          </li>
          <li>
            <strong>선택:</strong> 생년월일(선택 제공 시)
          </li>
          <li>
            <strong>자동수집:</strong> 접속 로그, 기기 정보, 쿠키(서비스 개선
            목적)
          </li>
        </ul>
      </section>

      <section className="policyDoc__section">
        <h3>2. 이용 목적</h3>
        <ul>
          <li>회원가입 및 본인 확인, 계정 관리</li>
          <li>서비스 제공(진단/컨설팅 결과 저장, 히스토리 제공 등)</li>
          <li>보안/부정 이용 방지 및 서비스 품질 개선</li>
        </ul>
      </section>

      <section className="policyDoc__section">
        <h3>3. 보관 및 파기</h3>
        <ul>
          <li>원칙적으로 목적 달성 시 지체 없이 파기합니다.</li>
          <li>
            단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.
          </li>
        </ul>
      </section>

      <section className="policyDoc__section">
        <h3>4. 이용자 권리</h3>
        <ul>
          <li>개인정보 열람/정정/삭제/처리정지 요구 가능</li>
          <li>동의 철회 및 회원 탈퇴 요청 가능</li>
        </ul>
      </section>

      <section className="policyDoc__section">
        <h3>5. 문의</h3>
        <p className="policyDoc__muted">
          개인정보 관련 문의: help@brandpilot.example (데모)
        </p>
      </section>

      <p className="policyDoc__footnote">
        * 본 문서는 데모/프로토타입 용 예시입니다. 실제 운영 시 법무/정책 검토가
        필요합니다.
      </p>
    </div>
  );
}

export function TermsContent() {
  return (
    <div className="policyDoc">
      <p className="policyDoc__lead">
        본 이용약관은 BRANDPILOT 서비스 이용과 관련하여 서비스와 이용자 간의
        권리, 의무 및 책임사항을 규정합니다.
      </p>

      <section className="policyDoc__section">
        <h3>1. 서비스 제공</h3>
        <ul>
          <li>기업 진단/컨설팅 관련 기능 및 결과 리포트 제공</li>
          <li>회원 계정 기반 진행 현황 저장 및 히스토리 제공</li>
        </ul>
      </section>

      <section className="policyDoc__section">
        <h3>2. 이용자의 의무</h3>
        <ul>
          <li>허위 정보 입력 금지</li>
          <li>타인의 계정 도용 및 부정 이용 금지</li>
          <li>서비스 운영을 방해하는 행위 금지</li>
        </ul>
      </section>

      <section className="policyDoc__section">
        <h3>3. 계정/보안</h3>
        <ul>
          <li>
            비밀번호는 안전하게 관리해야 하며, 유출 시 즉시 변경해야 합니다.
          </li>
          <li>
            서비스는 필요 시 보안 강화를 위해 추가 인증을 요청할 수 있습니다.
          </li>
        </ul>
      </section>

      <section className="policyDoc__section">
        <h3>4. 책임 제한</h3>
        <ul>
          <li>서비스는 제공되는 정보의 완전성/정확성을 보증하지 않습니다.</li>
          <li>이용자 귀책 사유로 발생한 손해에 대해 책임을 지지 않습니다.</li>
        </ul>
      </section>

      <section className="policyDoc__section">
        <h3>5. 약관 변경</h3>
        <p className="policyDoc__muted">
          운영/법령 변경 등 필요 시 약관이 변경될 수 있으며, 중요한 변경은 공지
          후 적용됩니다.
        </p>
      </section>

      <p className="policyDoc__footnote">
        * 본 문서는 데모/프로토타입 용 예시입니다. 실제 운영 시 법무/정책 검토가
        필요합니다.
      </p>
    </div>
  );
}
