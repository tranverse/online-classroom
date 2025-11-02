import React, { useState, useEffect } from "react";
import { Session, Classroom } from "../../types/admin";
import { AdminService } from "../../services/admin.service";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";

interface SessionFormData {
  title: string;
  classroomId: string;
  startTime: string;
  endTime: string;
  status: Session["status"];
}

const SessionForm: React.FC<{
  onSubmit: (data: SessionFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<SessionFormData>;
  classrooms: Classroom[];
}> = ({ onSubmit, onCancel, initialData, classrooms }) => {
  const [formData, setFormData] = useState<SessionFormData>({
    title: initialData?.title || "",
    classroomId: initialData?.classroomId || "",
    startTime: initialData?.startTime || "",
    endTime: initialData?.endTime || "",
    status: initialData?.status || "SCHEDULED",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Classroom
        </label>
        <select
          value={formData.classroomId}
          onChange={(e) =>
            setFormData({ ...formData, classroomId: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        >
          <option value="">Select a classroom</option>
          {classrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Start Time
        </label>
        <input
          type="datetime-local"
          value={formData.startTime}
          onChange={(e) =>
            setFormData({ ...formData, startTime: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          End Time
        </label>
        <input
          type="datetime-local"
          value={formData.endTime}
          onChange={(e) =>
            setFormData({ ...formData, endTime: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData({
              ...formData,
              status: e.target.value as Session["status"],
            })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </form>
  );
};

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
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
      console.error("Failed to fetch sessions:", error);
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
      console.error("Failed to fetch classrooms:", error);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassroom) {
      fetchSessions();
    }
  }, [selectedClassroom, page]);

  const handleCreateSession = async (data: SessionFormData) => {
    try {
      await AdminService.createSession(data);
      setModalOpen(false);
      fetchSessions();
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleUpdateSession = async (data: SessionFormData) => {
    if (!editingSession) return;
    try {
      await AdminService.updateSession(editingSession.id, data);
      setModalOpen(false);
      setEditingSession(null);
      fetchSessions();
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this session?"))
      return;
    try {
      await AdminService.deleteSession(id);
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const columns = [
    { key: "title", title: "Title" },
    {
      key: "startTime",
      title: "Start Time",
      render: (session: Session) => formatDateTime(session.startTime),
    },
    {
      key: "endTime",
      title: "End Time",
      render: (session: Session) => formatDateTime(session.endTime),
    },
    {
      key: "status",
      title: "Status",
      render: (session: Session) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            session.status === "IN_PROGRESS"
              ? "bg-green-100 text-green-800"
              : session.status === "COMPLETED"
              ? "bg-blue-100 text-blue-800"
              : session.status === "CANCELLED"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {session.status}
        </span>
      ),
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
            Edit
          </button>
          <button
            onClick={() => handleDeleteSession(session.id)}
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Sessions</h1>
          <select
            value={selectedClassroom}
            onChange={(e) => {
              setSelectedClassroom(e.target.value);
              setPage(1);
            }}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setEditingSession(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          disabled={!selectedClassroom}
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
                  ...editingSession,
                  classroomId: selectedClassroom,
                }
              : { classroomId: selectedClassroom }
          }
          classrooms={classrooms}
        />
      </Modal>
    </div>
  );
};
