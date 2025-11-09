import axios from "axios";
import authMemory from "@services/authMemory";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  // Do not set a global Content-Type header here. Let axios determine the
  // proper Content-Type per request body (e.g., multipart/form-data for
  // FormData, application/json for plain objects). Setting it globally
  // prevents axios/browser from adding the multipart boundary and causes
  // servers to return 415 or multipart parsing errors.
});

axiosInstance.interceptors.request.use(
  (config) => {
    // support both storing token directly under 'token' or inside a saved 'user' object
    // Prefer in-memory token; do not persist auth in localStorage
    let token = authMemory.getToken();
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
