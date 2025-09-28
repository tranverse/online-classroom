import React from "react";
import { useFormContext } from "react-hook-form";
import Label from "./Label";

const InputField = ({ name, placeholder, label }) => {
  const { register } = useFormContext();
  return (
    <div>
      <Label label={label} className="mb-1 ">
        {label}
      </Label>
      <input
        id={name}
        type="text"
        {...register(name)}
        placeholder={placeholder}
        className="outline-none border border-gray-300 p-1 w-full rounded-md px-2.5 focus:shadow
          focus:border-none focus:ring-offset-1 focus:ring-1 focus:ring-blue-400 
        placeholder-gray-400 placeholder:font-light    "
      />
    </div>
  );
};

export default InputField;
