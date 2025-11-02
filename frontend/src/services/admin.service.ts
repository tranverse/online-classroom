import axios from "../tools/axios.tool";
import {
  User,
  Classroom,
  Session,
  Attendance,
  DashboardStats,
  PaginatedResponse,
} from "../types/admin";

const BASE_URL = "/api/admin";

export const AdminService = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const { data } = await axios.get(`${BASE_URL}/dashboard/stats`);
    return data;
  },

  // Users
  getUsers: async (
    page = 1,
    pageSize = 10
  ): Promise<PaginatedResponse<User>> => {
    const { data } = await axios.get(`${BASE_URL}/users`, {
      params: { page, pageSize },
    });
    return data;
  },

  createUser: async (user: Omit<User, "id" | "createdAt">): Promise<User> => {
    const { data } = await axios.post(`${BASE_URL}/users`, user);
    return data;
  },

  updateUser: async (id: string, user: Partial<User>): Promise<User> => {
    const { data } = await axios.put(`${BASE_URL}/users/${id}`, user);
    return data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/users/${id}`);
  },

  // Classrooms
  getClassrooms: async (
    page = 1,
    pageSize = 10
  ): Promise<PaginatedResponse<Classroom>> => {
    const { data } = await axios.get(`${BASE_URL}/classes`, {
      params: { page, pageSize },
    });
    return data;
  },

  createClassroom: async (
    classroom: Omit<Classroom, "id" | "createdAt" | "studentCount">
  ): Promise<Classroom> => {
    const { data } = await axios.post(`${BASE_URL}/classes`, classroom);
    return data;
  },

  updateClassroom: async (
    id: string,
    classroom: Partial<Classroom>
  ): Promise<Classroom> => {
    const { data } = await axios.put(`${BASE_URL}/classes/${id}`, classroom);
    return data;
  },

  deleteClassroom: async (id: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/classes/${id}`);
  },

  // Class Sessions
  getSessions: async (
    classroomId: string,
    page = 1,
    pageSize = 10
  ): Promise<PaginatedResponse<Session>> => {
    const { data } = await axios.get(`${BASE_URL}/sessions`, {
      params: { classroomId, page, pageSize },
    });
    return data;
  },

  createSession: async (session: Omit<Session, "id">): Promise<Session> => {
    const { data } = await axios.post(`${BASE_URL}/sessions`, session);
    return data;
  },

  updateSession: async (
    id: string,
    session: Partial<Session>
  ): Promise<Session> => {
    const { data } = await axios.put(`${BASE_URL}/sessions/${id}`, session);
    return data;
  },

  deleteSession: async (id: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/sessions/${id}`);
  },

  // Attendance
  getSessionAttendance: async (
    sessionId: string,
    page = 1,
    pageSize = 10
  ): Promise<PaginatedResponse<Attendance>> => {
    const { data } = await axios.get(`${BASE_URL}/attendance`, {
      params: { sessionId, page, pageSize },
    });
    return data;
  },

  updateAttendanceStatus: async (
    id: string,
    status: Attendance["status"]
  ): Promise<Attendance> => {
    const { data } = await axios.put(`${BASE_URL}/attendance/${id}`, {
      status,
    });
    return data;
  },
};
