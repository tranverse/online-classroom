import React, { useState } from "react";
import axios from "@tools/axios.tool";
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
              try {
                const base = getApiBase();
                const endpoint = `${base}/api/class-session/${id}/attendance/me`;
                const response = await axios.get(endpoint);
                const json = response?.data;
                const info = json?.data;
                if (info && info.isPassed) {
                  setAttended(true);
                  setAttendanceInfo(info);
                } else {
                  alert(
                    "You haven't been marked present yet. Please mark attendance."
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
