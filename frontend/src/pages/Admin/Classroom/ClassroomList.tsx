import React, { useEffect, useState } from "react";
import ClassroomService from "@services/classroom.service";
import { toast } from "react-toastify";
import { FiTrash2, FiSearch } from "react-icons/fi";

const ClassroomList: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const response = await ClassroomService.getClassrooms();
    setLoading(false);
    if (response?.success) {
      setClassrooms(response.data || []);
    } else {
      toast.error(response?.message || "Failed to load classrooms");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this classroom?")) return;
    const res = await ClassroomService.deleteClassroom(id);
    if (res?.success) {
      toast.success(res.message || "Deleted");
      setClassrooms((c) => c.filter((x) => x.id !== id));
    } else {
      toast.error(res?.message || "Delete failed");
    }
  };

  const filtered = classrooms.filter((c) =>
    (c.name || "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Classrooms</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded px-2 py-1">
            <FiSearch />
            <input
              className="ml-2 outline-none"
              placeholder="Search by name"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Name</th>
              <th className="py-2">Quantity</th>
              <th className="py-2">Teacher</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2">{c.quantity}</td>
                  <td className="py-2">{c.teacher?.name || "-"}</td>
                  <td className="py-2">
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                      <a
                        className="text-blue-600 hover:underline"
                        href={`/admin/create-class-session?classroomId=${c.id}`}
                      >
                        Create Session
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-4 text-center">
                  No classrooms
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClassroomList;
