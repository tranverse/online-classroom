import React, { useEffect, useState } from "react";
import StudentService from "../../services/student.service";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";

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

const ClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    StudentService.getClassrooms().then((d: any) => {
      setClassrooms(d || []);
      setLoading(false);
    });
  }, []);

  const columns = [
    { key: "name", title: "Name" },
    {
      key: "teacher",
      title: "Teacher",
      render: (r: any) => r.teacher?.name || "-",
    },
    { key: "studentCount", title: "Members" },
    { key: "joinedAt", title: "Joined At" },
    {
      key: "actions",
      title: "Actions",
      render: (r: any) => (
        <a href={`/student/classrooms/${r.id}`} className="text-blue-600">
          View details
        </a>
      ),
    },
  ];

  const handleJoin = async (code: string) => {
    await StudentService.joinByCode(code);
    setJoinOpen(false);
    // refresh
    const d: any = await StudentService.getClassrooms();
    setClassrooms(d || []);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">My Classes</h1>
        <div>
          <button
            onClick={() => setJoinOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Join Class
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={classrooms}
        loading={loading}
        page={1}
        pageSize={10}
        total={classrooms.length}
        onPageChange={() => {}}
      />

      <JoinModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoin={handleJoin}
      />
    </div>
  );
};

export default ClassroomsPage;
