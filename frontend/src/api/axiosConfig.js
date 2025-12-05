// src/api/axiosConfig.js
import axios from "axios";

export const API_BASE = "http://localhost:8000/api";
const API_REFRESH = `${API_BASE}/refresh/`;

const axiosInstance = axios.create({
  baseURL: API_BASE,
});

// ✅ Attach access token before request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ✅ Auto refresh access token on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh");
      if (!refreshToken) {
        window.location.href = "/";
        return;
      }

      try {
        const res = await axios.post(API_REFRESH, { refresh: refreshToken });

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);

        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
        return axiosInstance(originalRequest);
      } catch (err) {
        localStorage.clear();
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
