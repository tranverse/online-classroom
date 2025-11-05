import React, { useEffect, useState } from "react";
import ClassroomService from "@services/classroom.service";
import StudentService from "@services/student.service";
import { Link } from "react-router-dom";
import { FaChalkboardTeacher } from "react-icons/fa";
import { IoCalendarOutline } from "react-icons/io5";

const StudentDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    // load only sessions that belong to the student's classrooms
    const load = async () => {
      try {
        const classrooms = await StudentService.getClassrooms();
        // classrooms may be an array of { id, name, ... }
        const sessionsPerClass = await Promise.all(
          (classrooms || []).map(async (c: any) => {
            const s = await StudentService.getSessions(c.id);
            return Array.isArray(s)
              ? s.map((ss) => ({ ...ss, classroomId: c.id }))
              : [];
          })
        );
        const flat = sessionsPerClass.flat();
        setSessions(flat || []);
      } catch (e) {
        setSessions([]);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          🎓 Student Dashboard
        </h2>
        <p className="text-gray-600">
          Welcome back! View your upcoming sessions and manage your learning
          schedule.
        </p>
      </div>

      {/* Grid sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="bg-white shadow-md rounded-2xl p-6 hover:shadow-lg transition">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <FaChalkboardTeacher className="text-emerald-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">
              Upcoming Sessions
            </h3>
          </div>

          {sessions.length ? (
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center hover:bg-gray-100 transition"
                >
                  <div>
                    <div className="font-medium text-gray-800 text-lg">
                      {s.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      Teacher: {s.teacher || "TBA"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {s.start ? `Start: ${s.start}` : "Schedule N/A"}
                    </div>
                  </div>
                  <Link
                    to={`/classroom/online/${s.id}`}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 hover:shadow-md transition font-medium"
                  >
                    Join
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500 text-center py-8 border border-dashed rounded-lg">
              No upcoming sessions found.
            </div>
          )}
        </div>

        {/* Calendar Section */}
        <div className="bg-white shadow-md rounded-2xl p-6 hover:shadow-lg transition">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <IoCalendarOutline className="text-blue-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">My Calendar</h3>
          </div>

          <p className="text-sm text-gray-500 mb-3">
            Simple view of your scheduled sessions. Calendar visualization can
            be added later.
          </p>

          <ul className="space-y-3">
            {sessions.length ? (
              sessions.map((s) => (
                <li
                  key={s.id}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition"
                >
                  <div className="font-medium text-gray-800">{s.title}</div>
                  <div className="text-sm text-gray-500">
                    {s.start || "Date not set"}
                  </div>
                </li>
              ))
            ) : (
              <div className="text-gray-500 text-center py-8 border border-dashed rounded-lg">
                No calendar items yet.
              </div>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
