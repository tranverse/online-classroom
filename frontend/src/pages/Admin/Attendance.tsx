import React, { useState, useEffect } from "react";
import { Attendance, Session, Classroom } from "../../types/admin";
import { AdminService } from "../../services/admin.service";
import { DataTable } from "../../components/DataTable";

export const AttendancePage: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

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

  const fetchSessions = async () => {
    if (!selectedClassroom) return;
    try {
      const response = await AdminService.getSessions(
        selectedClassroom,
        1,
        100
      );
      setSessions(response.data);
      if (response.data.length > 0 && !selectedSession) {
        setSelectedSession(response.data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedSession) return;
    setLoading(true);
    try {
      const response = await AdminService.getSessionAttendance(
        selectedSession,
        page,
        pageSize
      );
      setAttendance(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassroom) {
      fetchSessions();
      setSelectedSession("");
    }
  }, [selectedClassroom]);

  useEffect(() => {
    if (selectedSession) {
      fetchAttendance();
    }
  }, [selectedSession, page]);

  const handleStatusUpdate = async (
    id: string,
    newStatus: Attendance["status"]
  ) => {
    try {
      await AdminService.updateAttendanceStatus(id, newStatus);
      fetchAttendance();
    } catch (error) {
      console.error("Failed to update attendance status:", error);
    }
  };

  const getStatusBadgeClasses = (status: Attendance["status"]) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-100 text-green-800";
      case "ABSENT":
        return "bg-red-100 text-red-800";
      case "SUSPICIOUS":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const columns = [
    { key: "userName", title: "Student Name" },
    {
      key: "verifiedAt",
      title: "Verified At",
      render: (record: Attendance) =>
        record.verifiedAt
          ? new Date(record.verifiedAt).toLocaleString()
          : "N/A",
    },
    {
      key: "confidence",
      title: "Confidence",
      render: (record: Attendance) =>
        record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : "N/A",
    },
    {
      key: "status",
      title: "Status",
      render: (record: Attendance) => (
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClasses(
              record.status
            )}`}
          >
            {record.status === "PRESENT"
              ? "✅"
              : record.status === "ABSENT"
              ? "❌"
              : "⚠️"}{" "}
            {record.status}
          </span>
          <select
            value={record.status}
            onChange={(e) =>
              handleStatusUpdate(
                record.id,
                e.target.value as Attendance["status"]
              )
            }
            className="text-sm border rounded px-2 py-1"
          >
            <option value="PRESENT">Mark Present</option>
            <option value="ABSENT">Mark Absent</option>
            <option value="SUSPICIOUS">Mark Suspicious</option>
          </select>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Attendance Tracking
        </h1>

        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Classroom
            </label>
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              disabled={!selectedClassroom}
            >
              <option value="">Select a session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title} (
                  {new Date(session.startTime).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSession && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Present</p>
                <p className="text-2xl font-semibold text-green-600">
                  {attendance.filter((a) => a.status === "PRESENT").length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Absent</p>
                <p className="text-2xl font-semibold text-red-600">
                  {attendance.filter((a) => a.status === "ABSENT").length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Suspicious</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {attendance.filter((a) => a.status === "SUSPICIOUS").length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedSession ? (
        <DataTable
          columns={columns}
          data={attendance}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          onPageChange={setPage}
        />
      ) : (
        <div className="text-center text-gray-500 py-8">
          Please select a classroom and session to view attendance
        </div>
      )}
    </div>
  );
};
