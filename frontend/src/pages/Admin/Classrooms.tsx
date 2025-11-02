import React, { useState, useEffect } from "react";
import { Classroom, User } from "../../types/admin";
import { AdminService } from "../../services/admin.service";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

interface ClassroomFormData {
  name: string;
  quantity: number;
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
    quantity: initialData?.quantity ?? 1,
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

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Quantity
        </label>
        <input
          type="number"
          min={1}
          value={formData.quantity}
          onChange={(e) =>
            setFormData({ ...formData, quantity: Number(e.target.value) })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        />
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
interface UserInviteFormProps {
  classroomId: string;
  users: User[];
  onSuccess: () => void;
  onCancel: () => void;
}
export const UserInviteForm: React.FC<UserInviteFormProps> = ({
  classroomId,
  users,
  onSuccess,
  onCancel,
}) => {
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredUsers = users.filter((u) => u.role === role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast.warning("Please select at least one user!");
      return;
    }

    setLoading(true);
    try {
      if (role === "STUDENT") {
        for (const userId of selectedIds) {
          await AdminService.addStudentToClassroom({
            classroom: { id: classroomId },
            student: { id: userId },
            enrollDate: new Date().toISOString().split("T")[0],
          });
        }
      } else {
        const teacherId = selectedIds[0];
        await AdminService.updateClassroom(classroomId, {
          teacher: { id: teacherId },
        } as any);
      }

      toast.success("User(s) invited successfully!");
      onSuccess();
    } catch (err) {
      console.error("Invite failed", err);
      toast.error("Failed to invite users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
    >
      {/* Role Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Invite as
        </label>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as "STUDENT" | "TEACHER");
            setSelectedIds([]);
          }}
          className="block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
        >
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
        </select>
      </div>

      {/* User Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select users
        </label>
        {filteredUsers.length > 0 ? (
          <select
            multiple
            value={selectedIds}
            onChange={(e) =>
              setSelectedIds(
                Array.from(e.target.selectedOptions, (opt) => opt.value)
              )
            }
            className="block w-full rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm h-44 px-2 py-2"
          >
            {filteredUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-gray-500 italic mt-1">
            No users found for this role.
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Hold <b>Ctrl</b> (Windows) or <b>Command</b> (Mac) to select multiple
          users.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60"
        >
          {loading && (
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {loading ? "Inviting..." : "Invite Users"}
        </button>
      </div>
    </form>
  );
};

export const ClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(
    null
  );
  // details view moved to a dedicated page: /admin/classrooms/:id
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
  console.log("classrooms", classrooms);
  const fetchUsers = async () => {
    try {
      const response = await AdminService.getUsers(1, 200); // Fetch up to 200 users
      const all = response.data || [];
      setUsers(all);
      setTeachers(all.filter((user: User) => user.role === "TEACHER"));
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    fetchClassrooms();
    fetchUsers();
  }, [page]);

  const handleCreateClassroom = async (data: ClassroomFormData) => {
    try {
      await AdminService.createClassroom({
        name: data.name,
        teacher: teachers.find((t) => t.id === data.teacherId)!,
        quantity: data.quantity,
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
        quantity: data.quantity,
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
          <Link
            to={`/admin/classrooms/${classroom.id}`}
            className="text-gray-600 hover:text-gray-800"
          >
            View
          </Link>
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
            onClick={() => handleOpenInvite(classroom)}
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
  const handleOpenInvite = (classroom: Classroom) => {
    if (!classroom?.id) {
      toast.error("Invalid classroom data. Please refresh and try again.");
      return;
    }
    console.log("Opening invite for classroom:", classroom.id);
    setSelectedClassroom(classroom);
    setInviteModalOpen(true);
  };

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
          console.debug("Modal close called (classroom)");
          setModalOpen(false);
          setSelectedClassroom(null);
        }}
        title={selectedClassroom ? "Edit Classroom" : "Add Classroom"}
      >
        <ErrorBoundary>
          <div className="mb-2 text-xs text-gray-400">
            {modalOpen ? "Modal open" : ""}
          </div>
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
        </ErrorBoundary>
      </Modal>
      <Modal
        open={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setSelectedClassroom(null);
        }}
        title={
          selectedClassroom
            ? `Invite Users to "${selectedClassroom.name}"`
            : "Invite Users"
        }
      >
        {!selectedClassroom ? (
          <p className="text-gray-500 text-sm">No classroom selected.</p>
        ) : (
          <UserInviteForm
            classroomId={selectedClassroom.id}
            users={users}
            onSuccess={() => {
              toast.success("Users invited successfully!");
              setInviteModalOpen(false);
              setSelectedClassroom(null);
              fetchClassrooms();
            }}
            onCancel={() => {
              setInviteModalOpen(false);
              setSelectedClassroom(null);
            }}
          />
        )}
      </Modal>
      {/* Classroom details moved to its own page: /admin/classrooms/:id */}
    </div>
  );
};

// details view moved to dedicated page component
