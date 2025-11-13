import React, { useEffect, useState } from "react";
import TeacherService from "../../services/teacher.service";
import ClassroomService from "../../services/classroom.service";
import { Link } from "react-router-dom";
import authMemory from "@services/authMemory";

const TeacherClassrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadClassrooms = async () => {
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

        const currentUser = authMemory.getUser() || null;
        const userId = currentUser?.id || currentUser?.userId || null;

        // Lọc classroom của teacher hiện tại
        const teacherClassrooms = (cls || []).filter((c: any) => {
          return (
            c.teacherId === userId ||
            (c.teacher &&
              (c.teacher.id === userId || c.teacher.userId === userId)) ||
            c.ownerId === userId
          );
        });

        if (mounted) setClassrooms(teacherClassrooms || []);
      } catch (err) {
        if (mounted) setClassrooms([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadClassrooms();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="w-full h-full flex justify-center items-start p-6 bg-gray-50">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            My Classrooms
          </h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            Manage your classrooms
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

        {!loading && classrooms.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl shadow overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-600 font-medium">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-gray-600 font-medium">
                    Quantity
                  </th>
                  <th className="text-left px-6 py-3 text-gray-600 font-medium">
                    Dates
                  </th>
                  <th className="text-left px-6 py-3 text-gray-600 font-medium">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-gray-600 font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {classrooms.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b hover:bg-gray-50 transition-all"
                  >
                    <td className="px-6 py-4 text-gray-800">{c.name}</td>
                    <td className="px-6 py-4 text-gray-800">{c.quantity}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {c.startDate
                        ? new Date(c.startDate).toLocaleDateString("en-GB")
                        : "-"}{" "}
                      -{" "}
                      {c.endDate
                        ? new Date(c.endDate).toLocaleDateString("en-GB")
                        : "-"}
                    </td>

                    <td className="px-6 py-4 text-gray-500">{c.status}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/teacher/classrooms/${c.id}`}
                        className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 transition-all"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherClassrooms;
