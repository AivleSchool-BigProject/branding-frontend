// // src/pages/BrandConsulting.jsx
// import React, { useState } from "react";
// import { useLocation } from "react-router-dom";

// import bannerImage from "../Image/banner_image/Banner.png";
// import Logocon from "../Image/brandcon_image/logocon.png";
// import namecon from "../Image/brandcon_image/namecon.png";
// import pagecon from "../Image/brandcon_image/pagecon.png";

// import PolicyModal from "../components/PolicyModal.jsx";
// import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

// import SiteFooter from "../components/SiteFooter.jsx";
// import SiteHeader from "../components/SiteHeader.jsx";

// export default function BrandConsulting({ onLogout }) {
//   const location = useLocation();

//   // ✅ 개인정보/이용약관 모달
//   const [openType, setOpenType] = useState(null);
//   const closeModal = () => setOpenType(null);

//   // ✅ MainPage에서 state로 section 받을 수 있음 (선택 기능 유지)
//   const pickedSection = location.state?.section || null;

//   const onBrandPick = (action) => {
//     // BrandConsulting 페이지에서 드롭다운 선택할 때 추가로 하고 싶은 행동
//     // 기존 코드에서는 alert를 띄웠었으니 유지
//     const map = {
//       concept: "컨셉 컨설팅",
//       naming: "네이밍 컨설팅",
//       logo: "로고 컨설팅",
//       homepage: "홈페이지 컨설팅",
//     };
//     alert(`${map[action]} 이동(테스트)`);
//   };

//   return (
//     <div className="brand-page">
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

//       {/* ✅ 공통 헤더 사용 */}
//       <SiteHeader onLogout={onLogout} onBrandPick={onBrandPick} />

//       <section className="brand-hero">
//         <div className="brand-hero-inner">
//           <div className="hero-banner" aria-label="브랜딩 컨설팅 소개">
//             <img
//               src={bannerImage}
//               alt="브랜딩 컨설팅 배너"
//               className="hero-banner-image"
//             />
//             <div className="hero-banner-text">
//               <div className="hero-carousel">
//                 <div className="hero-slide">
//                   <strong>브랜드 컨설팅</strong>
//                   <span>여러분의 이미지를 표현하세요.</span>
//                 </div>
//                 <div className="hero-slide">
//                   <strong>로고 컨설팅</strong>
//                   <span>여러분의 개성을 담아보세요.</span>
//                 </div>
//                 <div className="hero-slide">
//                   <strong>네이밍 컨설팅</strong>
//                   <span>여러분의 첫인상을 그려보세요.</span>
//                 </div>
//                 <div className="hero-slide">
//                   <strong>홈페이지 컨설팅</strong>
//                   <span>여러분의 얼굴을 만들어보세요.</span>
//                 </div>
//               </div>

//               {pickedSection ? (
//                 <div style={{ marginTop: 14, fontSize: 14, opacity: 0.9 }}>
//                   선택된 메뉴: <b>{pickedSection}</b>
//                 </div>
//               ) : null}
//             </div>
//           </div>
//         </div>
//       </section>

//       <main className="brand-content">
//         <h2 className="section-title">컨설팅 시작하기</h2>

//         <div className="service-grid">
//           <article className="service-card">
//             <div className="service-image">
//               <img src={Logocon} alt="로고 컨설팅" />
//             </div>
//             <p className="service-tag">Logo Consulting</p>
//             <h3>로고 컨설팅</h3>
//             <div className="service-meta">
//               <span>스타트업의 로고를 만들어 드립니다.</span>
//               <span>↗</span>
//             </div>
//           </article>

//           <article className="service-card">
//             <div className="service-image">
//               <img src={namecon} alt="네이밍 컨설팅" />
//             </div>
//             <p className="service-tag">Naming Consulting</p>
//             <h3>네이밍 컨설팅</h3>
//             <div className="service-meta">
//               <span>경쟁력있는 이름을 만들어 드립니다.</span>
//               <span>↗</span>
//             </div>
//           </article>

//           <article className="service-card">
//             <div className="service-image">
//               <img src={pagecon} alt="홈페이지 컨설팅" />
//             </div>
//             <p className="service-tag">Webpage Consulting</p>
//             <h3>홈페이지 컨설팅</h3>
//             <div className="service-meta">
//               <span>사용자 최적의 웹페이지 제안 해드립니다.</span>
//               <span>↗</span>
//             </div>
//           </article>
//         </div>
//       </main>

//       <SiteFooter onOpenPolicy={setOpenType} />
//     </div>
//   );
// }

// src/pages/BrandConsulting.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import bannerImage from "../Image/banner_image/Banner.png";
import Logocon from "../Image/brandcon_image/logocon.png";
import namecon from "../Image/brandcon_image/namecon.png";
import pagecon from "../Image/brandcon_image/pagecon.png";

import PolicyModal from "../components/PolicyModal.jsx";
import { PrivacyContent, TermsContent } from "../components/PolicyContents.jsx";

import SiteFooter from "../components/SiteFooter.jsx";
import SiteHeader from "../components/SiteHeader.jsx";

export default function BrandConsulting({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ 개인정보/이용약관 모달
  const [openType, setOpenType] = useState(null);
  const closeModal = () => setOpenType(null);

  // ✅ MainPage에서 state.section 받을 수 있음 (logo / naming / homepage)
  const pickedSection = location.state?.section || null;

  const labelMap = {
    logo: "로고 컨설팅",
    naming: "네이밍 컨설팅",
    homepage: "홈페이지 컨설팅",
  };

  // ✅ 카드 클릭 시 인터뷰 페이지로 이동
  const goInterview = (service) => {
    const routeMap = {
      logo: "/brand/logo/interview",
      naming: "/brand/naming/interview",
      homepage: "/brand/homepage/interview",
    };
    const to = routeMap[service];
    if (!to) return;
    navigate(to, { state: { service } });
  };

  return (
    <div className="brand-page">
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

      {/* ✅ 공통 헤더 사용 */}
      <SiteHeader onLogout={onLogout} />

      <section className="brand-hero">
        <div className="brand-hero-inner">
          <div className="hero-banner" aria-label="브랜딩 컨설팅 소개">
            <img
              src={bannerImage}
              alt="브랜딩 컨설팅 배너"
              className="hero-banner-image"
            />
            <div className="hero-banner-text">
              <div className="hero-carousel">
                <div className="hero-slide">
                  <strong>브랜드 컨설팅</strong>
                  <span>여러분의 이미지를 표현하세요.</span>
                </div>
                <div className="hero-slide">
                  <strong>로고 컨설팅</strong>
                  <span>여러분의 개성을 담아보세요.</span>
                </div>
                <div className="hero-slide">
                  <strong>네이밍 컨설팅</strong>
                  <span>여러분의 첫인상을 그려보세요.</span>
                </div>
                <div className="hero-slide">
                  <strong>홈페이지 컨설팅</strong>
                  <span>여러분의 얼굴을 만들어보세요.</span>
                </div>
              </div>

              {pickedSection ? (
                <div style={{ marginTop: 14, fontSize: 14, opacity: 0.9 }}>
                  선택된 메뉴: <b>{labelMap[pickedSection] ?? pickedSection}</b>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <main className="brand-content">
        <h2 className="section-title">컨설팅 시작하기</h2>

        <div className="service-grid">
          <article
            className="service-card"
            role="button"
            tabIndex={0}
            onClick={() => goInterview("logo")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") goInterview("logo");
            }}
          >
            <div className="service-image">
              <img src={Logocon} alt="로고 컨설팅" />
            </div>
            <p className="service-tag">Logo Consulting</p>
            <h3>로고 컨설팅</h3>
            <div className="service-meta">
              <span>스타트업의 로고를 만들어 드립니다.</span>
              <span>↗</span>
            </div>
          </article>

          <article
            className="service-card"
            role="button"
            tabIndex={0}
            onClick={() => goInterview("naming")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") goInterview("naming");
            }}
          >
            <div className="service-image">
              <img src={namecon} alt="네이밍 컨설팅" />
            </div>
            <p className="service-tag">Naming Consulting</p>
            <h3>네이밍 컨설팅</h3>
            <div className="service-meta">
              <span>경쟁력있는 이름을 만들어 드립니다.</span>
              <span>↗</span>
            </div>
          </article>

          <article
            className="service-card"
            role="button"
            tabIndex={0}
            onClick={() => goInterview("homepage")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") goInterview("homepage");
            }}
          >
            <div className="service-image">
              <img src={pagecon} alt="홈페이지 컨설팅" />
            </div>
            <p className="service-tag">Webpage Consulting</p>
            <h3>홈페이지 컨설팅</h3>
            <div className="service-meta">
              <span>사용자 최적의 웹페이지 제안 해드립니다.</span>
              <span>↗</span>
            </div>
          </article>
        </div>
      </main>

      <SiteFooter onOpenPolicy={setOpenType} />
    </div>
  );
}
