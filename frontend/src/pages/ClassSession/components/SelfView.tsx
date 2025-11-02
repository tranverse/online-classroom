import React from "react";
import { BsMicMuteFill } from "react-icons/bs";
const SelfView = () => {
  return (
    <div className="bg-blue-50 h-40 w-full shadow rounded    relative   flex justify-end items-end">
      <div className="flex justify-between items-center w-full absolute p-1   ">
        <p>Name</p>

        <div className="w-8 h-8 bg-gray-200 flex justify-center items-center rounded-full cursor-pointer">
          <BsMicMuteFill />
        </div>
      </div>
    </div>
  );
};

export default SelfView;
