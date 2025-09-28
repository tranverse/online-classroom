import React from "react";

const Label = ({ label, className }) => {
  return <div className={`text-sm text-gray-700 ${className}`}>{label}</div>;
};

export default Label;
