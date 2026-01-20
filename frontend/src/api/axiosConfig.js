// src/api/axiosConfig.js
import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE;
const API_REFRESH = `${API_BASE}/refresh/`;

let startLoading = null;
let stopLoading = null;

export const injectLoader = (start, stop) => {
  startLoading = start;
  stopLoading = stop;
};

const axiosInstance = axios.create({
  baseURL: API_BASE,
});

// ✅ Attach access token before request
axiosInstance.interceptors.request.use((config) => {
  if (!config.skipLoading) {
      startLoading && startLoading();
    }
  const token = localStorage.getItem("access");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
},
(error) => {
  stopLoading && stopLoading();
  return Promise.reject(error);
});

// ✅ Auto refresh access token on 401
axiosInstance.interceptors.response.use(
  (response) => {
    if (!response.config.skipLoading) {
      stopLoading && stopLoading();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest?.skipLoading) {
      stopLoading && stopLoading();
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh");
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = "/";
        return Promise.reject(error);
      }

      try {
        startLoading && startLoading();

        const res = await axios.post(API_REFRESH, { refresh: refreshToken });

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);

        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
        return axiosInstance(originalRequest);
      } catch (err) {
        localStorage.clear();
        window.location.href = "/";
        return Promise.reject(err);
      } finally {
        stopLoading && stopLoading();
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
