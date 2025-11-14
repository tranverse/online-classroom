// import React, { useEffect, useState } from "react";
// import { CiUser } from "react-icons/ci";

// interface Student {
//   id: string;
//   name: string;
//   email: string;
//   phone?: string | null;
//   avatar?: string | null;
//   role: string;
// }

// const StudentProfile: React.FC = () => {
//   const [student, setStudent] = useState<Student | null>(null);

//   useEffect(() => {
//     const stored = localStorage.getItem("user");
//     if (stored) {
//       try {
//         const parsed: Student = JSON.parse(stored);
//         if (parsed.role === "STUDENT") setStudent(parsed);
//       } catch (err) {
//         console.error("Failed to parse user from localStorage", err);
//       }
//     }
//   }, []);

//   if (!student)
//     return <div className="p-6 text-center text-gray-500">Loading...</div>;

//   return (
//     <div className="p-6 max-w-4xl mx-auto space-y-6">
//       {/* Header card */}
//       <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center gap-6 transition hover:shadow-xl">
//         {student.avatar ? (
//           <img
//             src={student.avatar}
//             alt={student.name}
//             className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-emerald-500 shadow-md"
//           />
//         ) : (
//           <CiUser className="text-8xl text-gray-300 border-4 border-gray-200 rounded-full p-2 shadow-inner" />
//         )}
//         <div className="flex-1 space-y-2 text-center md:text-left">
//           <h1 className="text-3xl font-bold text-gray-800">{student.name}</h1>
//           <p className="text-gray-600">{student.email}</p>
//           {student.phone && <p className="text-gray-600">{student.phone}</p>}
//           <span className="inline-block bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1 rounded-full">
//             {student.role}
//           </span>
//         </div>
//       </div>

//       {/* About / Info card */}
//       <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
//         <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
//           Profile Information
//         </h2>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 text-sm">
//           <div>
//             <span className="font-medium text-gray-800">Full Name:</span>{" "}
//             {student.name}
//           </div>
//           <div>
//             <span className="font-medium text-gray-800">Email:</span>{" "}
//             {student.email}
//           </div>
//           {student.phone && (
//             <div>
//               <span className="font-medium text-gray-800">Phone:</span>{" "}
//               {student.phone}
//             </div>
//           )}
//           <div>
//             <span className="font-medium text-gray-800">Role:</span> {student.role}
//           </div>
//         </div>
//       </div>

//       {/* Optional: Extra card */}
//       <div className="bg-white rounded-2xl shadow-lg p-6 space-y-2">
//         <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
//           About
//         </h2>
//         <p className="text-gray-600 text-sm">
//           You can customize this section to include additional information such
//           as department, enrolled courses, or bio. Keep it concise and clean.
//         </p>
//       </div>
//     </div>
//   );
// };

// export default StudentProfile;
import React, { useEffect, useState } from "react";
import { CiUser } from "react-icons/ci";

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: string;
}

const StudentProfile: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);

  // State cập nhật password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed: Student = JSON.parse(stored);
        if (parsed.role === "STUDENT") setStudent(parsed);
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
      // Giả lập request API
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

  if (!student)
    return <div className="p-6 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center gap-6 transition hover:shadow-xl">
        {student.avatar ? (
          <img
            src={student.avatar}
            alt={student.name}
            className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-emerald-500 shadow-md"
          />
        ) : (
          <CiUser className="text-8xl text-gray-300 border-4 border-gray-200 rounded-full p-2 shadow-inner" />
        )}
        <div className="flex-1 space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-800">{student.name}</h1>
          <p className="text-gray-600">{student.email}</p>
          {student.phone && <p className="text-gray-600">{student.phone}</p>}
          <span className="inline-block bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1 rounded-full">
            {student.role}
          </span>
        </div>
      </div>

      {/* Profile Info card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
          Profile Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 text-sm">
          <div>
            <span className="font-medium text-gray-800">Full Name:</span>{" "}
            {student.name}
          </div>
          <div>
            <span className="font-medium text-gray-800">Email:</span>{" "}
            {student.email}
          </div>
          {student.phone && (
            <div>
              <span className="font-medium text-gray-800">Phone:</span>{" "}
              {student.phone}
            </div>
          )}
          <div>
            <span className="font-medium text-gray-800">Role:</span>{" "}
            {student.role}
          </div>
        </div>
      </div>

      {/* Update Password card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
          Update Password
        </h2>
        <form className="space-y-4" onSubmit={handlePasswordUpdate}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Old Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
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
                passMessage.includes("successfully")
                  ? "text-green-600"
                  : "text-red-600"
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
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
          About
        </h2>
        <p className="text-gray-600 text-sm">
          You can customize this section to include additional information such
          as department, enrolled courses, or bio. Keep it concise and clean.
        </p>
      </div>
    </div>
  );
};

export default StudentProfile;
