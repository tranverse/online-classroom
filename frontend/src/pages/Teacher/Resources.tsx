import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import FilesService from "@services/files.service";
import authMemory from "@services/authMemory";
import StudentHeader from "@components/Files/StudentHeader";
import FileList from "@components/Files/FileList";
import CreateFolderModal from "@components/Files/CreateFolderModal";
import UploadButton from "@components/Files/UploadButton";
import { FaFolderOpen, FaCloudUploadAlt } from "react-icons/fa";

type Folder = { id: string; name: string };
type Resource = { id: string; name: string; mimeType?: string; size?: number };

const TeacherResourcesPage: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const { id: classroomId } = useParams<{ id: string }>();

  const currentUser = authMemory.getUser() || {};
  const role = (currentUser.role || "").toUpperCase();
  const isTeacher = role === "TEACHER";

  const load = useCallback(
    async (folderId?: string | null) => {
      try {
        const f = await FilesService.listFolders();
        setFolders(f || []);
        const r = classroomId
          ? await FilesService.listResourcesForClassroom(classroomId)
          : await FilesService.listResources(folderId || undefined);
        setResources(r || []);
      } catch (err) {
        console.error("Failed to load files", err);
      }
    },
    [classroomId]
  );

  useEffect(() => {
    load(activeFolder);
  }, [load, activeFolder]);

  const onFolderClick = (id: string) => {
    setActiveFolder((cur) => (cur === id ? null : id));
  };

  const onFolderCreated = async () => await load(activeFolder);
  const onUploaded = async () => await load(activeFolder);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex justify-between items-center mt-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800 mb-1">
              Classroom Resources
            </h1>
            <p className="text-gray-500 text-sm">
              Manage and share class materials and files
            </p>
          </div>
          {isTeacher && (
            <div className="flex gap-3">
              <CreateFolderModal
                parentId={activeFolder ?? undefined}
                onCreated={onFolderCreated}
              />
              <UploadButton
                folderId={activeFolder ?? undefined}
                classroomId={classroomId}
                onUploaded={onUploaded}
              />
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        {activeFolder ? (
          <nav className="text-sm text-slate-600 flex items-center">
            <button
              className="text-blue-600 hover:underline mr-2"
              onClick={() => setActiveFolder(null)}
            >
              Root
            </button>
            <span className="text-gray-400">/</span>
            <span className="ml-2 font-medium">
              {folders.find((x) => x.id === activeFolder)?.name || "Folder"}
            </span>
          </nav>
        ) : (
          <div className="flex items-center gap-2 text-slate-600">
            <FaFolderOpen className="text-yellow-500" />
            <span className="font-medium text-sm">Currently in root folder</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <FileList
          folders={folders}
          files={resources.map((x) => ({
            ...x,
            folderId: (x as any).folderId || "",
          }))}
          onFolderClick={onFolderClick}
          activeFolderId={activeFolder ?? undefined}
          onDeleted={() => load(activeFolder)}
        />
      </div>

      {/* Floating Upload Button (for mobile) */}
      {isTeacher && (
        <button
          onClick={onUploaded}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all md:hidden"
        >
          <FaCloudUploadAlt className="text-xl" />
        </button>
      )}
    </div>
  );
};

export default TeacherResourcesPage;
