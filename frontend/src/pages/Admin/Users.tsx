import React, { useState, useEffect } from "react";

// Small ErrorBoundary to surface rendering errors inside modal dialogs
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
    // eslint-disable-next-line no-console
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

// Simple toast component (local, minimal)
const Toast: React.FC<{ message: string; type?: "success" | "error" }> = ({
  message,
  type = "success",
}) => {
  if (!message) return null;
  return (
    <div
      className={`fixed right-6 top-6 z-50 px-4 py-2 rounded-md shadow-md text-sm ${
        type === "success"
          ? "bg-green-50 text-green-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      {message}
    </div>
  );
};
import { User } from "../../types/admin";
import { AdminService } from "../../services/admin.service";
import { DataTable } from "../../components/DataTable";

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
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}> = ({ onSubmit, onCancel, initialData, onSuccess, onError }) => {
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
    // validate phone: digits only, length 10-15
    const phoneClean = formData.phone.replace(/\D/g, "");
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};
    if (!/^[0-9]{10,15}$/.test(phoneClean)) {
      newErrors.phone = "Phone must be 10 to 15 digits";
    }
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      onError?.("Please fix form validation errors");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ ...formData, phone: phoneClean });
      onSuccess?.("User saved successfully");
    } catch (err: any) {
      onError?.(err?.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-xl border-gray-200 shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm p-2"
          required
        />
        {errors.name && (
          <p className="text-xs text-red-600 mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-xl border-gray-200 shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm p-2"
          required
        />
        {errors.email && (
          <p className="text-xs text-red-600 mt-1">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="mt-1 block w-full rounded-xl border-gray-200 shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm p-2"
          placeholder="Digits only, 10-15 characters"
          required
        />
        {errors.phone && (
          <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Role</label>
        <select
          value={formData.role}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value as User["role"] })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData({
              ...formData,
              status: e.target.value as User["status"],
            })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="BLOCKED">Blocked</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
};
const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-60">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="mb-4">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>

        <div className="mt-4 border-t pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector(
                "#user-form"
              ) as HTMLFormElement | null;
              if (form) form.requestSubmit();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error";
  } | null>(null);
  const pageSize = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // If filtering by role, fetch a larger page so we can filter client-side
      // (backend currently doesn't accept a role filter). For normal "ALL" view
      // use regular pagination.
      if (roleFilter !== "ALL") {
        // get a larger page so we can show all teachers or students
        const resp = await AdminService.getUsers(1, 200);
        console.log("resp", resp);
        const paginated = resp || {
          data: [],
          total: 0,
          page: 1,
          pageSize: 200,
        };
        const all = paginated.data || [];
        const filtered = all.filter(
          (u) => u.role === (roleFilter === "TEACHER" ? "TEACHER" : "STUDENT")
        );
        setUsers(filtered);
        setTotal(filtered.length);
        setPage(1);
      } else {
        const response = await AdminService.getUsers(page, pageSize);
        const paginated = response || { data: [], total: 0, page, pageSize };
        setUsers(paginated.data || []);
        setTotal(typeof paginated.total === "number" ? paginated.total : 0);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  // re-fetch when role filter changes
  useEffect(() => {
    // reset to first page and fetch
    // setting the page to 1 will trigger the page effect which calls fetchUsers.
    // This avoids overlapping fetches and keeps pagination consistent.
    // If we're already on page 1, setPage(1) won't change state and the page effect
    // won't run; in that case call fetchUsers directly. If we're on a different
    // page, setPage(1) will update state and the page effect will trigger fetch.
    if (page === 1) {
      setPage(1); // keep explicit reset for clarity
      fetchUsers();
    } else {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const handleCreateUser = async (data: UserFormData) => {
    try {
      await AdminService.createUser(data);
      setToast({ message: "✅ User created successfully", type: "success" });
      setModalOpen(false);
      fetchUsers();
    } catch (error) {
      setToast({ message: "Failed to create user", type: "error" });
      console.error("Failed to create user:", error);
    }
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!editingUser) return;
    try {
      await AdminService.updateUser(editingUser.id, data);
      setToast({ message: "✅ User updated successfully", type: "success" });
      setModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      setToast({ message: "Failed to update user", type: "error" });
      console.error("Failed to update user:", error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await AdminService.deleteUser(id);
      fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
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
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setEditingUser(user);
              setModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteUser(user.id)}
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
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Add User
        </button>
      </div>
      {/* Role filter tabs */}
      <div className="mb-4">
        <div className="inline-flex rounded-md shadow-sm" role="tablist">
          {(["ALL", "TEACHER", "STUDENT"] as const).map((r) => (
            <button
              key={r}
              role="tab"
              onClick={() => setRoleFilter(r)}
              className={`px-4 py-2 border border-gray-200 rounded-l-md first:rounded-l-md last:rounded-r-md text-sm font-medium focus:outline-none ${
                roleFilter === r
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              {r === "ALL" ? "All" : r === "TEACHER" ? "Teachers" : "Students"}
            </button>
          ))}
        </div>
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
        {/* Wrap form in an error boundary so rendering errors show a diagnostic instead of a blank overlay */}
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
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};
