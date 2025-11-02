import React, { ReactNode } from "react";
import { FormProvider, useForm, FieldValues } from "react-hook-form";

interface FormProps<T extends FieldValues> {
  children: ReactNode;
  onSubmit: (data: T) => void;
}

const Form = <T extends FieldValues>({ children, onSubmit }: FormProps<T>) => {
  const methods = useForm();
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>{children} </form>
    </FormProvider>
  );
};

export default Form;
