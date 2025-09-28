import React from "react";
import { CiUser } from "react-icons/ci";
import { CiSettings } from "react-icons/ci";
import { IoIosNotificationsOutline } from "react-icons/io";
const Header = () => {
  return (
    <div className=" border-b border-b-green-500   py-2 px-4   mx-auto  ">
      <div className="flex justify-between items-center ">
        <div>
          <input type="text" placeholder="Search" />
        </div>
        <div className="flex gap-2 text-3xl ">
          <div>
            <CiUser />
          </div>
          <div>
            <CiSettings />
          </div>
          <div>
            <IoIosNotificationsOutline />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
