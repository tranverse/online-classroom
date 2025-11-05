import axios from "axios";

const BASE = "/api/assignments";

export const AssignmentService = {
  create: async (payload: any) => {
    const { data } = await axios.post(BASE, payload);
    return data;
  },

  listForClass: async (classroomId: string) => {
    const { data } = await axios.get(`${BASE}/classroom/${classroomId}`);
    return data;
  },

  submit: async (payload: { assignmentId: string; fileUrl?: string }) => {
    const { data } = await axios.post(`${BASE}/submit`, payload);
    return data;
  },

  listSubmissions: async (assignmentId: string) => {
    const { data } = await axios.get(`${BASE}/${assignmentId}/submissions`);
    return data;
  },

  grade: async (
    submissionId: string,
    payload: { grade: number; feedback?: string }
  ) => {
    const { data } = await axios.patch(
      `${BASE}/submission/${submissionId}/grade`,
      payload
    );
    return data;
  },
};

export default AssignmentService;
