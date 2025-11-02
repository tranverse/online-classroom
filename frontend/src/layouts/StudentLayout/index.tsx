import React from "react";
import UserLayout from "@layouts/UserLayout";

type Props = {
  children: React.ReactNode;
};

const StudentLayout: React.FC<Props> = ({ children }) => {
  const handleUpload = (file: File) => {
    // TODO: upload personal file for student (avatar, assignment)
    console.log("Student uploaded", file.name);
  };

  return <UserLayout onUpload={handleUpload}>{children}</UserLayout>;
};

export default StudentLayout;
