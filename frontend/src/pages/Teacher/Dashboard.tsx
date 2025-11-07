import React, { useEffect, useState } from "react";
import StudentService from "../../services/student.service";
import ClassroomService from "../../services/classroom.service";
import ClassSessionService from "../../services/classSession.service";
import TeacherService from "../../services/teacher.service";
import { Link } from "react-router-dom";

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

        const rawUser = localStorage.getItem("user");
        const currentUser = rawUser ? JSON.parse(rawUser) : null;
        const userId = currentUser?.id || currentUser?.userId || null;

        const teacherClassrooms = (cls || []).filter((c: any) => {
          return (
            c.teacherId === userId ||
            (c.teacher && (c.teacher.id === userId || c.teacher.userId === userId)) ||
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Teacher Dashboard</h1>

      {loading && (
        <div className="text-center py-10 text-gray-500">Loading classrooms...</div>
      )}

      {!loading && classrooms.length === 0 && (
        <div className="text-center py-10 text-gray-400">No classrooms found</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{c.name}</h2>
                  <p className="text-sm text-gray-500">{c.code}</p>
                </div>
                <Link
                  to={`/classroom/${c.id}`}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  Open
                </Link>
              </div>

              {c.upcomingSessions && c.upcomingSessions.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700">Upcoming Sessions</h3>
                  <ul className="mt-2 space-y-2">
                    {c.upcomingSessions.map((s: any) => (
                      <li
                        key={s.id}
                        className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded hover:bg-gray-200 transition-colors"
                      >
                        <span className="text-sm text-gray-700">
                          {s.title || s.startsAt}
                        </span>
                        <Link
                          to={`/classroom/online/${s.id}`}
                          className="text-blue-600 text-sm font-medium hover:underline"
                        >
                          Open
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherDashboard;
