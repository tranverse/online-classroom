import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminService } from "@services/admin.service";
import { DataTable } from "@components/DataTable";
import TeacherService from "@services/teacher.service";
import authMemory from "@services/authMemory";

const TeacherClassroomDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const resp = await TeacherService.getClassroomDetails(id);
        setData(resp?.data || resp);
      } catch (err) {
        console.error("Failed to load classroom details", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const students = data?.students || [];
  const classroom = data?.classroom || data;

  const columns = useMemo(
    () => [
      {
        key: "name",
        title: "Name",
        render: (r: any) => r.student?.name || "-",
      },
      {
        key: "email",
        title: "Email",
        render: (r: any) => r.student?.email || "-",
      },
      {
        key: "enrollDate",
        title: "Enroll Date",
        render: (r: any) =>
          r.enrollDate
            ? new Date(r.enrollDate).toLocaleDateString("en-GB")
            : "-",
      },
    ],
    [navigate]
  );

  if (!id) return <div className="p-6">No classroom id provided</div>;

  const handleAssignmentClick = () => {
    navigate(`/teacher/classrooms/${id}/assignments`);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Classroom (Teacher)</h1>
          <p className="text-sm text-gray-600">{classroom?.name || "-"}</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Nút Assignment */}
          <button
            onClick={handleAssignmentClick}
            disabled={classroom?.status === "COMPLETED"}
            className={`px-4 py-2 text-sm rounded-md shadow ${
              classroom?.status === "COMPLETED"
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            }`}
          >
            Assignment
          </button>

          {/* Nút Resources */}
          <button
            onClick={() => navigate(`/teacher/classrooms/${id}/resources`)}
            className="px-4 py-2 text-sm rounded-md shadow bg-blue-600 text-white hover:bg-blue-700"
          >
            Resources
          </button>

          {/* Nút Back */}
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Back
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white border rounded-md">
          <div className="text-xs text-gray-500">Status</div>
          <div className="font-medium">{classroom?.status || "-"}</div>
        </div>
        <div className="p-4 bg-white border rounded-md">
          <div className="text-xs text-gray-500">Teacher</div>
          <div className="font-medium">{classroom?.teacher?.name || "-"}</div>
        </div>
        <div className="p-4 bg-white border rounded-md">
          <div className="text-xs text-gray-500">Quantity</div>
          <div className="font-medium">{classroom?.quantity ?? "-"}</div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white border rounded-md p-4">
        <h2 className="text-lg font-medium mb-4">
          Students ({students.length})
        </h2>
        <DataTable
          columns={columns}
          data={students}
          total={students.length}
          page={1}
          pageSize={100}
          loading={loading}
          onPageChange={() => {}}
        />
      </div>
    </div>
  );
};

export default TeacherClassroomDetails;
