import React from "react";
import { CiUser } from "react-icons/ci";
import { IoIosNotificationsOutline } from "react-icons/io";
import { FiFile } from "react-icons/fi"; // đổi icon upload
import { FiFolder } from "react-icons/fi";
import { useAppSelector } from "../../store/hooks";
import { selectCurrentUser } from "../../store/selectors";
import { Link } from "react-router-dom";

type Props = {
  onUpload?: (file: File) => void;
};

const UserHeader: React.FC<Props> = ({ onUpload }) => {
  const user = useAppSelector(selectCurrentUser);

  return (
    <header className="bg-white border-b shadow-sm px-6 py-3">
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        {/* Search */}
        <div className="flex w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Upload Document */}
          {/* Files quick link */}
          <Link
            to="/student/files"
            className="flex items-center gap-1 text-gray-700 hover:text-blue-600"
          >
            <FiFolder className="text-xl" />
            <span className="hidden md:inline text-sm">Files</span>
          </Link>

          <label className="flex items-center gap-1 cursor-pointer text-gray-700 hover:text-blue-600 transition-colors">
            <FiFile className="text-xl" />
            <span className="hidden md:inline text-sm">Upload</span>
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f && onUpload) onUpload(f);
              }}
              className="hidden"
            />
          </label>

          {/* Notifications */}
          <div className="relative text-gray-700 hover:text-blue-600 transition-colors cursor-pointer">
            <IoIosNotificationsOutline className="text-xl" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </div>

          {/* User */}
          <Link to={`/student/profile-attendance`}>
            <div className="flex items-center gap-2 cursor-pointer">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <CiUser className="text-2xl text-gray-700" />
              )}
              <span className="hidden md:inline text-sm font-medium">
                {user?.name || "User"}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default UserHeader;
