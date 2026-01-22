// src/api/authApi.js
import client from "./client";

/**
 * ✅ 로그인
 * POST /auth/login
 * body: { loginId, password }
 */
export async function login({ loginId, password }) {
  const res = await client.post("/auth/login", { loginId, password });
  return res.data;
}

/**
 * ✅ 회원가입
 * POST /auth/register
 * body: { loginId, email, password, mobileNumber, username }
 */
export async function register({
  loginId,
  email,
  password,
  mobileNumber,
  username,
}) {
  const res = await client.post("/auth/register", {
    loginId,
    email,
    password,
    mobileNumber,
    username,
  });
  return res.data;
}

/**
 * ✅ 로그아웃 (백에 /auth/logout 있으면 사용)
 * 없으면 프론트에서 localStorage만 지워도 됨.
 */
export async function logout() {
  const res = await client.post("/auth/logout");
  return res.data;
}
