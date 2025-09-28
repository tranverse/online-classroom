import React from "react";
import InputField from "@components/Form/InputField";
import Form from "@components/Form";
import { IoMdSend } from "react-icons/io";
const Chatbox = () => {
  return (
    <div className="bg-red shadow shadow-black/20 rounded-lg p-2  h-full flex flex-col justify-end ">
      <div>chat</div>
      <div className="mt-auto border border-gray-400 rounded flex items-center gap-4 px-2 p-1 justify-between ">
        <input
          type="text"
          placeholder="Type message .... "
          className="outline-none w-full "
        />
        <IoMdSend className="cursor-pointer text-xl " />
      </div>
    </div>
  );
};

export default Chatbox;
