import React, { ReactNode } from "react";
import { FormProvider, useForm, FieldValues } from "react-hook-form";

interface FormProps<T extends FieldValues> {
  children: ReactNode;
  onSubmit: (data: T) => void;
  // optional default values to initialize the form
  defaultValues?: Partial<T>;
}

const Form = <T extends FieldValues>({
  children,
  onSubmit,
  defaultValues,
}: FormProps<T>) => {
  const methods = useForm({ defaultValues: defaultValues as any });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>{children} </form>
    </FormProvider>
  );
};

export default Form;
