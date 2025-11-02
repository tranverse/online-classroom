import React, { useState } from "react";
import { useParams } from "react-router-dom";
import AttendanceCapture from "./components/AttendanceCapture";
import ClassSession from "./index";

const ClassSessionEntry: React.FC = () => {
  const { id } = useParams();
  const [attended, setAttended] = useState(false);
  const [attendanceInfo, setAttendanceInfo] = useState<any>(null);

  const getApiBase = () => {
    try {
      const win = window as any;
      if (win.__env && win.__env.VITE_SERVER_URL)
        return win.__env.VITE_SERVER_URL;
      if (
        typeof (process as any) !== "undefined" &&
        (process as any).env?.REACT_APP_API_URL
      )
        return (process as any).env.REACT_APP_API_URL;
      if (win.__VITE_SERVER_URL) return win.__VITE_SERVER_URL;
      // last resort: use current origin so relative fetches work in same host
      return window.location.origin || "";
    } catch (e) {
      return "";
    }
  };

  if (!id) return <div>Missing class session id</div>;

  if (!attended) {
    return (
      <div className="p-4">
        <h2 className="text-xl mb-4">
          Before entering the live session, please mark attendance
        </h2>
        <AttendanceCapture
          classSessionId={id}
          userId={localStorage.getItem("userId") || undefined}
          apiUrl={getApiBase()}
          onSuccess={(info) => {
            // mark attended immediately when backend reports success
            setAttended(true);
            setAttendanceInfo(info);
          }}
        />
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            After successful attendance, click "Enter".
          </p>
          <button
            onClick={async () => {
              // Try to verify attendance status by calling backend list and checking latest record for this user
              try {
                const base = getApiBase();
                const token = localStorage.getItem("token");
                const res = await fetch(
                  `${base}/api/class-session/${id}/attendance`,
                  {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  }
                );
                const json = await res.json();
                const list = json.data || [];
                const userId = localStorage.getItem("userId");
                const found = list.find(
                  (a: any) =>
                    a.isPassed === true &&
                    (!userId || (a.student && a.student.id === userId))
                );
                if (found) {
                  setAttended(true);
                  setAttendanceInfo(found);
                } else {
                  alert(
                    "No successful attendance found yet. Please mark attendance."
                  );
                }
              } catch (err) {
                console.error(err);
                alert("Failed to verify attendance");
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Enter Session
          </button>
        </div>
      </div>
    );
  }

  return <ClassSession />;
};

export default ClassSessionEntry;
