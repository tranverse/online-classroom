import React, { useEffect, useState } from "react";
import AssignmentService from "@services/assignment.service";
import UploadButton from "@components/Files/UploadButton";

const StudentAssignments: React.FC = () => {
  const [classroomId, setClassroomId] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (classroomId) fetch();
  }, [classroomId]);

  async function fetch() {
    const data = await AssignmentService.listForClass(classroomId);
    setAssignments(data || []);
  }

  async function handleSubmit(assignmentId: string) {
    const fileUrl = prompt("Paste file URL (or leave empty if using upload)");
    if (!fileUrl)
      return alert(
        "Please use upload button to upload and then provide URL (TODO) or paste an accessible URL"
      );
    await AssignmentService.submit({ assignmentId, fileUrl });
    alert("Submitted");
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">Assignments (Student)</h2>
      <div className="py-4">
        <label>Classroom ID</label>
        <input
          value={classroomId}
          onChange={(e) => setClassroomId(e.target.value)}
          className="input"
        />
      </div>

      <div>
        <ul>
          {assignments.map((a) => (
            <li key={a.id} className="border p-2 my-2">
              <div className="font-bold">{a.title}</div>
              <div className="text-sm">{a.description}</div>
              <div className="mt-2">
                <UploadButton
                  onUploaded={() =>
                    alert(
                      "Upload done: get URL and submit via paste (TODO improve)"
                    )
                  }
                />
                <button className="btn ml-2" onClick={() => handleSubmit(a.id)}>
                  Submit (paste URL)
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default StudentAssignments;
