import { useState, useRef, useEffect } from "react";
import { CiUser } from "react-icons/ci";

const UserDropdown: React.FC<{ user: any }> = ({ user }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <CiUser className="text-2xl text-gray-700" />
        )}
        <span className="hidden md:inline text-sm font-medium text-gray-700">
          {user?.name || "User"}
        </span>
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-md z-50">
          <a
            href={
              user?.role === "TEACHER"
                ? "/teacher/profile"
                : "/student/profile"
            }
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Profile
          </a>
          {user?.role !== "TEACHER" && (
            <a
              href="/student/profile-attendance"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Upload Attendance
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
