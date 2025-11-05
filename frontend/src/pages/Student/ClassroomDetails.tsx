import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StudentService from "../../services/student.service";
import { Tabs } from "../../components/Tabs";
import { DataTable } from "../../components/DataTable";

const ClassroomDetails: React.FC = () => {
  const { id } = useParams();
  const [details, setDetails] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    StudentService.getClassroomDetails(id as string).then((d) =>
      setDetails(d.classroom || d)
    );
    StudentService.getMembers(id as string).then(setMembers);
    StudentService.getSessions(id as string).then(setSessions);
    StudentService.getAttendanceForClass(id as string).then(setAttendance);
  }, [id]);

  if (!details) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{details.name}</h1>
        <div className="text-sm text-gray-600">
          Teacher: {details.teacher?.name}
        </div>
        <div className="text-sm text-gray-600">
          Created: {details.createdAt}
        </div>
        <p className="mt-3">{details.description}</p>
      </div>

      <Tabs
        tabs={[
          {
            key: "members",
            label: "Members",
            content: (
              <DataTable
                columns={[{ key: "name", title: "Name" }]}
                data={members}
                page={1}
                pageSize={10}
                total={members.length}
                onPageChange={() => {}}
              />
            ),
          },
          {
            key: "sessions",
            label: "Sessions",
            content: (
              <DataTable
                columns={[
                  { key: "title", title: "Title" },
                  { key: "startTime", title: "Start" },
                ]}
                data={sessions}
                page={1}
                pageSize={10}
                total={sessions.length}
                onPageChange={() => {}}
              />
            ),
          },
          {
            key: "attendance",
            label: "Attendance",
            content: (
              <DataTable
                columns={[
                  { key: "session", title: "Session" },
                  { key: "status", title: "Status" },
                ]}
                data={attendance}
                page={1}
                pageSize={10}
                total={attendance.length}
                onPageChange={() => {}}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default ClassroomDetails;
