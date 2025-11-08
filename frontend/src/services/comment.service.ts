import axios from "@tools/axios.tool";

const BASE = "/api/comments";

const CommentService = {
  create: async (classSessionId: string, message: string) => {
    try {
      // attach X-User-Id header from persisted user when available
      let headers: any = {};
      try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (user && user.id) headers["X-User-Id"] = user.id;
      } catch (e) {}

      const { data } = await axios.post(
        BASE,
        { classSessionId, message },
        { headers }
      );
      // axios tool returns full server payload in `data` — ApiResponse<T>
      return data?.data || data;
    } catch (err: any) {
      // return server error payload to caller for handling
      const server = err?.response?.data;
      throw new Error(
        server?.message || err?.message || "CREATE_COMMENT_FAILED"
      );
    }
  },

  listForSession: async (sessionId: string) => {
    try {
      const { data } = await axios.get(
        `${BASE}/session/${encodeURIComponent(sessionId)}`
      );
      return data?.data || data;
    } catch (err: any) {
      return [];
    }
  },

  delete: async (id: string) => {
    try {
      const { data } = await axios.delete(`${BASE}/${encodeURIComponent(id)}`);
      return data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || "DELETE_FAILED");
    }
  },
};

export default CommentService;
