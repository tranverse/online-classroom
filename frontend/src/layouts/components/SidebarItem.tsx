import React from "react";
import { Link } from "react-router-dom";
import { IoIosArrowDown } from "react-icons/io";
import { MdArrowBackIosNew } from "react-icons/md";
import { IconType } from "react-icons";
type Props = {
  name: string;
  Icon: IconType;
  path: string;
  isChild: boolean;
  isActive: boolean;
  onClick: () => void;
};

const SidebarItem = ({
  name,
  Icon,
  path,
  isChild = false,
  isActive,
  onClick,
}: Props) => {
  const handleOnclick = () => {
    onClick();
  };
  return (
    <div
      onClick={handleOnclick}
      className={`my-2 cursor-pointer  rounded-lg flex items-center justify-between  ${
        isActive
          ? "bg-[var(--background-color)] text-[var(--text-color)]"
          : "hover:bg-gray-100"
      }`}
    >
      <div className="flex gap-4  items-center px-4 py-2">
        {Icon && (
          <div className="text-2xl">
            <Icon />
          </div>
        )}
        <Link to={path}>
          <div className={`${isChild ? "pl-10 " : ""}`}>{name}</div>
        </Link>
      </div>
      <div className="mr-4">
        {!isChild && (!isActive ? <IoIosArrowDown /> : <MdArrowBackIosNew />)}
      </div>
    </div>
  );
};

export default SidebarItem;
