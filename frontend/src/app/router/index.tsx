import Home from "@pages/Home";
import TeacherDashboard from "@pages/Teacher/Dashboard";
import MainLayout from "@layouts/MainLayout";
import ClassroomLayout from "@layouts/ClassroomLayout";
import ClassSessionEntry from "@pages/ClassSession/ClassSessionEntry";
import Login from "@pages/Auth/Login";
import AuthLayout from "@layouts/AuthLayout";
import TeacherLayout from "@layouts/TeacherLayout";
import StudentLayout from "@layouts/StudentLayout";
import StudentDashboard from "@pages/Student/Dashboard";
import AdminLayout from "@layouts/AdminLayout";
import TeacherClassroomDetails from "@pages/Teacher/ClassroomDetails";
import PublicClassroomDetails from "@pages/Classroom/PublicDetails";

// Admin pages
import { AdminDashboard } from "@pages/Admin/Dashboard";
import { UsersPage } from "@pages/Admin/Users";
import { ClassroomsPage } from "@pages/Admin/Classrooms";

import { SessionsPage } from "@pages/Admin/Sessions";
import { AttendancePage } from "@pages/Admin/Attendance";
import ClassroomDetailsPage from "@pages/Admin/ClassroomDetails";
import AdminAssignments from "@pages/Admin/Assignments";

//student
import ProfilePage from "@pages/Student/Profile";
import ClassroomDetails from "@pages/Student/ClassroomDetails";
import ProfileAttendance from "@pages/Student/ProfileAttendance";
import AttendanceUpload from "@pages/Student/AttendanceUpload";
import FilesPage from "@pages/Student/Files";
import StudentAssignments from "@pages/Student/Assignments";
import TeacherClassrooms from "@pages/Teacher/TeacherClassrooms";
import TeacherAssignmentPage from "@pages/Assignment/Assignment";
import TeacherResourcesPage from "@pages/Teacher/Resources";
import StudentClassroomsPage from "@pages/Student/Classrooms";
import StudentClassroomDetails from "@pages/Student/ClassroomDetails";
import TeacherProfile from "@pages/Teacher/TeacherProfile";
import TeacherFile from "@pages/Teacher/Files";

const routes = [
  // Admin Panel
  {
    path: "/admin",
    Page: AdminDashboard,
    Layout: AdminLayout,
  },
  {
    path: "/admin/users",
    Page: UsersPage,
    Layout: AdminLayout,
  },
  {
    path: "/admin/classrooms",
    Page: ClassroomsPage,
    Layout: AdminLayout,
  },
  {
    path: "/admin/classrooms/:id",
    Page: ClassroomDetailsPage,
    Layout: AdminLayout,
  },
  {
    path: "/admin/sessions",
    Page: SessionsPage,
    Layout: AdminLayout,
  },
  {
    path: "/admin/assignments",
    Page: AdminAssignments,
    Layout: AdminLayout,
  },
  {
    path: "/admin/attendance",
    Page: AttendancePage,
    Layout: AdminLayout,
  },
  // Class session (entry gate with attendance)
  {
    path: "/classroom/online/:id",
    Page: ClassSessionEntry,
    Layout: ClassroomLayout,
  },
  // public/student accessible classroom URL
  {
    path: "/classroom/:id",
    Page: PublicClassroomDetails,
    Layout: ClassroomLayout,
  },
  // Teacher area
  {
    path: "/teacher",
    Page: TeacherDashboard,
    Layout: TeacherLayout,
  },
  {
    path: "/teacher/classrooms/user/:id",
    Page: TeacherClassrooms,
    Layout: TeacherLayout,
  },
  {
    path: "/teacher/classrooms/:id",
    Page: TeacherClassroomDetails,
    Layout: TeacherLayout,
  },
  {
    path: "/teacher/classrooms/:id/assignments",
    Page: TeacherAssignmentPage,
    Layout: TeacherLayout,
  },
  {
    path: "/teacher/classrooms/:id/resources",
    Page: TeacherResourcesPage,
    Layout: TeacherLayout,
  },
  {
    path: "/teacher/profile",
    Page: TeacherProfile,
    Layout: TeacherLayout,
  },
  {
    path: "/teacher/files",
    Page: TeacherFile,
    Layout: TeacherLayout,
  },
  // Student area
  {
    path: "/student",
    Page: StudentDashboard,
    Layout: StudentLayout,
  },
  {
    path: "/student/dashboard",
    Page: StudentDashboard,
    Layout: StudentLayout,
  },
  {
    path: "/student/classrooms",
    Page: ClassroomsPage,
    Layout: StudentLayout,
  },
  {
    path: "/student/classrooms/user/:id",
    Page: StudentClassroomsPage,
    Layout: StudentLayout,
  },
  {
    path: "/student/classrooms/detail/user/:id",
    Page: StudentClassroomDetails,
    Layout: StudentLayout,
  },
  {
    path: "/student/classrooms/:id",
    Page: ClassroomDetails,
    Layout: StudentLayout,
  },
  {
    path: "/student/profile",
    Page: ProfilePage,
    Layout: StudentLayout,
  },
  {
    path: "/student/profile-attendance",
    Page: AttendanceUpload,
    Layout: StudentLayout,
  },
  {
    path: "/student/files",
    Page: FilesPage,
    Layout: StudentLayout,
  },
  {
    path: "/student/assignments",
    Page: StudentAssignments,
    Layout: StudentLayout,
  },
  // Auth
  {
    path: "/login",
    Page: Login,
    Layout: AuthLayout,
  },
];

export default routes.map((route) => {
  const { Page, Layout } = route;
  return {
    path: route.path,
    element: (
      <Layout>
        <Page />
      </Layout>
    ),
  };
});
