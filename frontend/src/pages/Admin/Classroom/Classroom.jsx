import ClassroomService from "@services/classroom.service";
import ClassroomForm from "./ClassroomForm";

export const CreateClassroom = () => {
  const handleAddClassroom = async (data) => {
    const response = await ClassroomService.createClassRoom(data);
  };

  return <ClassroomForm onSubmit={handleAddClassroom} initialValue={null} />;
};
