import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminService } from "../../services/admin.service";
import { DataTable } from "../../components/DataTable";

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
  console.log("data", data)

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
        render: (row: any) => row.enrollDate || "-",
      },
      {
        key: "actions",
        title: "Actions",
        render: (row: any) => (
          <div className="flex items-center space-x-2">
            <button
              className="text-blue-600 hover:text-blue-800"
              onClick={() => navigate(`/admin/users/${row.student?.id}`)}
            >
              View user
            </button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  if (!id) return <div className="p-6">No classroom id provided</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Classroom details</h1>
          <p className="text-sm text-gray-600">{classroom?.name || "-"}</p>
        </div>
        <div>
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 text-sm bg-gray-100 rounded-md"
          >
            Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white border rounded-md">
          <div className="text-xs text-gray-500">Status</div>
          <div className="font-medium">{classroom?.status || "-"}</div>
        </div>
        <div className="p-4 bg-white border rounded-md">
          <div className="text-xs text-gray-500">Teacher</div>
          <div className="font-medium">
            {classroom?.teacher ? `${classroom.teacher.name}` : "-"}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-md">
          <div className="text-xs text-gray-500">Quantity</div>
          <div className="font-medium">{classroom?.quantity ?? "-"}</div>
        </div>
      </div>

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

export default ClassroomDetailsPage;
