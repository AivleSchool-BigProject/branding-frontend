// src/api/mypage.js
import { apiRequest } from "./apiClient";

/**
 * ✅ 마이페이지 - 내 브랜드 목록 조회
 * 백엔드: GET /mypage/brands (JWT 필요)
 * 응답 예시(BrandListResponseDto):
 * [
 *   { brandId, brandName, logoUrl, concept, story, currentStep, createdAt }
 * ]
 */
export function fetchMyBrands() {
  return apiRequest("/mypage/brands", { method: "GET", auth: true });
}

/**
 * ✅ (선택) 마이페이지 - 브랜드 삭제
 * - 백엔드에 DELETE API가 이미 있을 경우 사용됩니다.
 * - 현재 백엔드에 없을 수 있으니, 프론트에서는 실패해도 "목록 숨김"으로 폴백 처리합니다.
 */
export function deleteMyBrand(brandId) {
  return apiRequest(`/mypage/brands/${brandId}`, {
    method: "DELETE",
    auth: true,
  });
}

/**
 * ✅ 백 응답(dto)을 마이페이지 카드(UI)용 객체로 정규화
 */
export function mapBrandDtoToReport(dto) {
  const id = String(dto?.brandId ?? "");
  const brandName = String(dto?.brandName ?? "").trim() || "브랜드";

  const concept = typeof dto?.concept === "string" ? dto.concept : "";
  const story = typeof dto?.story === "string" ? dto.story : "";

  // ✅ 로고 URL은 백/버전별로 키가 달라질 수 있어 후보를 폭넓게 대응
  const pickFirstString = (...vals) => {
    for (const v of vals) {
      if (typeof v === "string" && v.trim().length > 0) return v.trim();
    }
    return "";
  };

  const logoUrl = pickFirstString(
    dto?.logoUrl,
    dto?.logoURL,
    dto?.logoImageUrl,
    dto?.thumbnailUrl,
    dto?.imageUrl,
    dto?.selectedLogoUrl,
    dto?.selectedByUser,
  );

  const step = String(dto?.currentStep ?? "")
    .trim()
    .toUpperCase();

  const stepToPct = (s) => {
    switch (s) {
      case "INTERVIEW":
        return 0;
      case "NAMING":
        return 25;
      case "CONCEPT":
        return 50;
      case "STORY":
        return 75;
      case "LOGO":
        return 90;
      case "FINAL":
        return 100;
      default:
        return 0;
    }
  };

  // ✅ 카드에 한줄 소개가 필요하면: concept → story 순으로 짧게 사용
  const oneLine = (concept || story || "").trim();

  return {
    id,
    kind: "brand",
    serviceLabel: "브랜드 컨설팅",
    title: brandName,
    subtitle: "",
    createdAt: dto?.createdAt || null,
    progressPercent: stepToPct(step),
    isComplete: step === "FINAL",
    backendStep: step,
    snapshot: {
      diagnosisSummary: {
        companyName: brandName,
        oneLine,
      },
      selections: {
        naming: { name: brandName },
        concept: { content: concept },
        story: { content: story },
        logo: { imageUrl: logoUrl },
      },
    },
    _raw: dto,
  };
}
