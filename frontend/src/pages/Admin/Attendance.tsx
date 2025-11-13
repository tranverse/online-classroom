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
  console.log(attendance);
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
    { key: "studentName", title: "Student Name" },
    {
      key: "attendanceTime",
      title: "Attendance Time",
      render: (record: Attendance) =>
        record.attendanceTime
          ? new Date(record.attendanceTime).toLocaleString()
          : "N/A",
    },
    {
      key: "isPassed",
      title: "AI Verified",
      render: (record: Attendance) =>
        record.isPassed ? (
          <span className="text-green-600 font-medium">✔ Passed</span>
        ) : (
          <span className="text-red-600 font-medium">✖ Failed</span>
        ),
    },
    {
      key: "note",
      title: "AI Info",
      render: (record: Attendance) => {
        const info = record.note
          ?.split(";")
          .filter(
            (s) => s.includes("similarity") || s.includes("livenessScore")
          )
          .map((s) => s.split("="))
          .map(([k, v]) => ({ key: k, val: parseFloat(v).toFixed(2) }));
        return info?.length ? (
          <div className="text-xs text-gray-700">
            {info.map((i) => (
              <div key={i.key}>
                <strong>{i.key}</strong>: {i.val}
              </div>
            ))}
          </div>
        ) : (
          "-"
        );
      },
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

<div className="flex flex-col md:flex-row gap-6 mb-6">
  {/* Classroom Dropdown */}
  <div className="flex-1">
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      Select Classroom
    </label>
    <select
      value={selectedClassroom}
      onChange={(e) => setSelectedClassroom(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition sm:text-sm"
    >
      <option value="">Select a classroom</option>
      {classrooms.map((classroom) => (
        <option key={classroom.id} value={classroom.id}>
          {classroom.name}
        </option>
      ))}
    </select>
  </div>

  {/* Session Dropdown */}
  <div className="flex-1">
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      Select Session
    </label>
    <select
      value={selectedSession}
      onChange={(e) => setSelectedSession(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
      disabled={!selectedClassroom}
    >
      <option value="">Select a session</option>
      {sessions.map((session) => (
        <option key={session.id} value={session.id}>
          {session.title} ({new Date(session.startTime).toLocaleDateString("en-GB")})
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
