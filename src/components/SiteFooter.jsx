// // src/components/SiteFooter.jsx
// import { useState } from "react";
// import "../styles/SiteFooter.css";

// import PolicyModal from "./PolicyModal.jsx";
// import { PrivacyContent, TermsContent } from "./PolicyContents.jsx";

// export default function SiteFooter() {
//   const [openType, setOpenType] = useState(null); // "privacy" | "terms" | null
//   const closeModal = () => setOpenType(null);

//   return (
//     <>
//       {/* ✅ 공통 모달 */}
//       <PolicyModal
//         open={openType === "privacy"}
//         title="개인정보 처리방침"
//         onClose={closeModal}
//       >
//         <PrivacyContent />
//       </PolicyModal>

//       <PolicyModal
//         open={openType === "terms"}
//         title="이용약관"
//         onClose={closeModal}
//       >
//         <TermsContent />
//       </PolicyModal>

//       <footer className="siteFooter">
//         <div className="siteFooter__inner">
//           <div className="siteFooter__links">
//             <button
//               type="button"
//               className="siteFooter__link"
//               onClick={() => setOpenType("privacy")}
//             >
//               개인정보 처리방침
//             </button>
//             <span className="siteFooter__sep">|</span>
//             <button
//               type="button"
//               className="siteFooter__link"
//               onClick={() => setOpenType("terms")}
//             >
//               이용약관
//             </button>
//           </div>

//           <div className="siteFooter__text">
//             BRANDPILOT | 대전광역시 서구 문정로48번길 30 (탄방동, KT타워)
//           </div>
//           <div className="siteFooter__text">KT AIVLE 7반 15조</div>
//           <div className="siteFooter__copy">
//             © 2026 Team15 Corp. All rights reserved.
//           </div>
//         </div>
//       </footer>
//     </>
//   );
// }

import React from "react";

/**
 * 공통 푸터
 * - 약관/개인정보 처리방침 버튼 클릭 시, 상위 페이지에서 모달 열도록 onOpenPolicy 사용
 *   onOpenPolicy("privacy") / onOpenPolicy("terms")
 */
export default function SiteFooter({ onOpenPolicy }) {
  const openPrivacy = () => {
    if (typeof onOpenPolicy === "function") onOpenPolicy("privacy");
    else alert("개인정보 처리방침 (모달 연결 필요)");
  };

  const openTerms = () => {
    if (typeof onOpenPolicy === "function") onOpenPolicy("terms");
    else alert("이용약관 (모달 연결 필요)");
  };

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__links">
          <button
            type="button"
            className="site-footer__link"
            onClick={openPrivacy}
          >
            개인정보 처리방침
          </button>
          <span className="site-footer__sep">|</span>
          <button
            type="button"
            className="site-footer__link"
            onClick={openTerms}
          >
            이용약관
          </button>
        </div>

        <div className="site-footer__brand">
          <strong>BRANDPILOT</strong>
        </div>
        <div className="site-footer__text">
          BRANDPILOT | 대전광역시 서구 문정로48번길 30 (탄방동, KT타워)
        </div>
        <div className="site-footer__text">KT AIVLE 7반 15조</div>
        <div className="site-footer__copy">
          © 2026 Team15 Corp. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
