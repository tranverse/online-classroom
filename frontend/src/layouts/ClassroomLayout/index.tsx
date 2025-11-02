import React from "react";
type Props = {
  children: React.ReactNode;
};
const ClassroomLayout = ({ children }: Props) => {
  return <div>{children}</div>;
};

export default ClassroomLayout;
