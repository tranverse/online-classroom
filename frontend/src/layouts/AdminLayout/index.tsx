import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiLogOut,
  FiSettings,
} from "react-icons/fi";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: <FiHome /> },
  { path: "/admin/users", label: "Users", icon: <FiUsers /> },
  { path: "/admin/classrooms", label: "Classrooms", icon: <FiBookOpen /> },
  { path: "/admin/sessions", label: "Sessions", icon: <FiCalendar /> },
  { path: "/admin/attendance", label: "Attendance", icon: <FiCheckSquare /> },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <FiSettings className="text-blue-600 text-2xl" />
            <span className="text-xl font-semibold text-gray-800">
              Admin Panel
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium">Hello, Admin</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md transition"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow rounded-lg">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition ${
                  location.pathname === item.path
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-white shadow rounded-lg p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
