// src/api/auth.js
import axios from "axios";

const API_LOGIN = "http://localhost:8000/api/login/";
const API_REFRESH = "http://localhost:8000/api/refresh/";


export const login = async (username, password) => {
  try {
    const response = await axios.post(API_LOGIN, {
      username,
      password,
    });

    // save tokens to localStorage
    localStorage.setItem("access", response.data.access);
    localStorage.setItem("refresh", response.data.refresh);

    return { success: true };
  } catch (err) {
    return { success: false, message: err.response?.data?.detail || "Login failed" };
  }
};


// ✅ logout function
export const logout = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  window.location.href = "/";
};