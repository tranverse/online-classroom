import React from "react";
import { Folder, FileText, Download } from "lucide-react";
import FilesService from "@services/files.service";

type FolderType = { id: string; name: string };
type FileType = { id: string; name: string; size?: number; folderId: string };

const FileList: React.FC<{
  folders?: FolderType[];
  files?: FileType[];
  onFolderClick?: (id: string) => void;
  activeFolderId?: string;
  onDeleted?: () => void;
}> = ({
  folders = [],
  files = [],
  onFolderClick,
  activeFolderId,
  onDeleted,
}) => {
  const download = async (file: FileType) => {
    try {
      const blob = await FilesService.downloadResourceBlob(file.id);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch (err) {
      console.error("Download error", err);
      alert("Failed to download file");
    }
  };

  const preview = async (file: FileType) => {
    try {
      const blob = await FilesService.downloadResourceBlob(file.id);
      const ext = file.name.split(".").pop()?.toLowerCase();
      const objectUrl = URL.createObjectURL(blob);
      const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];
      if (ext && (imageExts.includes(ext) || ext === "pdf")) {
        window.open(objectUrl, "_blank");
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      } else {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      }
    } catch (err) {
      console.error("Preview error", err);
      alert("Failed to preview file");
    }
  };

  const deleteFile = async (file: FileType) => {
    if (!confirm(`Delete file "${file.name}"?`)) return;
    try {
      await FilesService.deleteResource(file.id);
      onDeleted?.();
    } catch (err) {
      console.error("Delete file error", err);
      alert("Failed to delete file");
    }
  };

  const deleteFolder = async (folder: FolderType) => {
    if (
      !confirm(
        `Delete folder "${folder.name}"? (only empty folders can be deleted)`
      )
    )
      return;
    try {
      await FilesService.deleteFolder(folder.id);
      onDeleted?.();
    } catch (err) {
      console.error("Delete folder error", err);
      alert("Failed to delete folder (make sure it is empty)");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {!activeFolderId && (
        <div>
          <h3 className="text-lg font-medium mb-2">Folders</h3>
          <div className="space-y-2">
            {folders.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 p-3 bg-white rounded-md shadow-sm border hover:bg-slate-50"
              >
                <div
                  onClick={() => onFolderClick?.(f.id)}
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Folder className="w-6 h-6 text-sky-500" />
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-sm text-slate-500">—</div>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => deleteFolder(f)}
                    className="text-red-600 hover:text-red-800 px-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {folders.length === 0 && (
              <div className="text-sm text-slate-500">No folders</div>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium mb-2">Files</h3>
        <div className="space-y-2">
          {files
            .map((f) => (
              <div
                key={f.id}
                onClick={() => preview(f)}
                role="button"
                tabIndex={0}
                className="flex items-center justify-between gap-3 p-3 bg-white rounded-md shadow-sm border hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-amber-500" />
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-sm text-slate-500">
                      {f.size ?? "-"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      download(f);
                    }}
                    className="text-slate-600 hover:text-slate-800"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(f);
                    }}
                    className="text-red-600 hover:text-red-800 px-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          {files.length === 0 && (
            <div className="text-sm text-slate-500">No files</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileList;
