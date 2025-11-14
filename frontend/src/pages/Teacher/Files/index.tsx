import React, { useCallback } from "react";
import StudentHeader from "../../../components/Files/StudentHeader";
import FileList from "../../../components/Files/FileList";
import CreateFolderModal from "../../../components/Files/CreateFolderModal";
import UploadButton from "../../../components/Files/UploadButton";
import FilesService from "@services/files.service";
import { useEffect, useState } from "react";

type Folder = { id: string; name: string };
type Resource = { id: string; name: string; mimeType?: string; size?: number };

const TeacherFile: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const load = useCallback(async (folderId?: string | null) => {
    try {
      const f = await FilesService.listFolders();
      setFolders(f || []);

      const r = await FilesService.listResources(folderId || undefined);
      setResources(r || []);
    } catch (err) {
      console.error("Failed to load files", err);
    }
  }, []);

  useEffect(() => {
    load(activeFolder);
  }, [load, activeFolder]);

  const onFolderClick = (id: string) => {
    setActiveFolder((cur) => (cur === id ? null : id));
  };

  const onFolderCreated = async () => load(activeFolder);
  const onUploaded = async () => load(activeFolder);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mt-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800">Teacher Files</h1>
        </div>

        {/* Controls: Create + Upload */}
        <div className="flex items-center justify-between p-4 bg-white shadow-md rounded-xl border border-slate-200">
          <CreateFolderModal
            parentId={activeFolder ?? undefined}
            onCreated={onFolderCreated}
          />
          <UploadButton
            folderId={activeFolder ?? undefined}
            onUploaded={onUploaded}
          />
        </div>

        {/* Breadcrumb */}
        {activeFolder && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <nav className="text-sm text-slate-600 flex items-center">
              <button
                className="text-blue-600 hover:underline"
                onClick={() => setActiveFolder(null)}
              >
                Root
              </button>
              <span className="mx-2 text-slate-400">/</span>

              <span className="font-medium text-slate-700">
                {folders.find((x) => x.id === activeFolder)?.name || "Folder"}
              </span>
            </nav>
          </div>
        )}

        {/* File List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <FileList
            folders={folders}
            files={resources}
            onFolderClick={onFolderClick}
            activeFolderId={activeFolder ?? undefined}
            onDeleted={() => load(activeFolder)}
          />
        </div>
      </div>
    </div>
  );
};

export default TeacherFile;
