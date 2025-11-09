import React from "react";
import UserHeader from "./Header";

const UserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-emerald-50 to-white">
      <UserHeader />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
};

export default UserLayout;
