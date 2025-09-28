import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

const MainLayout = ({ children }) => {
  const [showSidebar, setShowSidebar] = useState(true);
  return (
    <div>
      <Sidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
      ></Sidebar>
      <div
        className={`fixed right-0  top-0 ${
          showSidebar ? "left-60" : "left-14"
        }`}
      >
        <Header></Header>
        <div className=" p-8  h-screen  ">{children}</div>
      </div>
    </div>
  );
};

export default MainLayout;
