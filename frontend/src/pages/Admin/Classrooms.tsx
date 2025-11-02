import React, { useState, useEffect } from "react";
import { Classroom, User } from "../../types/admin";
import { AdminService } from "../../services/admin.service";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";

interface ClassroomFormData {
  name: string;
  teacherId: string;
}

const ClassroomForm: React.FC<{
  onSubmit: (data: ClassroomFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ClassroomFormData>;
  teachers: User[];
}> = ({ onSubmit, onCancel, initialData, teachers }) => {
  const [formData, setFormData] = useState<ClassroomFormData>({
    name: initialData?.name || "",
    teacherId: initialData?.teacherId || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Teacher
        </label>
        <select
          value={formData.teacherId}
          onChange={(e) =>
            setFormData({ ...formData, teacherId: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        >
          <option value="">Select a teacher</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </form>
  );
};

const StudentInviteForm: React.FC<{
  onSubmit: (emails: string[]) => Promise<void>;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [emails, setEmails] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailList = emails
      .split("\n")
      .map((email) => email.trim())
      .filter(Boolean);
    await onSubmit(emailList);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Student Emails (one per line)
        </label>
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={5}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="student1@example.com&#10;student2@example.com"
          required
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Invite Students
        </button>
      </div>
    </form>
  );
};

export const ClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(
    null
  );
  const pageSize = 10;

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const response = await AdminService.getClassrooms(page, pageSize);
      setClassrooms(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch classrooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await AdminService.getUsers(1, 100); // Fetch up to 100 teachers
      setTeachers(response.data.filter((user) => user.role === "TEACHER"));
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    }
  };

  useEffect(() => {
    fetchClassrooms();
    fetchTeachers();
  }, [page]);

  const handleCreateClassroom = async (data: ClassroomFormData) => {
    try {
      await AdminService.createClassroom({
        name: data.name,
        teacher: teachers.find((t) => t.id === data.teacherId)!,
        status: "ACTIVE",
      });
      setModalOpen(false);
      fetchClassrooms();
    } catch (error) {
      console.error("Failed to create classroom:", error);
    }
  };

  const handleUpdateClassroom = async (data: ClassroomFormData) => {
    if (!selectedClassroom) return;
    try {
      await AdminService.updateClassroom(selectedClassroom.id, {
        name: data.name,
        teacher: teachers.find((t) => t.id === data.teacherId)!,
      });
      setModalOpen(false);
      setSelectedClassroom(null);
      fetchClassrooms();
    } catch (error) {
      console.error("Failed to update classroom:", error);
    }
  };

  const handleDeleteClassroom = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this classroom?"))
      return;
    try {
      await AdminService.deleteClassroom(id);
      fetchClassrooms();
    } catch (error) {
      console.error("Failed to delete classroom:", error);
    }
  };

  const handleInviteStudents = async (emails: string[]) => {
    if (!selectedClassroom) return;
    try {
      // Implement student invitation API call here
      console.log("Inviting students:", emails);
      setInviteModalOpen(false);
      setSelectedClassroom(null);
    } catch (error) {
      console.error("Failed to invite students:", error);
    }
  };

  const columns = [
    { key: "name", title: "Name" },
    {
      key: "teacher",
      title: "Teacher",
      render: (classroom: Classroom) => classroom.teacher.name,
    },
    { key: "studentCount", title: "Students" },
    {
      key: "status",
      title: "Status",
      render: (classroom: Classroom) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            classroom.status === "ACTIVE"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {classroom.status}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (classroom: Classroom) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedClassroom(classroom);
              setModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setSelectedClassroom(classroom);
              setInviteModalOpen(true);
            }}
            className="text-green-600 hover:text-green-800"
          >
            Invite
          </button>
          <button
            onClick={() => handleDeleteClassroom(classroom.id)}
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Classrooms</h1>
        <button
          onClick={() => {
            setSelectedClassroom(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Add Classroom
        </button>
      </div>

      <DataTable
        columns={columns}
        data={classrooms}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
      />

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedClassroom(null);
        }}
        title={selectedClassroom ? "Edit Classroom" : "Add Classroom"}
      >
        <ClassroomForm
          onSubmit={
            selectedClassroom ? handleUpdateClassroom : handleCreateClassroom
          }
          onCancel={() => {
            setModalOpen(false);
            setSelectedClassroom(null);
          }}
          initialData={
            selectedClassroom
              ? {
                  name: selectedClassroom.name,
                  teacherId: selectedClassroom.teacher.id,
                }
              : undefined
          }
          teachers={teachers}
        />
      </Modal>

      <Modal
        open={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setSelectedClassroom(null);
        }}
        title="Invite Students"
      >
        <StudentInviteForm
          onSubmit={handleInviteStudents}
          onCancel={() => {
            setInviteModalOpen(false);
            setSelectedClassroom(null);
          }}
        />
      </Modal>
    </div>
  );
};
