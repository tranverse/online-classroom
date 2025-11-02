import React from "react";
import UserLayout from "@layouts/UserLayout";

type Props = {
  children: React.ReactNode;
};

const TeacherLayout: React.FC<Props> = ({ children }) => {
  const handleUpload = (file: File) => {
    // TODO: upload personal file for teacher profile or resources
    console.log("Teacher uploaded", file.name);
  };

  return <UserLayout onUpload={handleUpload}>{children}</UserLayout>;
};

export default TeacherLayout;
