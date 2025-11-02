import React from "react";

type LabelProps = {
  label: React.ReactNode;
  className: string;
};

const Label = ({ label, className }: LabelProps) => {
  return <div className={`text-sm text-gray-700 ${className}`}>{label}</div>;
};

export default Label;
