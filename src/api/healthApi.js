// src/api/healthApi.js
import client from "./client";

export async function health() {
  const res = await client.get("/actuator/health");
  return res.data;
}
