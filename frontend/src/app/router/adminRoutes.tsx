import { RouteObject } from "react-router-dom";
import React from "react";

import { AdminDashboard } from "../pages/Admin/Dashboard";
import { UsersPage } from "../pages/Admin/Users";
import { ClassroomsPage } from "../pages/Admin/Classrooms";
import { SessionsPage } from "../pages/Admin/Sessions";
import { AttendancePage } from "../pages/Admin/Attendance";

export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: "users",
        element: <UsersPage />,
      },
      {
        path: "classrooms",
        element: <ClassroomsPage />,
      },
      {
        path: "sessions",
        element: <SessionsPage />,
      },
      {
        path: "attendance",
        element: <AttendancePage />,
      },
    ],
  },
];
