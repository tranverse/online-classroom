import axios from "../tools/axios.tool";
import {
  User,
  Classroom,
  Session,
  Attendance,
  DashboardStats,
  PaginatedResponse,
} from "../types/admin";

// The backend exposes user and classroom management under /api/user and /api/classroom
const BASE_URL = "/api/admin";

// Helper URLs that point to actual backend controllers
const USER_URL = "/api/admin/users";
const CLASSROOM_URL = "/api/classroom";

export const AdminService = {
  // Dashboard (optional - route not implemented in backend yet)
  getDashboardStats: async (): Promise<DashboardStats> => {
    const resp = await axios
      .get(`${BASE_URL}/dashboard/stats`)
      .catch(() => ({ data: {} }));
    // backend returns ApiResponse wrapper { code, message, data }
    return resp.data?.data || {};
  },

  // Users
  // Users: call the user controller at /api/user
  getUsers: async (
    page = 1,
    pageSize = 10
  ): Promise<PaginatedResponse<User>> => {
    const resp = await axios.get(`${USER_URL}`, { params: { page, pageSize } });
    // ApiResponse wrapper -> resp.data.data contains { data, total, page, pageSize }
    return resp.data?.data;
  },

  createUser: async (user: Omit<User, "id" | "createdAt">): Promise<User> => {
    const resp = await axios.post(`${USER_URL}`, user);
    return resp.data?.data;
  },

  updateUser: async (id: string, user: Partial<User>): Promise<User> => {
    const resp = await axios.put(`${USER_URL}/${id}`, user);
    return resp.data?.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await axios.delete(`${USER_URL}/${id}`);
  },

  // Classrooms
  // Classrooms: use the classroom controller at /api/classroom
  getClassrooms: async (
    page = 1,
    pageSize = 10
  ): Promise<PaginatedResponse<Classroom>> => {
    const { data } = await axios.get(`${CLASSROOM_URL}/get-all`, {
      params: { page, pageSize },
    });
    return data;
  },

  createClassroom: async (
    classroom: Omit<Classroom, "id" | "createdAt" | "studentCount">
  ): Promise<Classroom> => {
    const { data } = await axios.post(`${CLASSROOM_URL}`, classroom);
    return data;
  },

  updateClassroom: async (
    id: string,
    classroom: Partial<Classroom>
  ): Promise<Classroom> => {
    if (!id) {
      throw new Error("Missing classroom id");
    }
    const { data } = await axios.put(`${CLASSROOM_URL}/${id}`, classroom);
    return data;
  },

  deleteClassroom: async (id: string): Promise<void> => {
    await axios.delete(`${CLASSROOM_URL}/${id}`);
  },

  // Add a student to a classroom (admin)
  addStudentToClassroom: async (studentClassroomRequest: any): Promise<any> => {
    const { data } = await axios.post(
      `${CLASSROOM_URL}/add-student`,
      studentClassroomRequest
    );
    return data;
  },

  getClassroomDetails: async (id: string): Promise<any> => {
    const { data } = await axios.get(`${BASE_URL}/classes/${id}/details`);
    return data;
  },

  // Class Sessions (admin)
  getSessions: async (
    classroomId: string,
    page = 1,
    pageSize = 10
  ): Promise<PaginatedResponse<Session>> => {
    const { data } = await axios.get(
      `${BASE_URL}/classes/${classroomId}/sessions`,
      {
        params: { page, pageSize },
      }
    );
    return data;
  },

  createSession: async (session: Omit<Session, "id">): Promise<Session> => {
    // backend expects a nested classroom object: { classroom: { id: string } }
    const payload = {
      ...session,
      classroom: { id: (session as any).classroomId },
    };
    const { data } = await axios.post(`${BASE_URL}/sessions`, payload);
    return data;
  },

  updateSession: async (
    id: string,
    session: Partial<Session>
  ): Promise<Session> => {
    const payload = {
      ...session,
      classroom: (session as any).classroomId
        ? { id: (session as any).classroomId }
        : undefined,
    };
    const { data } = await axios.put(`${BASE_URL}/sessions/${id}`, payload);
    return data;
  },

  deleteSession: async (id: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/sessions/${id}`);
  },

  // Attendance (admin)
  getSessionAttendance: async (
    sessionId: string,
    page = 1,
    pageSize = 10
  ): Promise<PaginatedResponse<Attendance>> => {
    const { data } = await axios.get(`${BASE_URL}/attendance/${sessionId}`);
    return data;
  },

  updateAttendanceStatus: async (
    id: string,
    status: Attendance["status"]
  ): Promise<Attendance> => {
    const { data } = await axios.patch(`${BASE_URL}/attendance/${id}`, {
      status,
    });
    return data;
  },
};
