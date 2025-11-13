import React, { useState, useEffect } from "react";
import { FaPaperPlane } from "react-icons/fa";
import ClassroomService from "@services/classroom.service";
import AssignmentService from "@services/assignment.service";

const TeacherAssignmentPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueAt: "",
    classroomId: "",
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await ClassroomService.getMyClassrooms();
        setClassrooms(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchClassrooms();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await AssignmentService.createAssignment(form);
      setSuccessMsg("✅ Đăng tải bài tập thành công!");
      setForm({ title: "", description: "", dueAt: "", classroomId: "" });
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Lỗi khi đăng tải bài tập!");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccessMsg("");
        setErrorMsg("");
      }, 4000);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-start bg-gray-50 py-10 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <FaPaperPlane className="text-blue-600" /> Đăng tải bài tập mới
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Tên bài tập
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Nhập tên bài tập..."
              required
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Mô tả
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Nhập mô tả chi tiết..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Hạn nộp
              </label>
              <input
                type="datetime-local"
                name="dueAt"
                value={form.dueAt}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Lớp học
              </label>
              <select
                name="classroomId"
                value={form.classroomId}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Chọn lớp học --</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2.5 rounded-lg text-white font-medium shadow-md transition-all duration-200 ${
                loading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Đang đăng tải..." : "Đăng tải"}
            </button>
          </div>

          {successMsg && (
            <p className="text-green-600 text-sm font-medium text-right">
              {successMsg}
            </p>
          )}
          {errorMsg && (
            <p className="text-red-600 text-sm font-medium text-right">
              {errorMsg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default TeacherAssignmentPage;
