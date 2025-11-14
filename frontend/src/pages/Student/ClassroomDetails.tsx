import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StudentService from "../../services/student.service";
import FilesService from "../../services/files.service";
import { Tabs } from "../../components/Tabs";
import { FiCheckCircle, FiXCircle, FiDownload, FiFile } from "react-icons/fi";
type FolderType = { id: string; name: string };
type FileType = { id: string; name: string; size?: number; folderId: string };
const StudentClassroomDetails: React.FC = () => {
  const { id } = useParams();
  const [details, setDetails] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    // Load classroom + attendance
    StudentService.getClassroomDetails(id as string).then(setDetails);

    // Load resources
    FilesService.listResourcesForClassroom(id as string).then((res) => {
      setResources(res || []);
    });
  }, [id]);

  console.log(resources);

  if (!details) return <div className="p-6">Loading...</div>;

  const { classroom, classSessions = [], attendance = [] } = details;

  function parseAttendanceNote(note: string) {
    if (!note) return "-";
    const parts = note.split(";").reduce((acc: any, item) => {
      const [k, v] = item.split("=");
      if (k && v) acc[k] = v;
      return acc;
    }, {});

    return `
Similarity: ${
      parts.similarity
        ? (parseFloat(parts.similarity) * 100).toFixed(1) + "%"
        : "-"
    }
Liveness: ${parts.liveness === "true" ? "✅" : "❌"}
Blink detected: ${parts.blinkProb === "1.0" ? "✅" : "❌"}
Face turned too much: ${
      parts.yawDelta && Math.abs(parseFloat(parts.yawDelta)) > 15 ? "⚠️" : "✅"
    }
AI used: ${parts.usedAI === "true" ? "Yes" : "No"}
    `;
  }
  const download = async (file: FileType) => {
    try {
      const blob = await FilesService.downloadResourceBlob(file.id);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch (err) {
      console.error("Download error", err);
      alert("Failed to download file");
    }
  };

  const preview = async (file: FileType) => {
    try {
      const blob = await FilesService.downloadResourceBlob(file.id);
      const ext = file.name.split(".").pop()?.toLowerCase();
      const objectUrl = URL.createObjectURL(blob);
      const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];
      if (ext && (imageExts.includes(ext) || ext === "pdf")) {
        window.open(objectUrl, "_blank");
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      } else {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      }
    } catch (err) {
      console.error("Preview error", err);
      alert("Failed to preview file");
    }
  };
  return (
    <div className="p-6 space-y-6">
      {/* Classroom info card */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800">{classroom.name}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-gray-600 text-sm">
          <div>Teacher: {classroom.teacher?.name}</div>
          <div>
            Duration: {classroom.startDate} → {classroom.endDate}
          </div>
          <div>Status: {classroom.status}</div>
          <div>Members: {classroom.quantity}</div>
        </div>
      </div>

      <Tabs
        tabs={[
          // ---------------------- TAB SESSIONS ----------------------
          {
            key: "sessions",
            label: "Sessions",
            content: (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classSessions.map((s: any) => (
                  <div
                    key={s.id}
                    className="bg-white shadow-sm rounded-lg border border-gray-100 p-4 hover:shadow-md transition"
                  >
                    <div className="font-semibold text-gray-800">{s.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {s.startTime} → {s.endTime}
                    </div>
                    <div
                      className={`mt-2 inline-block px-2 py-1 text-xs rounded-full font-medium ${
                        s.sessionStatus === "IN_PROGRESS"
                          ? "bg-yellow-100 text-yellow-800"
                          : s.sessionStatus === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {s.sessionStatus}
                    </div>
                  </div>
                ))}
              </div>
            ),
          },

          // ---------------------- TAB ATTENDANCE ----------------------
          {
            key: "attendance",
            label: "My Attendance",
            content: (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-700 uppercase text-sm font-medium">
                        Session
                      </th>
                      <th className="px-6 py-3 text-center text-gray-700 uppercase text-sm font-medium">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-gray-700 uppercase text-sm font-medium">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-gray-700 uppercase text-sm font-medium">
                        Note
                      </th>
                      <th className="px-6 py-3 text-center text-gray-700 uppercase text-sm font-medium">
                        Passed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {classSessions.map((s: any) => {
                      const a = attendance.find(
                        (att: any) => att.sessionId === s.id
                      );
                      return (
                        <tr
                          key={s.id}
                          className="hover:bg-gray-50 transition-all duration-200"
                        >
                          <td className="px-6 py-4 font-medium text-gray-800">
                            {s.title}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                a?.status === "PRESENT"
                                  ? "bg-green-100 text-green-800"
                                  : a?.status === "ABSENT"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {a?.status || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600">
                            {a?.attendanceTime
                              ? new Date(a.attendanceTime).toLocaleString()
                              : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 whitespace-pre-line">
                            {parseAttendanceNote(a?.note)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {a ? (
                              a.isPassed ? (
                                <FiCheckCircle className="inline text-green-500 w-5 h-5" />
                              ) : (
                                <FiXCircle className="inline text-red-500 w-5 h-5" />
                              )
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ),
          },
          {
            key: "resources",
            label: "Resources",
            content: (
              <div className="p-4">
                {resources.length === 0 ? (
                  <div className="text-gray-500 text-sm">
                    No resources available.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resources.map((r: any) => (
                      <div
                        key={r.id}
                        className="bg-white p-4 rounded-lg shadow border border-gray-100 hover:shadow-md transition flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <FiFile className="text-gray-600 w-5 h-5" />
                          <div className="font-semibold text-gray-800 truncate">
                            {r.name}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          Type: {r.mimeType}
                        </div>
                        <div className="text-xs text-gray-500">
                          Size: {(r.size / 1024).toFixed(1)} KB
                        </div>

                        <div className="flex gap-2 mt-3">
                          {/* <button
                            onClick={() => preview(r)}
                            className="flex-1 px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 flex items-center justify-center gap-1"
                          >
                            👁 Preview
                          </button> */}

                          <button
                            onClick={() => download(r)}
                            className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                          >
                            <FiDownload className="w-4 h-4" /> Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default StudentClassroomDetails;
