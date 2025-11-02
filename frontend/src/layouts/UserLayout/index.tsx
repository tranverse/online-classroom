import React from "react";
import UserHeader from "./Header";

type Props = {
  children: React.ReactNode;
  onUpload?: (file: File) => void;
};

const UserLayout: React.FC<Props> = ({ children, onUpload }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader onUpload={onUpload} />
      <div className="p-6">{children}</div>
    </div>
  );
};

export default UserLayout;
