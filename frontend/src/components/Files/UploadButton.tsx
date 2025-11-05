import React, { useRef } from "react";
import FilesService from "@services/files.service";
import { useToast } from "@components/Toast";
import { useNavigate } from "react-router-dom";

type Props = { folderId?: string; onUploaded?: () => void };

const UploadButton: React.FC<Props> = ({ folderId, onUploaded }) => {
  const ref = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const nav = useNavigate();

  const onPick = () => {
    ref.current?.click();
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // capture ref locally so we can reset after async
    const inputEl = ref.current;
    try {
      await FilesService.uploadFile(file, folderId);
      toast?.show
        ? toast.show("Uploaded", "success")
        : console.info("Uploaded");
      onUploaded?.();
    } catch (err: any) {
      console.error("Upload failed", err);
      if (err?.response?.status === 401) {
        toast?.show
          ? toast.show("Unauthorized — please login to upload", "error")
          : console.warn("Unauthorized — please login to upload");
        nav("/login");
      } else {
        toast?.show
          ? toast.show("Upload failed", "error")
          : console.warn("Upload failed");
      }
    } finally {
      if (inputEl) inputEl.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={ref} onChange={onChange} type="file" className="hidden" />
      <button
        onClick={onPick}
        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
      >
        Upload file
      </button>
    </div>
  );
};

export default UploadButton;
