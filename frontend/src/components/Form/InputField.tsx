import React from "react";
import { FieldValues, useFormContext } from "react-hook-form";
import Label from "./Label";
import ErrorField from "@components/ErrorField";

interface InputFieldProps<T extends FieldValues> {
  name: string;
  placeholder?: string;
  label?: string;
  type?: string;
  error?: string;
  // registerOptions forwarded to react-hook-form register (e.g., { valueAsNumber: true, min: 1 })
  registerOptions?: any;
}

const InputField = <T extends FieldValues>({
  name,
  placeholder = "",
  label = "",
  type = "text",
  error = "",
  registerOptions,
}: InputFieldProps<T>) => {
  const { register } = useFormContext();
  return (
    <div>
      {label && <Label label={label} className="mb-1 " />}
      <input
        id={name}
        type={type}
        {...register(name, registerOptions)}
        placeholder={placeholder}
        className={`outline-none border border-gray-300 p-1 w-full rounded-md px-2.5 focus:shadow
          focus:border-none focus:ring-offset-1 focus:ring-1 focus:ring-blue-400 
        placeholder-gray-400 placeholder:font-light`}
      />
      {error && <ErrorField message={error} />}
    </div>
  );
};

export default InputField;
