
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://crudify-backend-qvx1.onrender.com/api",
  timeout: 15000,
});

// Attach authentication token automatically
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("crudifyToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export { API };
export default API;
