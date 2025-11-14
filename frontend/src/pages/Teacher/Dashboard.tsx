import React, { useEffect, useState } from "react";
import TeacherService from "../../services/teacher.service";
import ClassroomService from "../../services/classroom.service";
import authMemory from "@services/authMemory";
import { Link } from "react-router-dom";
import {
  FaChalkboardTeacher,
  FaClock,
  FaDoorOpen,
  FaUserGraduate,
} from "react-icons/fa";
import { addMinutes, differenceInMinutes, parseISO } from "date-fns";

const TeacherDashboard: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        let cls: any[] = [];
        try {
          const resp = await TeacherService.getTeacherClasses();
          cls = resp?.data || resp || [];
        } catch (e) {
          const resp = await ClassroomService.getClassrooms();
          cls = resp?.data || resp || [];
        }

        let sessions: any[] = [];
        try {
          const perClassSessions = await Promise.all(
            (cls || []).map(async (c: any) => {
              try {
                const r = await TeacherService.getUpcomingSessions(c.id);
                return r?.data || r || [];
              } catch (e) {
                return c.sessions || c.upcomingSessions || [];
              }
            })
          );
          sessions = perClassSessions.flat();
        } catch (e) {
          sessions = [];
        }

        const currentUser = authMemory.getUser() || null;
        const userId = currentUser?.id || currentUser?.userId || null;

        const teacherClassrooms = (cls || []).filter((c: any) => {
          return (
            c.teacherId === userId ||
            (c.teacher &&
              (c.teacher.id === userId || c.teacher.userId === userId)) ||
            c.ownerId === userId
          );
        });

        const enriched = (teacherClassrooms || []).map((c: any) => ({
          ...c,
          upcomingSessions: (sessions || []).filter((s: any) => {
            const sessionClassroomId =
              s.classroomId ||
              (s.classroom && (s.classroom.id || s.classroom._id));
            return sessionClassroomId === c.id || sessionClassroomId === c._id;
          }),
        }));

        if (mounted) setClassrooms(enriched || []);
      } catch (e) {
        // ignore errors
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdateSessionStatus = async (classSessionId: string) => {
    let cls: any[] = [];
    try {
      const resp = await TeacherService.updateInProgress(classSessionId);
      console.log(resp);
    } catch (e) {}
  };

  return (
    <div className="w-full h-full flex justify-center items-start p-6">
      <div className="w-full max-w-5xl h-full bg-white rounded-2xl border border-gray-200 shadow-lg flex flex-col overflow-hidden">
        {/* Header section */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <FaChalkboardTeacher className="text-emerald-600 text-xl" />
            <h2 className="text-lg font-semibold text-gray-800">
              Upcoming Sessions
            </h2>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="px-6 py-4">
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-gray-100">
            {classrooms.length ? (
              classrooms.map((c) =>
                c.upcomingSessions
                  .filter((s) => s.sessionStatus != "COMPLETED")
                  .map((s: any) => {
                    const start = s.startTime
                      ? new Date(s.startTime).toLocaleString()
                      : "N/A";
                    const end = s.endTime
                      ? new Date(s.endTime).toLocaleString()
                      : "N/A";
                    const teacherName = s.teacher || c?.teacher?.name || "TBA";
                    return (
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
                            {c.name || "Unknown"}
                          </div>
                          <div className="text-gray-600 flex items-center gap-2">
                            <FaUserGraduate className="text-emerald-500" />
                            {teacherName}
                          </div>
                          <div className="text-gray-500 flex items-center gap-2">
                            <FaClock className="text-emerald-500" />
                            Start: {start}
                          </div>
                          <div className="text-gray-500 flex items-center gap-2">
                            <FaClock className="text-emerald-500" />
                            End: {end}
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
                          const isDuringClass =
                            now >= startTime && now <= endTime;

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
                                handleUpdateSessionStatus(s.id);
                              }}
                            >
                              {canJoin ? "Join Now" : "Not Yet"}
                            </Link>
                          );
                        })()}
                      </div>
                    );
                  })
              )
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

export default TeacherDashboard;
