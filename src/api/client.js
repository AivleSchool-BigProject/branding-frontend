// src/api/client.js
import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  // withCredentials: true, // ✅ 백이 "쿠키 세션" 방식이면 true로(지금은 JWT 미사용이니 보통 false)
});

// (선택) 에러 메시지 통일해서 쓰고 싶으면 인터셉터로 정리 가능
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "요청 실패";
    error.userMessage = msg;
    return Promise.reject(error);
  },
);

export default client;
