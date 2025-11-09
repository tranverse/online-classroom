import React, { useEffect, useState } from "react";
import TeacherService from "../../services/teacher.service";
import ClassroomService from "../../services/classroom.service";
import { Link } from "react-router-dom";
import authMemory from "@services/authMemory";

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
                const r = await TeacherService.getClassSessions(c.id);
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

  return (
    <div className="w-full h-screen flex flex-col items-center bg-gradient-to-br from-emerald-50 to-white p-6">
      <header className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
          Teacher Dashboard
        </h1>
        <p className="text-gray-500 mt-1 text-sm md:text-base">
          View and manage your classrooms and upcoming sessions
        </p>
      </header>

      {loading && (
        <div className="text-gray-500 text-center py-10">
          Loading classrooms...
        </div>
      )}

      {!loading && classrooms.length === 0 && (
        <div className="text-gray-400 text-center py-10">
          No classrooms found
        </div>
      )}

      <div className="w-full max-w-6xl flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-gray-100">
        {classrooms.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6 flex flex-col"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {c.name}
                </h2>
                <p className="text-sm text-gray-500">{c.code}</p>
              </div>
              <Link
                to={`/student/classrooms/${c.id}`}
                className="text-blue-600 text-sm font-medium hover:underline"
              >
                Open
              </Link>
            </div>

            {c.upcomingSessions && c.upcomingSessions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-gray-700 font-medium mb-2">
                  Upcoming Sessions
                </h3>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {c.upcomingSessions.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2 hover:bg-emerald-50 transition"
                    >
                      <span className="text-gray-700 text-sm">
                        {s.title || s.startsAt}
                      </span>
                      <Link
                        to={`/classroom/online/${s.id}`}
                        className="text-blue-600 text-sm font-medium hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherDashboard;
