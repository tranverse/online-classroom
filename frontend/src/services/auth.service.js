import axiosInstance, { service } from "@tools/axios.tool";

const AuthService = {
  login(data) {
    return service(axiosInstance.post("/auth/login", data));
  },
};

export default AuthService;
