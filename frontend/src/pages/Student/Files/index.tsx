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
      console.log("FilesPage: loading resources for folderId=", folderId);
      const f = await FilesService.listFolders();
      console.log("FilesPage: folders response", f);
      setFolders(f || []);
      const r = await FilesService.listResources(folderId || undefined);
      console.log("FilesPage: resources response", r);
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

  const onFolderCreated = async () => {
    await load(activeFolder);
  };

  const onUploaded = async () => {
    await load(activeFolder);
  };

  return (
    <div className="p-6">
      <StudentHeader />
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <CreateFolderModal
            parentId={activeFolder ?? undefined}
            onCreated={onFolderCreated}
          />
          <UploadButton
            folderId={activeFolder ?? undefined}
            onUploaded={onUploaded}
          />
        </div>

        {activeFolder ? (
          <div className="mb-4">
            <nav className="text-sm text-slate-600">
              <button
                className="underline mr-2"
                onClick={() => setActiveFolder(null)}
              >
                Root
              </button>
              /{" "}
              <span className="font-medium ml-2">
                {folders.find((x) => x.id === activeFolder)?.name || "Folder"}
              </span>
            </nav>
          </div>
        ) : null}

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
