import React, { useEffect, useState } from "react";
import StudentService from "@services/student.service";
import { Link } from "react-router-dom";
import { differenceInMinutes, parseISO } from "date-fns"; // cài date-fns nếu chưa có

import {
  FaChalkboardTeacher,
  FaCalendarAlt,
  FaClock,
  FaUserGraduate,
  FaDoorOpen,
} from "react-icons/fa";

const StudentDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const classrooms = await StudentService.getClassrooms();
        const sessionsPerClass = await Promise.all(
          (classrooms || []).map(async (c: any) => {
            const s = await StudentService.getUpcomingSessions(c.id);
            if (!Array.isArray(s)) return [];
            return s.map((ss: any) => {
              const startRaw =
                ss.startTime || ss.start || ss.start_date || null;
              const endRaw = ss.endTime || ss.end || null;
              const start = startRaw
                ? new Date(startRaw).toLocaleString()
                : null;
              const end = endRaw ? new Date(endRaw).toLocaleString() : null;
              const teacherName = ss.teacher || c?.teacher?.name || "TBA";
              return {
                ...ss,
                classroomId: c.id,
                classroom: c,
                start,
                end,
                teacher: teacherName,
              };
            });
          })
        );
        setSessions(sessionsPerClass.flat() || []);
      } catch {
        setSessions([]);
      }
    };
    load();
  }, []);
  console.log(sessions);
  return (
    <div className="w-full  h-full flex justify-center items-start p-6">
      <div className="w-full max-w-5xl h-full bg-white rounded-2xl border border-gray-200 shadow-lg flex flex-col overflow-hidden">
        {/* Header section */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <FaChalkboardTeacher className="text-emerald-600 text-xl" />
            <h2 className="text-lg font-semibold text-gray-800">
              Upcoming Sessions
            </h2>
          </div>
          <FaCalendarAlt className="text-gray-400 text-lg" />
        </div>

        {/* Scrollable content */}
        {/* Scrollable content */}
        <div className="px-6 py-4">
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-gray-100">
            {sessions.length ? (
              sessions
                .filter((s) => s.sessionStatus != "COMPLETED")
                .map((s) => (
                  <div
                    key={s.id}
                    className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-emerald-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex flex-col space-y-1 text-sm">
                      <div className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <FaChalkboardTeacher className="text-emerald-600" />
                        {s.title}
                      </div>
                      <div className="text-gray-600 flex items-center gap-2">
                        <FaDoorOpen className="text-emerald-500" />
                        {s.classroom?.name || "Unknown"}
                      </div>
                      <div className="text-gray-600 flex items-center gap-2">
                        <FaUserGraduate className="text-emerald-500" />
                        {s.teacher || "TBA"}
                      </div>
                      <div className="text-gray-500 flex items-center gap-2">
                        <FaClock className="text-emerald-500" />
                        {s.start ? `Start: ${s.start}` : "N/A"}
                      </div>
                      <div className="text-gray-500 flex items-center gap-2">
                        <FaClock className="text-emerald-500" />
                        {s.end ? `End: ${s.end}` : "N/A"}
                      </div>
                    </div>

                    {(() => {
                      const now = new Date();

                      // Dùng ISO string từ backend
                      const startTime = s.startTime
                        ? new Date(s.startTime)
                        : null;
                      const endTime = s.endTime
                        ? new Date(s.endTime)
                        : addMinutes(startTime, 90);

                      const diffStart = differenceInMinutes(startTime, now);

                      const isBeforeAndNearStart =
                        diffStart <= 10 && diffStart >= 0;
                      const isDuringClass = now >= startTime && now <= endTime;

                      const canJoin = isBeforeAndNearStart || isDuringClass;

                      return (
                        <Link
                          to={canJoin ? `/classroom/online/${s.id}` : "#"}
                          className={`mt-3 md:mt-0 px-5 py-2 text-sm rounded-lg shadow transition-all ${
                            canJoin
                              ? "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                          onClick={(e) => {
                            if (!canJoin) e.preventDefault();
                          }}
                        >
                          {canJoin ? "Join Now" : "Not Yet"}
                        </Link>
                      );
                    })()}
                  </div>
                ))
            ) : (
              <div className="text-gray-500 text-center py-10 border border-dashed border-gray-300 rounded-xl bg-gray-50 text-sm">
                No upcoming sessions found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
