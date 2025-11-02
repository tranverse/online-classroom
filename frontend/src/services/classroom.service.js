import { axiosInstance, service } from "@tools/axios.tool";

const ClassroomService = {
  createClassRoom(data) {
    return service(axiosInstance.post("/api/classroom", data));
  },
  async getClassrooms(params) {
    // params can include pagination, filters
    return service(axiosInstance.get("/api/classroom", { params }));
  },
  async deleteClassroom(id) {
    return service(axiosInstance.delete(`/api/classroom/${id}`));
  },
};

export default ClassroomService;
