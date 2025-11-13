import { axiosInstance, service } from "@tools/axios.tool";

const TeacherService = {
  getTeacherClasses() {
    return service(axiosInstance.get("/api/teacher/classes"));
  },
  getClassSessions(classId) {
    return service(
      axiosInstance.get(`/api/teacher/classes/${classId}/sessions`)
    );
  },
  getUpcomingSessions(classId) {
    return service(
      axiosInstance.get(`/api/teacher/classes/${classId}/sessions/upcoming`)
    );
  },
  getClassroomDetails(id) {
    return service(
      axiosInstance.get(`/api/teacher/classes/${id}/details`)
    );
  },
};

export default TeacherService;
