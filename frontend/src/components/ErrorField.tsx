import React from "react";

type Props = {
  message: string;
};
const ErrorField = ({ message }: Props) => {
  return <div className="text-red-500 text-sm italic">{message}</div>;
};

export default ErrorField;
