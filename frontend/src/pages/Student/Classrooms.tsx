import React, { useEffect, useState } from "react";
import StudentService from "../../services/student.service";
import { Modal } from "../../components/Modal";
import { FiEye } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";

const JoinModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
}> = ({ open, onClose, onJoin }) => {
  const [code, setCode] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Join Class">
      <div className="space-y-4">
        <p>Enter class invite code to join.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => onJoin(code)}
          >
            Join
          </button>
        </div>
      </div>
    </Modal>
  );
};

const StudentClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  useEffect(() => {
    StudentService.getClassrooms().then((d: any) => {
      setClassrooms(d || []);
      setLoading(false);
    });
  }, []);

  const handleJoin = async (code: string) => {
    await StudentService.joinByCode(code);
    setJoinOpen(false);
    const d: any = await StudentService.getClassrooms();
    setClassrooms(d || []);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">My Classes</h1>
        <button
          onClick={() => setJoinOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
        >
          Join Class
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden mt-4">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold border-b">
                Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold border-b">
                Teacher
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold border-b">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold border-b">
                Start
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold border-b">
                End
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold border-b">
                Status
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold border-b">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading &&
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array(7)
                    .fill(0)
                    .map((_, j) => (
                      <td key={j} className="px-4 py-3 border-b">
                        <div className="h-4 bg-gray-300 rounded w-24"></div>
                      </td>
                    ))}
                </tr>
              ))}

            {!loading && classrooms.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-6 text-gray-500 border-b"
                >
                  No classes found.
                </td>
              </tr>
            )}

            {!loading &&
              classrooms.map((c: any) => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50 transition cursor-pointer"
                >
                  <td className="px-4 py-3 border-b">{c.name}</td>
                  <td className="px-4 py-3 border-b">{c.teacher?.name}</td>
                  <td className="px-4 py-3 border-b">{c.quantity}</td>

                  <td className="px-4 py-3 border-b">
                    {new Date(c.startDate).toLocaleDateString("vi-VN")}
                  </td>

                  <td className="px-4 py-3 border-b">
                    {new Date(c.endDate).toLocaleDateString("vi-VN")}
                  </td>

                  <td className="px-4 py-3 border-b">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium 
                  ${
                    c.status === "DRAFT"
                      ? "bg-yellow-100 text-yellow-700"
                      : c.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }
                `}
                    >
                      {c.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 border-b text-center">
                    <Link to={`/student/classrooms/detail/user/${c.id}`}>
                      <FiEye className="w-5 h-5 text-gray-600 hover:text-black" />
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <JoinModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoin={handleJoin}
      />
    </div>
  );
};

export default StudentClassroomsPage;
