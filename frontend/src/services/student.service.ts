import axios from "../tools/axios.tool";

const BASE = "/api/student";

const mock = {
  dashboard: {
    totalClasses: 3,
    upcomingSessions: 5,
    attendanceRate: 86,
  },
  classrooms: [
    {
      id: "c1",
      name: "Intro to Algorithms",
      teacher: { id: "t1", name: "Dr. Lee" },
      studentCount: 42,
      joinedAt: "2025-01-15",
    },
    {
      id: "c2",
      name: "Linear Algebra",
      teacher: { id: "t2", name: "Prof. Kim" },
      studentCount: 30,
      joinedAt: "2025-02-01",
    },
  ],
  classDetails: {
    classroom: {
      id: "c1",
      name: "Intro to Algorithms",
      description: "Algorithms basics and problem solving.",
      teacher: { id: "t1", name: "Dr. Lee" },
      createdAt: "2025-01-01",
    },
    students: [
      { id: "s1", name: "Alice" },
      { id: "s2", name: "Bob" },
    ],
    sessions: [
      {
        id: "s1",
        title: "Sorting",
        startTime: "2025-11-05T10:00:00",
        endTime: "2025-11-05T11:30:00",
        status: "SCHEDULED",
      },
    ],
  },
};

export const StudentService = {
  getDashboardStats: async () => {
    try {
      const { data } = await axios.get(`${BASE}/dashboard/stats`);
      return data?.data;
    } catch (e) {
      return new Promise((res) => setTimeout(() => res(mock.dashboard), 200));
    }
  },

  getClassrooms: async () => {
    try {
      const { data } = await axios.get(`${BASE}/classrooms`);
      return data?.data;
    } catch (e) {
      return new Promise((res) => setTimeout(() => res(mock.classrooms), 200));
    }
  },

  getClassroomDetails: async (id: string) => {
    try {
      const { data } = await axios.get(`${BASE}/classrooms/${id}`);
      return data?.data;
    } catch (e) {
      return new Promise((res) =>
        setTimeout(() => res(mock.classDetails), 200)
      );
    }
  },

  joinByCode: async (code: string) => {
    try {
      const { data } = await axios.post(`${BASE}/join`, { code });
      return data?.data;
    } catch (e) {
      return new Promise((res) =>
        setTimeout(() => res({ success: true }), 200)
      );
    }
  },

  getMembers: async (classroomId: string) => {
    try {
      const { data } = await axios.get(
        `${BASE}/classrooms/${classroomId}/members`
      );
      return data?.data;
    } catch (e) {
      return new Promise((res) =>
        setTimeout(() => res(mock.classDetails.students), 200)
      );
    }
  },

  getSessions: async (classroomId: string) => {
    try {
      const { data } = await axios.get(
        `${BASE}/classrooms/${classroomId}/sessions`
      );
      return data?.data;
    } catch (e) {
      return new Promise((res) =>
        setTimeout(() => res(mock.classDetails.sessions), 200)
      );
    }
  },

  getAttendanceForClass: async (classroomId: string) => {
    try {
      const { data } = await axios.get(
        `${BASE}/attendance?classroomId=${classroomId}`
      );
      return data?.data;
    } catch (e) {
      return new Promise((res) => setTimeout(() => res([]), 200));
    }
  },

  getProfile: async () => {
    try {
      const { data } = await axios.get(`${BASE}/profile`);
      return data?.data;
    } catch (e) {
      return new Promise((res) =>
        setTimeout(
          () =>
            res({
              id: "me",
              name: "Student User",
              email: "me@example.com",
              role: "STUDENT",
              createdAt: "2025-01-01",
            }),
          200
        )
      );
    }
  },
  updateProfile: async (payload: {
    name?: string;
    email?: string;
    phone?: string;
  }) => {
    try {
      const { data } = await axios.put(`${BASE}/profile`, payload);
      return data?.data;
    } catch (e) {
      return new Promise((res) =>
        setTimeout(() => res({ ...payload, id: "me" }), 500)
      );
    }
  },

  uploadAttendancePhoto: async (file: File) => {
    try {
      const form = new FormData();
      form.append("photo", file);
      const { data } = await axios.post(`${BASE}/attendance/photo`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data?.data;
    } catch (err: any) {
      // If server returned 401, surface it so caller can handle auth
      if (err?.response?.status === 401) throw new Error("Unauthorized");
      // other errors: keep fallback behavior
      return new Promise((res) =>
        setTimeout(() => res({ success: true }), 800)
      );
    }
  },
  verifyAttendance: async (
    descriptor: number[],
    classSessionId?: string,
    studentId?: string
  ) => {
    try {
      const payload: any = { descriptor };
      if (classSessionId) payload.classSessionId = classSessionId;
      if (studentId) payload.studentId = studentId;
      const { data } = await axios.post(`${BASE}/attendance/verify`, payload);
      return data?.data;
    } catch (e) {
      // fallback mock: accept always
      return new Promise((res) =>
        setTimeout(() => res({ matched: true, distance: 0.4 }), 800)
      );
    }
  },
};

export default StudentService;
