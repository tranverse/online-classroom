import React from "react";
import Form from "@components/Form";
import InputField from "@components/Form/InputField";
import { DatePicker, Space, Select } from "antd";
import Label from "@components/Form/Label";
import SubmitButton from "@components/Form/SubmitButton";
import Heading from "@components/Heading";
import dayjs from "dayjs";

const ClassroomForm = ({ initialValue, onSubmit }) => {
  const defaultValues = {
    name: initialValue?.name,
    startDate: initialValue?.startDate,
    endDate: initialValue?.endDate,
    quantity: initialValue?.quantity,
    teacher: {
      id: "e77b6a26-6283-4b67-b4c0-1c753b9df6b5",
    },
  };
  const dateFormat = "DD-MM-YYYY";

  const onChange = (date, dateString) => {
    console.log(date, dateString);
  };
  const handleSubmit = async (data, reset) => {
    onSubmit(data);
  };
  const handleChange = (value) => {
    console.log(`selected ${value}`);
  };
  return (
    <div className="shadow p-4 ">
      <Heading name={"Add classroom"} />
      <Form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4 ">
          <div>
            <InputField
              name={"name"}
              placeholder={"Enter name"}
              label={"Name"}
            />
          </div>
          <div>
            <InputField
              name={"name"}
              placeholder={"Enter quantity student"}
              label={"Quantity"}
            />
          </div>
          <div className="">
            <Label label={"Start date"} className={"mb-1"} />
            <DatePicker
              onChange={onChange}
              picker="week"
              format={dateFormat}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Label label={"End date"} className={"mb-1"} />
            <DatePicker
              onChange={onChange}
              format={dateFormat}
              picker="week"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Label label={"Teacher"} className={"mb-1"} />
            <Select
              defaultValue="lucy"
              style={{ width: "100%" }}
              onChange={handleChange}
              options={[
                { value: "jack", label: "Jack" },
                { value: "lucy", label: "Lucy" },
                { value: "Yiminghe", label: "yiminghe" },
                { value: "disabled", label: "Disabled", disabled: true },
              ]}
            />
          </div>
          <SubmitButton name={"Add new classroom"} />
        </div>
      </Form>
    </div>
  );
};

export default ClassroomForm;
