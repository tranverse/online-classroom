import React, { useState } from "react";
import SidebarItem from "@layouts/components/SidebarItem";
import { SiGoogleclassroom } from "react-icons/si";
import { PiStudent } from "react-icons/pi";
import { PiChalkboardTeacher } from "react-icons/pi";
import { IoListOutline } from "react-icons/io5";
const initialSidebar = [
  {
    name: "Classroom",
    path: "/classroom",
    icon: SiGoogleclassroom,
    isActive: true,
    child: [
      { name: "Add Classroom", path: "/admin/add-classroom", isActive: false },
      { name: "Classroom List", path: "/add-classroom", isActive: false },
    ],
  },
  {
    name: "Student",
    path: "/student",
    icon: PiStudent,
    isActive: false,
    child: [
      { name: "Add Student", path: "/add-classroom", isActive: false },
      { name: "Student List", path: "/student-list", isActive: false },
    ],
  },
  {
    name: "Teacher",
    path: "/teacher",
    icon: PiChalkboardTeacher,
    isActive: false,
    child: [
      { name: "Add Teacher", path: "/add-teacher", isActive: false },
      { name: "Teacher List", path: "/teacher-list", isActive: false },
    ],
  },
];
const Sidebar = ({ showSidebar, setShowSidebar }) => {
  const [sidebar, setSidebar] = useState(initialSidebar);

  const handleShowSidebarItem = (index) => {
    setSidebar((prev) =>
      prev.map((item, i) =>
        i == index
          ? { ...item, isActive: !item.isActive }
          : {
              ...item,
              isActive: false,
              child: item.child.map((c) => ({ ...c, isActive: false })),
            }
      )
    );
  };

  const handleActiveChildItem = (index, path) => {
    setSidebar((prev) =>
      prev.map((side, i) =>
        index == i
          ? {
              ...side,
              child: side.child?.map((child, i1) =>
                child.path == path
                  ? { ...child, isActive: !child.isActive }
                  : child
              ),
            }
          : side
      )
    );
  };

  return (
    <div className=" ">
      {showSidebar ? (
        <div className="w-60 border-r border-green-500  h-screen  flex flex-col gap-4 ">
          <div className="text-xl font-bold text-[var(--primary-color)] p-3 shadow flex justify-between items-center ">
            <div>Online Classroom</div>
            <IoListOutline
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-3xl cursor-pointer hover:text-[var(--secondary-color)]"
            />
          </div>
          <div>
            {sidebar.map((item, index) => (
              <div key={index} className=" rounded-2xl ">
                <SidebarItem
                  key={index}
                  name={item.name}
                  Icon={item.icon}
                  isActive={item.isActive}
                  onClick={() => handleShowSidebarItem(index)}
                />
                {item.child &&
                  item.isActive &&
                  item.child.map((child, index2) => (
                    <SidebarItem
                      key={index2}
                      name={child.name}
                      path={child.path}
                      isChild={true}
                      isActive={child.isActive}
                      onClick={() => handleActiveChildItem(index, child.path)}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-14 border-r border-green-500  h-screen  flex flex-col gap-4  ">
          <div className="   p-3 shadow flex justify-center items-center ">
            <IoListOutline
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-3xl cursor-pointer hover:text-[var(--secondary-color)] text-[var(--primary-color)]"
            />
          </div>
          <div>
            {sidebar.map((item, index) => (
              <div
                key={index}
                className="  text-2xl flex justify-center  my-4  "
              >
                <item.icon className="cursor-pointer text-[var(--secondary-color)] " />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
