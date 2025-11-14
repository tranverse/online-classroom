import React, { useCallback } from "react";
import StudentHeader from "../../../components/Files/StudentHeader";
import FileList from "../../../components/Files/FileList";
import CreateFolderModal from "../../../components/Files/CreateFolderModal";
import UploadButton from "../../../components/Files/UploadButton";
import FilesService from "@services/files.service";
import { useEffect, useState } from "react";

type Folder = { id: string; name: string };
type Resource = { id: string; name: string; mimeType?: string; size?: number };

const FilesPage: React.FC = () => {
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
      {/* Header */}
      <div className="mb-6">
        <StudentHeader />
      </div>

      {/* Control Panel */}
      <div className="flex items-center justify-between bg-white shadow-md border border-slate-200 rounded-xl p-4 mb-6">
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
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <nav className="text-sm text-slate-600 flex items-center gap-2">
            <button
              className="text-blue-600 hover:underline"
              onClick={() => setActiveFolder(null)}
            >
              Root
            </button>

            <span className="text-slate-400">/</span>

            <span className="font-medium text-slate-800">
              {folders.find((x) => x.id === activeFolder)?.name || "Folder"}
            </span>
          </nav>
        </div>
      )}

      {/* Files list */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <FileList
          folders={folders}
          files={resources}
          onFolderClick={onFolderClick}
          activeFolderId={activeFolder ?? undefined}
          onDeleted={() => load(activeFolder)}
        />
      </div>
    </div>
  );
};

export default FilesPage;
