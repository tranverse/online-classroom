import React, { useState, useEffect } from "react";
import { FiEdit, FiTrash2, FiUserPlus } from "react-icons/fi";
import { User } from "../../types/admin";
import { AdminService } from "../../services/admin.service";
import { DataTable } from "../../components/DataTable";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ✅ ErrorBoundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error("ErrorBoundary caught an error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h4 className="text-red-700 font-semibold mb-2">Rendering error</h4>
          <pre className="text-sm text-red-600">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ✅ UserForm
interface UserFormData {
  name: string;
  email: string;
  phone: string;
  role: User["role"];
  status: User["status"];
}

const UserForm: React.FC<{
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<UserFormData>;
}> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState<UserFormData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    role: initialData?.role || "STUDENT",
    status: initialData?.status || "ACTIVE",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormData, string>>
  >({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneClean = formData.phone.replace(/\D/g, "");
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};
    if (!/^[0-9]{10,15}$/.test(phoneClean)) {
      newErrors.phone = "Phone must be 10 to 15 digits";
    }
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix validation errors");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ ...formData, phone: phoneClean });
      toast.success("User saved successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-200 sm:text-sm p-2"
        />
        {errors.name && (
          <p className="text-xs text-red-600 mt-1">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-200 sm:text-sm p-2"
        />
        {errors.email && (
          <p className="text-xs text-red-600 mt-1">{errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            if (value.length <= 10) {
              setFormData({ ...formData, phone: value });
            }
          }}
          className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-200 sm:text-sm p-2"
          placeholder="Digits only, max 10 characters"
        />
        {errors.phone && (
          <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Role</label>
        <select
          value={formData.role}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value as User["role"] })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
        >
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
    </form>
  );
};

// ✅ Modal
const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100 bg-opacity-60">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="mb-4">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
        <div className="mt-4 border-t pt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const form = document.querySelector(
                "#user-form"
              ) as HTMLFormElement | null;
              if (form) form.requestSubmit();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ✅ UsersPage
export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState<"ALL" | "TEACHER" | "STUDENT">(
    "ALL"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const pageSize = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (roleFilter !== "ALL") {
        const resp = await AdminService.getUsers(1, 200);
        const all = resp.data || [];
        const filtered = all.filter(
          (u) => u.role === (roleFilter === "TEACHER" ? "TEACHER" : "STUDENT")
        );
        setUsers(filtered);
        setTotal(filtered.length);
      } else {
        const response = await AdminService.getUsers(page, pageSize);
        setUsers(response.data || []);
        setTotal(response.total || 0);
      }
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleCreateUser = async (data: UserFormData) => {
    try {
      await AdminService.createUser(data);
      setModalOpen(false);
      fetchUsers();
    } catch {
      toast.error("❌ Failed to create user");
    }
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!editingUser) return;
    try {
      await AdminService.updateUser(editingUser.id, data);
      setModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch {
      toast.error("❌ Failed to update user");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await AdminService.deleteUser(id);
      fetchUsers();
      toast.success("🗑️ User deleted");
    } catch {
      toast.error("❌ Failed to delete user");
    }
  };

  const columns = [
    { key: "name", title: "Name" },
    { key: "email", title: "Email" },
    { key: "role", title: "Role" },
    {
      key: "actions",
      title: "Actions",
      render: (user: User) => (
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setEditingUser(user);
              setModalOpen(true);
            }}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all"
            title="Edit"
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteUser(user.id)}
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-105 transition-all"
            title="Delete"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all"
        >
          <FiUserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Role filter */}
      <div className="mb-4 flex gap-2">
        {(["ALL", "TEACHER", "STUDENT"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
              roleFilter === r
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {r === "ALL" ? "All" : r === "TEACHER" ? "Teachers" : "Students"}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={users}
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
          setEditingUser(null);
        }}
        title={editingUser ? "Edit User" : "Add User"}
      >
        <ErrorBoundary>
          <UserForm
            onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
            onCancel={() => {
              setModalOpen(false);
              setEditingUser(null);
            }}
            initialData={editingUser || undefined}
          />
        </ErrorBoundary>
      </Modal>

      <ToastContainer position="top-right" autoClose={2000} theme="colored" />
    </div>
  );
};
