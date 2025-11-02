import axiosInstance, { service } from "@tools/axios.tool";

const UserService = {
  getTeachers(role) {
    return service(axiosInstance.get(`/api/user/teacher/${role}`));
  },
};

export default UserService;
