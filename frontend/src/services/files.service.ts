import axios from "../tools/axios.tool";

const BASE = "/api/resources";

const FilesService = {
  createFolder: async (name: string, parentId?: string) => {
    const url = `${BASE}/folders?name=${encodeURIComponent(name)}${
      parentId ? `&parentId=${parentId}` : ""
    }`;
    const { data } = await axios.post(url);
    return data?.data;
  },

  uploadFile: async (file: File, folderId?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (folderId) form.append("folderId", folderId);
    const url = `${BASE}/upload${folderId ? `?folderId=${folderId}` : ""}`;
    console.debug("FilesService.uploadFile: url=", url);
    try {
      const keys: string[] = [];
      form.forEach((v, k) => keys.push(k));
      console.debug("FilesService.uploadFile: form keys=", keys);
    } catch (e) {
      console.debug(
        "FilesService.uploadFile: failed to enumerate form keys",
        e
      );
    }
    // Let the browser set Content-Type (including boundary) for FormData.
    const { data } = await axios.post(url, form);
    return data?.data;
  },

  listResources: async (folderId?: string) => {
    const url = `${BASE}${folderId ? `?folderId=${folderId}` : ""}`;
    const { data } = await axios.get(url);
    return data?.data;
  },

  listFolders: async () => {
    const { data } = await axios.get(`${BASE}/folders`);
    return data?.data;
  },

  deleteResource: async (id: string) => {
    const { data } = await axios.delete(`${BASE}/${id}`);
    return data;
  },

  deleteFolder: async (id: string) => {
    const { data } = await axios.delete(`${BASE}/folders/${id}`);
    return data;
  },

  downloadResourceBlob: async (id: string) => {
    const resp = await axios.get(`${BASE}/download/${id}`, {
      responseType: "blob",
    });
    return resp.data as Blob;
  },
};

export default FilesService;
