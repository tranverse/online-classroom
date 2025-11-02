import { axiosInstance, service } from "@tools/axios.tool";

const ClassSessionService = {
  createClassSession(data) {
    return service(axiosInstance.post("/api/class-session", data));
  },
  updateClassSession(id, data) {
    return service(axiosInstance.put(`/api/class-session/${id}`, data));
  },
  getClassSession(id) {
    return service(axiosInstance.get(`/api/class-session/${id}`));
  },
  getAll() {
    return service(axiosInstance.get("/api/class-session/get-all"));
  },
};

export default ClassSessionService;
