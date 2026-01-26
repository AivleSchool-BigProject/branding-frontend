// src/api/apiClient.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function getAccessToken() {
  return (
    localStorage.getItem("accessToken") || localStorage.getItem("token") || ""
  );
}

export async function apiRequest(
  path,
  { method = "GET", body, headers = {}, auth = true } = {},
) {
  const h = { "Content-Type": "application/json", ...headers };

  if (auth) {
    const token = getAccessToken();
    if (token) h.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      data?.message || data?.error || text || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
