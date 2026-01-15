// import { useState } from "react";
// import "../styles/SiteFooter.css";
// import PolicyModal from "./PolicyModal.jsx";
// import { PrivacyContent, TermsContent } from "./PolicyContents.jsx";

// export default function SiteFooter() {
//   const [openType, setOpenType] = useState(null); // "privacy" | "terms" | null
//   const close = () => setOpenType(null);

//   return (
//     <>
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
//           <div className="siteFooter__text siteFooter__copy">
//             © 2026 Team15 Corp. All rights reserved.
//           </div>
//         </div>
//       </footer>

//       <PolicyModal
//         open={openType === "privacy"}
//         title="개인정보 처리방침"
//         onClose={close}
//       >
//         <PrivacyContent />
//       </PolicyModal>

//       <PolicyModal open={openType === "terms"} title="이용약관" onClose={close}>
//         <TermsContent />
//       </PolicyModal>
//     </>
//   );
// }

// src/components/SiteFooter.jsx
import { useState } from "react";
import "../styles/SiteFooter.css";

import PolicyModal from "./PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "./PolicyContents.jsx";

export default function SiteFooter() {
  const [openType, setOpenType] = useState(null); // "privacy" | "terms" | null
  const closeModal = () => setOpenType(null);

  return (
    <>
      {/* ✅ 공통 모달 */}
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

      <footer className="siteFooter">
        <div className="siteFooter__inner">
          <div className="siteFooter__links">
            <button
              type="button"
              className="siteFooter__link"
              onClick={() => setOpenType("privacy")}
            >
              개인정보 처리방침
            </button>
            <span className="siteFooter__sep">|</span>
            <button
              type="button"
              className="siteFooter__link"
              onClick={() => setOpenType("terms")}
            >
              이용약관
            </button>
          </div>

          <div className="siteFooter__text">
            BRANDPILOT | 대전광역시 서구 문정로48번길 30 (탄방동, KT타워)
          </div>
          <div className="siteFooter__text">KT AIVLE 7반 15조</div>
          <div className="siteFooter__copy">
            © 2026 Team15 Corp. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
