import React, { useEffect, useState } from "react";
import { CiUser } from "react-icons/ci";
import { FiFolder, FiHome, FiBookOpen } from "react-icons/fi";
import { useAppSelector } from "../../store/hooks";
import { selectCurrentUser } from "../../store/selectors";
import { Link } from "react-router-dom";
import UserDropdown from "@layouts/components/UserDropdown";
// ClassroomService no longer used here; header links directly to classroom lists

const UserHeader: React.FC = () => {
  const user = useAppSelector(selectCurrentUser);
  // determine classroom list target: teacher -> /teacher, others -> /student/classrooms
  const userId = user && ((user as any).id || (user as any).userId);
  const baseLink =
    user && (user as any).role === "TEACHER"
      ? "/teacher/classrooms"
      : "/student/classrooms";
  const classroomLink = userId
    ? `${baseLink}/user/${encodeURIComponent(userId)}`
    : baseLink;
  const filesLink = `${baseLink}/files`;
  const root =
    user && (user as any).role === "TEACHER" ? "/teacher" : "/student";
  return (
    <header className="bg-white border-b shadow-sm px-6 py-3">
      <div className="flex justify-between items-center">
        {/* Left: Home + Files */}
        <div className="flex items-center gap-4 text-gray-700">
          <Link
            to={root}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <FiHome className="text-xl" />
            <span className="hidden md:inline text-sm font-medium">Home</span>
          </Link>

          <Link
            to={`${root}/files`}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <FiFolder className="text-xl" />
            <span className="hidden md:inline text-sm font-medium">Files</span>
          </Link>
        </div>

        {/* Right: Classroom + User */}
        <div className="flex items-center gap-4">
          {/* Link to classroom lists: teachers -> teacher dashboard, students -> student classrooms */}
          <Link
            to={classroomLink}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <FiBookOpen className="text-xl" />
            <span className="hidden md:inline text-sm font-medium">
              Classrooms
            </span>
          </Link>

          <UserDropdown user={user} />
        </div>
      </div>
    </header>
  );
};

export default UserHeader;
