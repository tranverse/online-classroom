import React from "react";
import { CiUser } from "react-icons/ci";
import { IoIosNotificationsOutline } from "react-icons/io";
import { FiUpload } from "react-icons/fi";

type Props = {
  onUpload?: (file: File) => void;
};

const UserHeader: React.FC<Props> = ({ onUpload }) => {
  return (
    <div className="border-b py-2 px-4 bg-white">
      <div className="flex justify-between items-center">
        <div>
          <input
            type="text"
            placeholder="Search"
            className="border rounded px-2 py-1"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <FiUpload className="text-xl" />
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f && onUpload) onUpload(f);
              }}
              className="hidden"
            />
          </label>

          <div className="flex items-center gap-2">
            <div className="text-xl">
              <IoIosNotificationsOutline />
            </div>
            <div className="flex items-center gap-1 cursor-pointer">
              <CiUser className="text-2xl" />
              <div className="text-sm">User Name</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserHeader;
