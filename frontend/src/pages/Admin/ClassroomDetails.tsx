import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminService } from "../../services/admin.service";
import { DataTable } from "../../components/DataTable";

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const ClassroomDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const resp = await AdminService.getClassroomDetails(id);
        setData(resp.data);
      } catch (err) {
        console.error("Failed to load classroom details", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const students = data?.students || [];
  const classroom = data?.classroom;

  const columns = useMemo(
    () => [
      {
        key: "name",
        title: "Name",
        render: (row: any) => row.student?.name || "-",
      },
      {
        key: "email",
        title: "Email",
        render: (row: any) => row.student?.email || "-",
      },
      {
        key: "enrollDate",
        title: "Enroll Date",
        render: (row: any) => formatDate(row.enrollDate),
      },
      {
        key: "actions",
        title: "Actions",
        render: (row: any) => (
          <button
            className="text-blue-600 hover:text-blue-800 font-medium"
            onClick={() => navigate(`/admin/users/${row.student?.id}`)}
          >
            View
          </button>
        ),
      },
    ],
    [navigate]
  );

  if (!id) return <div className="p-6">No classroom id provided</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {classroom?.name || "Classroom Details"}
          </h1>
          <p className="text-gray-500 mt-1">
            Detailed information and enrolled students
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md shadow-sm transition"
        >
          ← Back
        </button>
      </div>

      {/* Classroom Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col">
          <span className="text-xs text-gray-400 uppercase mb-1">Status</span>
          <span
            className={`font-semibold text-sm px-2 py-1 rounded-full w-max ${
              classroom?.status === "ACTIVE"
                ? "bg-green-100 text-green-800"
                : classroom?.status === "COMPLETED"
                ? "bg-gray-200 text-gray-700"
                : classroom?.status === "CANCELLED"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {classroom?.status || "-"}
          </span>
        </div>
        <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col">
          <span className="text-xs text-gray-400 uppercase mb-1">Teacher</span>
          <span className="font-medium text-gray-900">
            {classroom?.teacher?.name || "-"}
          </span>
        </div>
        <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col">
          <span className="text-xs text-gray-400 uppercase mb-1">Quantity</span>
          <span className="font-medium text-gray-900">
            {classroom?.quantity ?? "-"}
          </span>
        </div>
        <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col">
          <span className="text-xs text-gray-400 uppercase mb-1">Start Date</span>
          <span className="font-medium text-gray-900">
            {formatDate(classroom?.startDate)}
          </span>
        </div>
        <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col">
          <span className="text-xs text-gray-400 uppercase mb-1">End Date</span>
          <span className="font-medium text-gray-900">
            {formatDate(classroom?.endDate)}
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">
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
          className="rounded-xl"
        />
      </div>
    </div>
  );
};

export default ClassroomDetailsPage;
