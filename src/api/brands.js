// src/api/brands.js
// 이름은 브랜드라 했지만 기업진단&인터뷰 부분이며 백과 연동하기 위한 새로 만든 파일
import { apiRequest } from "./apiClient";

export function submitBrandInterview(payload) {
  // 백엔드: POST /brands/interview (JWT 필요)
  return apiRequest("/brands/interview", {
    method: "POST",
    body: payload,
    auth: true,
  });
}
