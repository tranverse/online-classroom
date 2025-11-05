import React, { useState } from "react";
import FilesService from "@services/files.service";

type Props = { parentId?: string; onCreated?: () => void };

const CreateFolderModal: React.FC<Props> = ({ parentId, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = async () => {
    try {
      await FilesService.createFolder(name, parentId);
      setOpen(false);
      setName("");
      onCreated?.();
    } catch (err) {
      console.error("Failed to create folder", err);
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 bg-white rounded-md border shadow-sm hover:bg-slate-50"
      >
        Create folder
      </button>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md z-10">
            <h3 className="text-lg font-semibold mb-3">New folder</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name"
              className="w-full border rounded px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-2">
                Cancel
              </button>
              <button
                onClick={create}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateFolderModal;
