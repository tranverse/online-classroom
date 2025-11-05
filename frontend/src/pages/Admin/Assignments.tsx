import React, { useEffect, useState } from "react";
import AssignmentService from "@services/assignment.service";
import { Button, Input, Textarea } from "@components/Form";
import UploadButton from "@components/Files/UploadButton";

const AdminAssignments: React.FC = () => {
  const [classroomId, setClassroomId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (classroomId) fetch();
  }, [classroomId]);

  async function fetch() {
    const data = await AssignmentService.listForClass(classroomId);
    setAssignments(data || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await AssignmentService.create({
      title,
      description,
      dueAt,
      classroom: { id: classroomId },
    });
    setTitle("");
    setDescription("");
    setDueAt("");
    fetch();
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">Assignments (Teacher)</h2>
      <form onSubmit={handleCreate} className="space-y-2 py-4">
        <div>
          <label>Classroom ID</label>
          <input
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="textarea"
          />
        </div>
        <div>
          <label>Due at</label>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <button className="btn btn-primary" type="submit">
            Create
          </button>
        </div>
      </form>

      <div>
        <h3 className="font-semibold">Assignments</h3>
        <ul>
          {assignments.map((a) => (
            <li key={a.id} className="border p-2 my-2">
              <div className="flex justify-between">
                <div>
                  <div className="font-bold">{a.title}</div>
                  <div className="text-sm text-gray-600">{a.description}</div>
                </div>
                <div>
                  <small>Due: {a.dueAt}</small>
                </div>
              </div>
              <div className="mt-2">
                <AssignmentSubmissions assignmentId={a.id} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const AssignmentSubmissions: React.FC<{ assignmentId: string }> = ({
  assignmentId,
}) => {
  const [subs, setSubs] = useState<any[]>([]);

  useEffect(() => {
    if (assignmentId) load();
  }, [assignmentId]);

  async function load() {
    const data = await AssignmentService.listSubmissions(assignmentId);
    setSubs(data || []);
  }

  async function handleGrade(id: string) {
    const grade = parseFloat(prompt("Grade (0-100)") || "");
    if (isNaN(grade)) return;
    await AssignmentService.grade(id, { grade, feedback: "" });
    load();
  }

  return (
    <div>
      <h4 className="font-medium">Submissions</h4>
      <ul>
        {subs.map((s) => (
          <li key={s.id} className="flex justify-between items-center py-1">
            <div>
              <div>{s.student?.fullName || s.student?.email}</div>
              <div className="text-sm text-gray-500">{s.fileUrl}</div>
              <div className="text-sm text-gray-500">{s.submittedAt}</div>
            </div>
            <div>
              <button className="btn btn-sm" onClick={() => handleGrade(s.id)}>
                Grade
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminAssignments;
