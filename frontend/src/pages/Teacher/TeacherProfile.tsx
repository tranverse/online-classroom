import React, { useEffect, useState } from "react";
import { CiUser } from "react-icons/ci";

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: string;
}

const TeacherProfile: React.FC = () => {
  const [teacher, setTeacher] = useState<Teacher | null>(null);

  // State cập nhật mật khẩu
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed: Teacher = JSON.parse(stored);
        if (parsed.role === "TEACHER") setTeacher(parsed);
      } catch (err) {
        console.error("Failed to parse user from localStorage", err);
      }
    }
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPassMessage("Please fill all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassMessage("New passwords do not match.");
      return;
    }

    setLoading(true);
    setPassMessage(null);

    try {
      // TODO: Thay bằng call API thực tế
      await new Promise((res) => setTimeout(res, 1000));

      setPassMessage("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPassMessage("Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (!teacher) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center gap-6 transition hover:shadow-xl">
        {teacher.avatar ? (
          <img
            src={teacher.avatar}
            alt={teacher.name}
            className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-emerald-500 shadow-md"
          />
        ) : (
          <CiUser className="text-8xl text-gray-300 border-4 border-gray-200 rounded-full p-2 shadow-inner" />
        )}
        <div className="flex-1 space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-800">{teacher.name}</h1>
          <p className="text-gray-600">{teacher.email}</p>
          {teacher.phone && <p className="text-gray-600">{teacher.phone}</p>}
          <span className="inline-block bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1 rounded-full">
            {teacher.role}
          </span>
        </div>
      </div>

      {/* Profile Info card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Profile Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 text-sm">
          <div>
            <span className="font-medium text-gray-800">Full Name:</span> {teacher.name}
          </div>
          <div>
            <span className="font-medium text-gray-800">Email:</span> {teacher.email}
          </div>
          {teacher.phone && (
            <div>
              <span className="font-medium text-gray-800">Phone:</span> {teacher.phone}
            </div>
          )}
          <div>
            <span className="font-medium text-gray-800">Role:</span> {teacher.role}
          </div>
        </div>
      </div>

      {/* Update Password card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Update Password</h2>
        <form className="space-y-4" onSubmit={handlePasswordUpdate}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Old Password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          {passMessage && (
            <p
              className={`text-sm ${
                passMessage.includes("successfully") ? "text-green-600" : "text-red-600"
              }`}
            >
              {passMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Optional: About card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-2">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">About</h2>
        <p className="text-gray-600 text-sm">
          You can customize this section to include additional information such as department,
          office hours, or bio. Keep it concise and clean.
        </p>
      </div>
    </div>
  );
};

export default TeacherProfile;
