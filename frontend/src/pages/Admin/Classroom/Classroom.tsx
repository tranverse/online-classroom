import ClassroomService from "@services/classroom.service";
import ClassroomForm from "./ClassroomForm";
import { toast } from "react-toastify";
import Form from "@components/Form";
import { useState } from "react";

export const CreateClassroom = () => {
  const [errors, setErrors] = useState({});

  const handleAddClassroom = async (data: any) => {
    data = {
      ...data,
      teacher: { id: data.teacher },
    } as any;
    console.log(data);
    const response = await ClassroomService.createClassRoom(data);
    if (response.success) {
      toast.success(response.message);
    } else {
      if (response.code == "4008") {
        setErrors(response.data);
      }
      toast.error(response.message);
    }
    console.log(response);
  };

  return (
    <Form
      onSubmit={handleAddClassroom}
      // defaultValues={{ name: "", quantity: 0, teacherId: "" }}
    >
      <ClassroomForm errors={errors} />
    </Form>
  );
};
