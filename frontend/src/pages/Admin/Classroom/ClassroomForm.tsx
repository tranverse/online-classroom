import React, { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { DatePicker, Select } from "antd";
import Label from "@components/Form/Label";
import InputField from "@components/Form/InputField";
import SubmitButton from "@components/Form/SubmitButton";
import Heading from "@components/Heading";
import UserService from "@services/user.service";
import ErrorField from "@components/ErrorField";
type Props = {
  initialValue?: {};
  errors?: {};
};

const ClassroomForm = ({ initialValue, errors }: Props) => {
  const { control } = useFormContext();
  const [teachers, setTeachers] = useState([]);
  useEffect(() => {
    const getTeacher = async () => {
      const response = await UserService.getTeachers("TEACHER");
      if (response.success) {
        setTeachers(response.data);
      } else {
      }
    };
    getTeacher();
  }, []);
  console.log(errors);

  const dateFormat = "DD-MM-YYYY";

  return (
    <div className="shadow p-4">
      <Heading name="Add classroom" className="" />
      <div className="flex flex-col gap-4">
        <InputField
          name="name"
          placeholder="Enter name"
          label="Name"
          type="text"
          error={errors?.name ? errors.name : ""}
        />
        <InputField
          name="quantity"
          placeholder="Enter quantity"
          label="Quantity"
          type="number"
          error={errors?.quantity ? errors.quantity : ""}
        />
        <div>
          <Label label="Start date" className="mb-1" />
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                format={dateFormat}
                picker="week"
                style={{ width: "100%" }}
              />
            )}
          />
        </div>
        <div>
          <Label label="End date" className="mb-1" />
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                format={dateFormat}
                picker="week"
                style={{ width: "100%" }}
              />
            )}
          />
        </div>
        <div>
          <Label label="Teacher" className="mb-1" />
          <Controller
            name="teacher"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: "100%" }}
                options={teachers.map((teacher) => ({
                  label: teacher.name,
                  value: teacher.id,
                }))}
              />
            )}
          />
        </div>
        <SubmitButton name="Add new classroom" type="submit" />
      </div>
    </div>
  );
};

export default ClassroomForm;
