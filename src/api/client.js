// // import axios from "axios";

// // // ✅ 기본값: 로컬 백엔드(환경변수 없을 때)
// // const API_BASE_URL = (
// //   import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
// // ).replace(/\/+$/, "");

// // const TOKEN_KEY = "accessToken";

// // export const getAccessToken = () => {
// //   try {
// //     return localStorage.getItem(TOKEN_KEY);
// //   } catch {
// //     return null;
// //   }
// // };

// // export const setAccessToken = (token) => {
// //   if (!token) return;
// //   try {
// //     localStorage.setItem(TOKEN_KEY, token);
// //   } catch {
// //     return;
// //   }
// // };

// // export const clearAccessToken = () => {
// //   try {
// //     localStorage.removeItem(TOKEN_KEY);
// //   } catch {
// //     return;
// //   }
// // };

// // export const apiClient = axios.create({
// //   baseURL: API_BASE_URL || undefined,
// //   timeout: 15000,
// //   headers: {
// //     "Content-Type": "application/json",
// //   },
// // });

// // // ✅ 요청에 토큰 자동 첨부 + FormData(multipart) 헤더 자동 처리
// // // - axios에서 FormData를 보낼 때 Content-Type을 직접 multipart/form-data로 고정하면
// // //   boundary가 누락되어 서버에서 Multipart 파싱이 실패할 수 있어요.
// // apiClient.interceptors.request.use((config) => {
// //   const token = getAccessToken();

// //   // axios는 headers 타입이 다양할 수 있어 안전하게 평탄화
// //   const nextHeaders = { ...(config.headers || {}) };

// //   // ✅ FormData면 Content-Type을 제거해서 axios/브라우저가 boundary 포함해서 자동 세팅하게 함
// //   const isFormData =
// //     typeof FormData !== "undefined" && config?.data instanceof FormData;

// //   if (isFormData) {
// //     // 케이스/라이브러리 차이에 대비해 다양한 키를 제거
// //     delete nextHeaders["Content-Type"];
// //     delete nextHeaders["content-type"];

// //     // 일부 코드가 multipart/form-data를 명시해도 동일하게 제거
// //     // (axios가 boundary를 포함해 올바른 헤더를 다시 설정하도록)
// //   }

// //   // ✅ 토큰 자동 첨부(이미 붙어있으면 유지)
// //   if (token && !nextHeaders.Authorization && !nextHeaders.authorization) {
// //     nextHeaders.Authorization = `Bearer ${token}`;
// //   }

// //   config.headers = nextHeaders;
// //   return config;
// // });

// // // ✅ 응답에서 토큰 갱신 + 에러 메시지 통일
// // apiClient.interceptors.response.use(
// //   (response) => {
// //     // axios는 기본적으로 header key를 소문자로 내려줌
// //     const authHeader =
// //       response?.headers?.authorization ||
// //       response?.headers?.Authorization ||
// //       response?.headers?.["access-token"] ||
// //       response?.headers?.["x-access-token"];

// //     if (authHeader) {
// //       const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
// //       const token =
// //         typeof raw === "string" && raw.startsWith("Bearer ")
// //           ? raw.slice(7)
// //           : raw;
// //       if (token) setAccessToken(token);
// //     }

// //     return response;
// //   },
// //   (error) => {
// //     const msg =
// //       error?.response?.data?.message ||
// //       error?.response?.data?.error ||
// //       error?.message ||
// //       "요청 실패";
// //     error.userMessage = msg;
// //     return Promise.reject(error);
// //   },
// // );

// // export const apiRequest = async (path, options = {}) => {
// //   const response = await apiClient.request({
// //     url: path,
// //     ...options,
// //   });
// //   return response.data;
// // };

import axios from "axios";

// ✅ 기본값: 로컬 백엔드(환경변수 없을 때)
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/+$/, "");

const TOKEN_KEY = "accessToken";

export const getAccessToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAccessToken = (token) => {
  if (!token) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    return;
  }
};

export const clearAccessToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    return;
  }
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ 요청에 토큰 자동 첨부 + FormData(multipart) 헤더 자동 처리
// - axios에서 FormData를 보낼 때 Content-Type을 직접 multipart/form-data로 고정하면
//   boundary가 누락되어 서버에서 Multipart 파싱이 실패할 수 있어요.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  // axios는 headers 타입이 다양할 수 있어 안전하게 평탄화
  const nextHeaders = { ...(config.headers || {}) };

  // ✅ FormData면 Content-Type을 제거해서 axios/브라우저가 boundary 포함해서 자동 세팅하게 함
  const isFormData =
    typeof FormData !== "undefined" && config?.data instanceof FormData;

  if (isFormData) {
    // 케이스/라이브러리 차이에 대비해 다양한 키를 제거
    delete nextHeaders["Content-Type"];
    delete nextHeaders["content-type"];

    // 일부 코드가 multipart/form-data를 명시해도 동일하게 제거
    // (axios가 boundary를 포함해 올바른 헤더를 다시 설정하도록)
  }

  // ✅ 토큰 자동 첨부(이미 붙어있으면 유지)
  if (token && !nextHeaders.Authorization && !nextHeaders.authorization) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }

  config.headers = nextHeaders;
  return config;
});

// ✅ 응답에서 토큰 갱신 + 에러 메시지 통일
apiClient.interceptors.response.use(
  (response) => {
    // axios는 기본적으로 header key를 소문자로 내려줌
    const authHeader =
      response?.headers?.authorization ||
      response?.headers?.Authorization ||
      response?.headers?.["access-token"] ||
      response?.headers?.["x-access-token"];

    if (authHeader) {
      const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      const token =
        typeof raw === "string" && raw.startsWith("Bearer ")
          ? raw.slice(7)
          : raw;
      if (token) setAccessToken(token);
    }

    return response;
  },
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

export const apiRequest = async (path, options = {}) => {
  const response = await apiClient.request({
    url: path,
    ...options,
  });
  return response.data;
};

// ✅ AI 생성/요약 요청은 시간이 오래 걸릴 수 있어요.
// (기업진단/네이밍/컨셉/스토리/로고 등)
export const AI_TIMEOUT_MS = 180000; // 3분

export const apiRequestAI = async (path, options = {}) => {
  const timeout = options?.timeout ?? AI_TIMEOUT_MS;
  return apiRequest(path, { ...options, timeout });
};
