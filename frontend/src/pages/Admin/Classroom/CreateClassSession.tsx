import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DatePicker, Select } from "antd";
import ClassroomService from "@services/classroom.service";
import ClassSessionService from "@services/classSession.service";
import { useLocation } from "react-router-dom";

const CreateClassSession: React.FC = () => {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState<any>(null);
  const [endTime, setEndTime] = useState<any>(null);
  const [classroomId, setClassroomId] = useState<string | undefined>(undefined);
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      const res = await ClassroomService.getClassrooms();
      if (res.success) setClassrooms(res.data || []);
    })();
    const params = new URLSearchParams(window.location.search);
    const pre = params.get("classroomId");
    if (pre) setClassroomId(pre);
  }, []);

  const submit = async () => {
    if (!classroomId) return alert("Choose classroom");
    const payload = {
      title,
      startTime: startTime ? startTime.toISOString() : null,
      endTime: endTime ? endTime.toISOString() : null,
      link,
      note,
      classroom: { id: classroomId },
    };
    const res = await ClassSessionService.createClassSession(payload);
    if (res && res.success) {
      // navigate to class session list or classroom page if available
      alert("Class session created successfully");
      navigate("/admin/class-session");
    } else {
      alert(
        "Failed to create class session: " + (res?.message || "unknown error")
      );
    }
  };

  return (
    <div className="p-4 shadow">
      <h3 className="text-xl mb-4">Create Class Session</h3>
      <div className="flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <DatePicker showTime onChange={(v) => setStartTime(v)} />
        <DatePicker showTime onChange={(v) => setEndTime(v)} />
        <Select
          placeholder="Select classroom"
          options={classrooms.map((c) => ({ label: c.name, value: c.id }))}
          onChange={(val) => setClassroomId(val)}
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note"
        />
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded"
          onClick={submit}
        >
          Create
        </button>
      </div>
    </div>
  );
};

export default CreateClassSession;
