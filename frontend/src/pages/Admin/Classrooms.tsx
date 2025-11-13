import React, { useState, useEffect } from "react";
import { Classroom, User } from "../../types/admin";
import { AdminService } from "../../services/admin.service";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { FiEdit, FiEye, FiTrash2, FiUserPlus } from "react-icons/fi";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
}) => {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 mb-6">{description}</p>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
          }}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
        >
          Delete
        </button>
      </div>
    </Modal>
  );
};

interface ClassroomFormData {
  name: string;
  quantity: number;
  teacherId: string;
  startDate: Date;
  endDate: Date;
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
    startDate: initialData?.startDate || new Date().toISOString().split("T")[0],
    endDate: initialData?.endDate || new Date().toISOString().split("T")[0],
  });

  const [errors, setErrors] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};
    const today = new Date().toISOString().split("T")[0];

    if (formData.startDate < today) {
      newErrors.startDate = "Start date cannot be in the past.";
    }
    if (formData.endDate < formData.startDate) {
      newErrors.endDate = "End date must be after start date.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    await onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-xl mx-auto"
    >
      {/* Tiêu đề */}
      <h2 className="text-2xl font-semibold text-gray-800 border-b pb-3 mb-4">
        {initialData ? "Edit Classroom" : "Create New Classroom"}
      </h2>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Classroom Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter classroom name"
          className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5"
          required
        />
      </div>

      {/* Teacher */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Teacher
        </label>
        <select
          value={formData.teacherId}
          onChange={(e) =>
            setFormData({ ...formData, teacherId: e.target.value })
          }
          className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5"
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

      {/* Start & End Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
            className={`mt-1 block w-full rounded-xl border ${
              errors.startDate ? "border-red-400" : "border-gray-300"
            } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5`}
            required
          />
          {errors.startDate && (
            <p className="text-xs text-red-600 mt-1">{errors.startDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            min={formData.startDate}
            value={formData.endDate}
            onChange={(e) =>
              setFormData({ ...formData, endDate: e.target.value })
            }
            className={`mt-1 block w-full rounded-xl border ${
              errors.endDate ? "border-red-400" : "border-gray-300"
            } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5`}
            required
          />
          {errors.endDate && (
            <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantity
        </label>
        <input
          type="number"
          min={1}
          value={formData.quantity}
          onChange={(e) =>
            setFormData({ ...formData, quantity: Number(e.target.value) })
          }
          className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5"
          required
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-3 pt-5 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition"
        >
          Save
        </button>
      </div>
    </form>
  );
};

export default ClassroomForm;

interface UserInviteFormProps {
  classroomId: string;
  users: User[];
  selectedClassroom: Classroom; // <-- thêm
  onSuccess: () => void;
  onCancel: () => void;
}

export const UserInviteForm: React.FC<UserInviteFormProps> = ({
  classroomId,
  users,
  onSuccess,
  onCancel,
  selectedClassroom,
}) => {
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!selectedClassroom.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const resp = await AdminService.getClassroomDetails(
          selectedClassroom.id
        );
        setData(resp.data);
      } catch (err) {
        console.error("Failed to load classroom details", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedClassroom.id]);
  console.log("selectedClassroom", data);
  // Lấy tất cả user đã có trong lớp
  const existingUserIds = new Set([
    ...(data?.students?.map((s) => s.student.id) || []),
    selectedClassroom?.teacher?.id,
  ]);

  // Chỉ lọc user chưa có trong lớp và đúng role
  const filteredUsers = users.filter(
    (u) => u.role === role && !existingUserIds.has(u.id)
  );

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

      onSuccess();
    } catch (err) {
      console.error("Invite failed", err);
      toast.error(err.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-gray-200"
    >
      {/* Role Selector */}
      <div className="flex flex-col">
        <label className="text-sm font-semibold text-gray-700 mb-2">
          Invite as
        </label>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as "STUDENT" | "TEACHER");
            setSelectedIds([]);
          }}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition"
        >
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
        </select>
      </div>

      {/* User Selector */}
      <div className="flex flex-col">
        <label className="text-sm font-semibold text-gray-700 mb-2">
          Select Users
        </label>

        {filteredUsers.length > 0 ? (
          <div className="border border-gray-300 rounded-lg h-48 overflow-y-auto shadow-sm">
            {filteredUsers.map((u) => (
              <label
                key={u.id}
                className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-blue-50 transition ${
                  selectedIds.includes(u.id) ? "bg-blue-100" : ""
                }`}
              >
                <span className="text-sm text-gray-700">
                  {u.name} <span className="text-gray-400">({u.email})</span>
                </span>
                <input
                  type="checkbox"
                  value={u.id}
                  checked={selectedIds.includes(u.id)}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedIds((prev) =>
                      prev.includes(id)
                        ? prev.filter((i) => i !== id)
                        : [...prev, id]
                    );
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic mt-1">
            No users found for this role.
          </p>
        )}

        <p className="text-xs text-gray-400 mt-1">
          Select multiple users by clicking the checkboxes.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading && (
            <svg
              className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
      const paginated = response || {
        data: [],
        total: 0,
        page: 1,
        pageSize: 200,
      };
      const all = paginated.data || [];
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

  // ✅ Create Classroom
  const handleCreateClassroom = async (data: ClassroomFormData) => {
    try {
      await AdminService.createClassroom({
        name: data.name,
        teacher: teachers.find((t) => t.id === data.teacherId)!,
        quantity: data.quantity,
        status: "ACTIVE",
        startDate: data.startDate,
        endDate: data.endDate,
      });
      toast.success("Classroom created successfully!");
      setModalOpen(false);
      fetchClassrooms();
    } catch (error) {
      console.error("Failed to create classroom:", error);
      toast.error("Failed to create classroom. Please try again.");
    }
  };

  // ✅ Update Classroom
  const handleUpdateClassroom = async (data: ClassroomFormData) => {
    if (!selectedClassroom) return;
    try {
      await AdminService.updateClassroom(selectedClassroom.id, {
        name: data.name,
        teacher: teachers.find((t) => t.id === data.teacherId)!,
        quantity: data.quantity,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      toast.success("Classroom updated successfully!");
      setModalOpen(false);
      setSelectedClassroom(null);
      fetchClassrooms();
    } catch (error) {
      console.error("Failed to update classroom:", error);
      toast.error("Failed to update classroom. Please try again.");
    }
  };
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(
    null
  );

  const handleOpenDelete = (classroom: Classroom) => {
    setClassroomToDelete(classroom);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!classroomToDelete) return;
    try {
      await AdminService.deleteClassroom(classroomToDelete.id);
      toast.success("Classroom deleted successfully!");
      fetchClassrooms();
    } catch (error) {
      toast.error("Failed to delete classroom. Please try again.");
    } finally {
      setDeleteModalOpen(false);
      setClassroomToDelete(null);
    }
  };

  // ✅ Delete Classroom
  const handleDeleteClassroom = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this classroom?"))
      return;
    try {
      await AdminService.deleteClassroom(id);
      toast.success("Classroom deleted successfully!");
      fetchClassrooms();
    } catch (error) {
      console.error("Failed to delete classroom:", error);
      toast.error("Failed to delete classroom. Please try again.");
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
    { key: "quantity", title: "Quantity" },
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
            <FiEye className="w-4 h-4" />
          </Link>
          <button
            onClick={() => {
              setSelectedClassroom(classroom);
              setModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenInvite(classroom)}
            className="text-green-600 hover:text-green-800"
          >
            <FiUserPlus className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleOpenDelete(classroom)}
            className="text-red-600 hover:text-red-800"
          >
            <FiTrash2 className="w-4 h-4" />
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
            selectedClassroom={selectedClassroom} // <-- thêm
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
      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Classroom"
        description={`Are you sure you want to delete "${classroomToDelete?.name}"? This action cannot be undone.`}
      />

      <ToastContainer position="top-right" autoClose={2000} theme="colored" />
    </div>
  );
};

// details view moved to dedicated page component
