import axios from "../tools/axios.tool";

export class DocumentService {
  static async listDocuments(path: string = "") {
    const response = await axios.get(`/api/documents/list`, {
      params: { path },
    });
    return response.data;
  }

  static async createFolder(data: { name: string; path: string }) {
    const response = await axios.post("/api/documents/folder", data);
    return response.data;
  }

  static async uploadFile(formData: FormData) {
    const response = await axios.post("/api/documents/upload", formData, {
      // Do not set Content-Type manually for FormData. Browser/axios will add the
      // correct Content-Type including boundary.
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        // You can use this to update a progress bar
      },
    });
    return response.data;
  }

  static async deleteItems(itemIds: string[]) {
    const response = await axios.delete("/api/documents/delete", {
      data: { itemIds },
    });
    return response.data;
  }

  static async downloadFile(fileId: string) {
    const response = await axios.get(`/api/documents/download/${fileId}`, {
      responseType: "blob",
    });

    // Create a URL for the blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;

    // Get filename from response headers if available
    const contentDisposition = response.headers["content-disposition"];
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1].replace(/"/g, "")
      : "download";

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  static async shareDocuments(data: {
    documentIds: string[];
    classId: string;
  }) {
    const response = await axios.post("/api/documents/share", data);
    return response.data;
  }

  static async getClassDocuments(classId: string) {
    const response = await axios.get(`/api/classes/${classId}/documents`);
    return response.data;
  }
}
