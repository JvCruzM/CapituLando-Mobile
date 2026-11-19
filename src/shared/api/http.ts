import axios from "axios";
import { secureStore } from "../storage/secure-store";

export const apiURL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
export const transport = axios.create({
  baseURL: apiURL,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

transport.interceptors.request.use(async (config) => {
  if (!apiURL || !/^https?:\/\//.test(apiURL))
    throw new Error(
      "Configure EXPO_PUBLIC_API_URL no arquivo .env para conectar à API.",
    );

  if (!config.headers.Authorization) {
    const token = await secureStore.getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});
