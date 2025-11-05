import React from "react";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StudentHeader: React.FC = () => {
  const nav = useNavigate();
  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Student</h2>
        <span className="text-sm text-slate-500">Files & submissions</span>
      </div>
      <button
        onClick={() => nav("/student/files")}
        className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md px-3 py-2 border"
        title="Open Files"
      >
        <FileText className="w-5 h-5" />
        <span className="hidden sm:inline">Files</span>
      </button>
    </div>
  );
};

export default StudentHeader;
