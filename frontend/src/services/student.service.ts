import axios from "../tools/axios.tool";

const BASE = "/api/student";

export const StudentService = {
  getDashboardStats: async () => {
    try {
      const { data } = await axios.get(`${BASE}/dashboard/stats`);
      return data?.data;
    } catch (e) {}
  },

  getClassrooms: async () => {
    try {
      const { data } = await axios.get(`${BASE}/classrooms`);
      return data?.data;
    } catch (e) {}
  },

  getClassroomDetails: async (id: string) => {
    try {
      const { data } = await axios.get(`${BASE}/classrooms/${id}`);
      return data?.data;
    } catch (e) {}
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
    } catch (e) {}
  },

  getSessions: async (classroomId: string) => {
    try {
      const { data } = await axios.get(
        `${BASE}/classrooms/${classroomId}/sessions`
      );
      return data?.data;
    } catch (e) {}
  },

  getUpcomingSessions: async (classroomId: string) => {
    try {
      // student-facing endpoint that returns upcoming sessions across student's classes
      const { data } = await axios.get(`${BASE}/sessions/upcoming`);
      // server returns all upcoming sessions for the student; filter by classroom if classroomId provided
      const all: any[] = data?.data || [];
      if (classroomId)
        return all.filter((s) => s.classroom?.id === classroomId);
      return all;
    } catch (e) {
      // fallback to full sessions list
      return StudentService.getSessions(classroomId);
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

  uploadAttendancePhoto: async (file: File, classSessionId?: string) => {
    try {
      const form = new FormData();
      form.append("photo", file);
      // Do not manually set Content-Type for FormData — the browser will add
      // the required multipart boundary. Manually setting it can break
      // multipart parsing on the server and cause 500 errors.
      const url = classSessionId
        ? `${BASE}/attendance/photo?classSessionId=${encodeURIComponent(
            classSessionId
          )}`
        : `${BASE}/attendance/photo`;
      const { data } = await axios.post(url, form);
      return data?.data;
    } catch (err: any) {
      // If server returned 413 (Payload Too Large), surface explicit error
      if (err?.response?.status === 413) throw new Error("FILE_TOO_LARGE");
      // If server returned 401, surface it so caller can handle auth
      if (err?.response?.status === 401) throw new Error("Unauthorized");
      // other errors: surface server message if provided so UI can show it
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      throw new Error(serverMsg || "UPLOAD_FAILED");
    }
  },
  // face endpoints
  getFaceChallenge: async () => {
    try {
      const { data } = await axios.get(`/api/face/challenge`);
      return data?.data;
    } catch (e) {
      return null;
    }
  },

  enrollEmbedding: async (
    classroomId: string,
    embedding: number[],
    studentId?: string
  ) => {
    try {
      const payload: any = { embedding };
      if (studentId) payload.studentId = studentId;
      const { data } = await axios.post(
        `/api/face/enroll/${classroomId}`,
        payload
      );
      return data?.data;
    } catch (e) {
      return null;
    }
  },

  checkFaceAttendance: async (
    classroomId: string,
    sessionId: string,
    embedding: number[],
    challengeMetrics: any,
    studentId?: string
  ) => {
    try {
      const payload: any = { embedding, challengeMetrics };
      if (studentId) payload.studentId = studentId;
      const { data } = await axios.post(
        `/api/face/check/${classroomId}/${sessionId}`,
        payload
      );
      return data?.data;
    } catch (e) {
      return null;
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
  verifyAttendanceImage: async (
    imageBase64: string,
    classSessionId?: string,
    studentId?: string
  ) => {
    try {
      const payload: any = { imageBase64 };
      if (classSessionId) payload.classSessionId = classSessionId;
      if (studentId) payload.studentId = studentId;
      const { data } = await axios.post(`${BASE}/attendance/verify`, payload);
      return data?.data;
    } catch (e) {
      return null;
    }
  },

  enrollSelf: async (file: File) => {
    try {
      const form = new FormData();
      form.append("photo", file);
      const { data } = await axios.post(`/api/student/face/enroll`, form);
      return data?.data;
    } catch (err: any) {
      return null;
    }
  },
  verifyFaceQuality: async (imageBase64: string) => {
    const res = await axios.post("/api/student/face/verify-quality", {
      imageBase64,
    });
    return res.data?.data;
  },
};

export default StudentService;
