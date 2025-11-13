import React, { useState, useEffect } from "react";
import { Session, Classroom } from "../../types/admin";
import { AdminService } from "../../services/admin.service";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiEdit, FiEye, FiTrash2, FiUserPlus } from "react-icons/fi";

interface SessionFormData {
  title: string;
  classroomId: string;
  startTime: string;
  endTime: string;
  status: Session["status"];
  sessionType?: "LARGE_CLASS" | "SMALL_CLASS" | "ONE_TO_ONE";
  note?: string;
  link?: string;
}

const SessionForm: React.FC<{
  onSubmit: (data: SessionFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<SessionFormData>;
  classrooms: Classroom[];
  isEdit?: boolean;
}> = ({ onSubmit, onCancel, initialData, classrooms, isEdit }) => {
  const [formData, setFormData] = useState<SessionFormData>({
    title: initialData?.title || "",
    classroomId: initialData?.classroomId || "",
    startTime: initialData?.startTime || "",
    endTime: initialData?.endTime || "",
    status: initialData?.status || "SCHEDULED",
    sessionType: (initialData as any)?.sessionType || "LARGE_CLASS",
    note: (initialData as any)?.note || "",
    link: (initialData as any)?.link || "",
  });

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const generateUuid = () => {
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const makeLink = (classroomId?: string) => {
    const base = "http://localhost:5173/online/classroom";
    const classroom = classrooms.find((c) => c.id === classroomId);
    const name = classroom ? classroom.name : "class";
    const slug = slugify(name);
    const id = generateUuid();
    return `${base}/${slug}-${id}`;
  };

  useEffect(() => {
    if (!formData.link && formData.classroomId) {
      const link = makeLink(formData.classroomId);
      setFormData((s) => ({ ...s, link }));
    }
  }, [formData.classroomId, classrooms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };
  console.log("formData", formData);
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded-xl shadow-md border border-gray-200 max-w-lg mx-auto"
    >
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 sm:text-sm p-2"
          required
        />
      </div>

      {/* Classroom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Classroom
        </label>
        {isEdit ? (
          // Edit: hiển thị dropdown
          <select
            value={formData.classroomId}
            onChange={(e) =>
              setFormData({ ...formData, classroomId: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 sm:text-sm p-2"
            required
          >
            <option value="">Select a classroom</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        ) : (
          // Create: chỉ show text classroom
          <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-300">
            {classrooms.find((c) => c.id === formData.classroomId)?.name || "-"}
          </div>
        )}
      </div>

      {/* Start & End Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time
          </label>
          <input
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) =>
              setFormData({ ...formData, startTime: e.target.value })
            }
            min={new Date().toISOString().slice(0, 16)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 sm:text-sm p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time
          </label>
          <input
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) =>
              setFormData({ ...formData, endTime: e.target.value })
            }
            min={formData.startTime}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 sm:text-sm p-2"
            required
          />
        </div>
      </div>

      {/* Status & Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <input
            type="text"
            value="SCHEDULED"
            readOnly
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 text-gray-700 sm:text-sm p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={formData.sessionType}
            onChange={(e) =>
              setFormData({ ...formData, sessionType: e.target.value as any })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 sm:text-sm p-2"
          >
            <option value="LARGE_CLASS">Large class</option>
            <option value="SMALL_CLASS">Small class</option>
            <option value="ONE_TO_ONE">One-to-one</option>
          </select>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Note
        </label>
        <textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 sm:text-sm p-2"
        />
      </div>

      {/* Link */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={formData.link || ""}
            readOnly
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 sm:text-sm bg-gray-50 p-2"
          />
          {formData.link && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(formData.link!);
                  toast.success("Link copied!");
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to copy link!");
                }
              }}
              className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              Copy
            </button>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
        >
          Save
        </button>
      </div>
    </form>
  );
};

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const pageSize = 10;
  const fetchSessions = async () => {
    if (!selectedClassroom) return;
    setLoading(true);
    try {
      const response = await AdminService.getSessions(
        selectedClassroom,
        page,
        pageSize
      );
      setSessions(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch sessions!");
    } finally {
      setLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await AdminService.getClassrooms(1, 100);
      setClassrooms(response.data);
      if (response.data.length > 0 && !selectedClassroom) {
        setSelectedClassroom(response.data[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch classrooms!");
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassroom) fetchSessions();
  }, [selectedClassroom, page]);

  const handleCreateSession = async (data: SessionFormData) => {
    try {
      await AdminService.createSession(data);
      setModalOpen(false);
      toast.success("Session created successfully!");
      fetchSessions();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create session!");
    }
  };

  const handleUpdateSession = async (data: SessionFormData) => {
    if (!editingSession) return;
    if (!editingSession.id) return;
    console.log(data);
    try {
      await AdminService.updateSession(editingSession.id, data);
      setModalOpen(false);
      setEditingSession(null);
      toast.success("Session updated successfully!");
      fetchSessions();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update session!");
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this session?"))
      return;
    try {
      await AdminService.deleteSession(id);
      toast.success("Session deleted successfully!");
      fetchSessions();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete session!");
    }
  };

  const columns = [
    { key: "title", title: "Title" },
    {
      key: "time",
      title: "Time",
      render: (session: Session) => {
        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr);
          return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
          )}`;
        };

        return (
          <div className="flex flex-col text-sm text-gray-700">
            <div className="font-medium">{formatDate(session.startTime)}</div>
            <div className="text-xs text-gray-500">
              to {formatDate(session.endTime)}
            </div>
          </div>
        );
      },
    },

    {
      key: "link",
      title: "Link",
      render: (session: Session) => (
        <div className="flex items-start space-x-2 ">
          <div className="break-all line-clamp-3 whitespace-normal">
            {session.link ? (
              <a
                href={session.link}
                className="text-sm text-blue-600 hover:underline break-words block"
                target="_blank"
                rel="noreferrer"
              >
                {session.link}
              </a>
            ) : (
              <span className="text-sm text-gray-500">-</span>
            )}
          </div>
          {session.link && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(session.link!);
                  setCopiedId(session.id);
                  toast.success("Link copied!");
                  setTimeout(() => setCopiedId(null), 2000);
                } catch (err) {
                  console.error(err);
                  toast.error("Unable to copy link");
                }
              }}
              className="text-sm px-2 py-1 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              {copiedId === session.id ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (session: Session) => {
        // map status sang màu và nhãn hiển thị
        const statusMap: Record<string, { label: string; color: string }> = {
          SCHEDULED: { label: "Scheduled", color: "text-gray-700 bg-gray-100" }, // màu xám nhẹ
          IN_PROGRESS: {
            label: "In Progress",
            color: "text-blue-600 bg-blue-100",
          }, // đang diễn ra → xanh dương
          COMPLETED: {
            label: "Completed",
            color: "text-green-600 bg-green-100",
          }, // xong → xanh lá
          CANCELLED: { label: "Cancelled", color: "text-red-600 bg-red-100" },
          UPCOMING: {
            label: "Upcoming",
            color: "text-indigo-600 bg-indigo-100",
          },
        };

        const status = statusMap[session.sessionStatus] || {
          label: session.sessionStatus,
          color: "text-gray-500 bg-gray-100",
        };

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
          >
            {status.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      title: "Actions",
      render: (session: Session) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setEditingSession(session);
              setModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            <FiEye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setEditingSession(session);
              setModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteSession(session.id)}
            className="text-red-600 hover:text-red-800"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];
  console.log(selectedClassroom);
  console.log("editingSession", editingSession);
  console.log("editingSession", sessions);

  return (
    <div className="p-6">
      <ToastContainer />
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Sessions</h1>
          <div className="relative w-60">
            <select
              value={selectedClassroom}
              onChange={(e) => {
                setSelectedClassroom(e.target.value);
                setPage(1);
              }}
              className="
        block w-full appearance-none bg-white border border-gray-300 text-gray-700 
        px-4 py-2 pr-10 rounded-lg shadow-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        sm:text-sm transition-all duration-200
        hover:border-gray-400
      "
            >
              {classrooms.map((classroom) => (
                <option
                  key={classroom.id}
                  value={classroom.id}
                  className="bg-white text-gray-700"
                >
                  {classroom.name}
                </option>
              ))}
            </select>
            {/* Custom arrow */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (!selectedClassroom) {
              toast.error("Please select a classroom first!");
              return;
            }
            setEditingSession(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Add Session
        </button>
      </div>

      <DataTable
        columns={columns}
        data={sessions}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
      />

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSession(null);
        }}
        title={editingSession ? "Edit Session" : "Add Session"}
      >
        <SessionForm
          onSubmit={editingSession ? handleUpdateSession : handleCreateSession}
          onCancel={() => {
            setModalOpen(false);
            setEditingSession(null);
          }}
          initialData={
            editingSession
              ? {
                  title: editingSession.title,
                  classroomId: selectedClassroom,
                  startTime: editingSession.startTime,
                  endTime: editingSession.endTime,
                  status: editingSession.status,
                  sessionType: editingSession.sessionType,
                  note: editingSession.note,
                  link: editingSession.link,
                }
              : {
                  classroomId: selectedClassroom,
                }
          }
          classrooms={classrooms}
          isEdit={!!editingSession} // <-- pass prop ở đây
        />
      </Modal>
    </div>
  );
};
