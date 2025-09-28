import Home from "@pages/Home";
import MainLayout from "@layouts/MainLayout";
import { CreateClassroom } from "@pages/Admin/Classroom/Classroom";
import ClassroomLayout from "@layouts/ClassroomLayout";
import ClassSession from "@pages/Student/ClassSession";
import Login from "@pages/Auth/Login";
import AuthLayout from "@layouts/AuthLayout";
const routes = [
  // admin
  {
    path: "/",
    Page: Home,
    Layout: MainLayout,
  },
  {
    path: "/admin/add-classroom",
    Page: CreateClassroom,
    Layout: MainLayout,
  },
  // Class session
  {
    path: "/classroom/online",
    Page: ClassSession,
    Layout: ClassroomLayout,
  },
  // auth
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
