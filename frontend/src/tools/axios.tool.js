import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export async function service(requestPromise) {
  try {
    const response = await requestPromise;
    console.log(response);
    return response.data;
  } catch (error) {
    // console.log(error);
    return error.response?.data;
  }
}

export default axiosInstance;
