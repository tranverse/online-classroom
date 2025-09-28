import React, { useState } from "react";
import { pass } from "@config/api";
import { InfisicalSDK } from "@infisical/sdk";
import { FiUserPlus } from "react-icons/fi";
import { SlCamrecorder } from "react-icons/sl";
import { IoExitOutline } from "react-icons/io5";
import { TbScreenShare } from "react-icons/tb";
import Chatbox from "./components/Chatbox";
import { IoIosSend } from "react-icons/io";
import { BsEraserFill } from "react-icons/bs";
import { RxText } from "react-icons/rx";
import { FaPenClip } from "react-icons/fa6";
import { RiArrowGoBackFill } from "react-icons/ri";
import { RiArrowGoForwardFill } from "react-icons/ri";
import { MdDashboard } from "react-icons/md";
import { PiProjectorScreenLight } from "react-icons/pi";
import { RiArrowLeftSLine } from "react-icons/ri";
import { RiArrowRightSLine } from "react-icons/ri";
import SelfView from "./components/SelfView";
import GridView from "./components/GridView";
import { GiAerialSignal } from "react-icons/gi";
import { HiOutlineUsers } from "react-icons/hi2";
import { BsChatLeftText } from "react-icons/bs";
import { MdCallEnd } from "react-icons/md";
import { RiArrowRightDoubleFill } from "react-icons/ri";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { set } from "react-hook-form";
const ClassSession = () => {
  const [showUsers, setShowUsers] = useState(false);
  const [showChatbox, setShowChatbox] = useState(true);

  return (
    <div className="flex flex-col h-screen ">
      {/* live */}
      <div className="shadow  flex justify-between items-center p-2 py-2 px-6 ">
        <div className="flex justify-center items-center gap-2 ">
          <GiAerialSignal />
          <p>Started: 5:01</p>
        </div>
        <div className="flex gap-4  text-lg float-right  ">
          <FiUserPlus />
          <SlCamrecorder />
          <IoExitOutline />
          <TbScreenShare />
          <MdDashboard />
        </div>
      </div>

      <div className="flex justify-between gap-2 p-1 flex-1 rounded-2xl">
        <div className={`flex gap-2   ${showUsers || showChatbox ? "w-4/5" : "w-full"} `}>
          <section className="flex-1 flex flex-col justify-end p-1 relative   mx-1 ">
            <div className="flex flex-col gap-4 text-xl border border-gray-300 p-2 absolute top-1/2 -translate-y-1/2 ">
              <IoIosSend className="cursor-pointer" />
              <BsEraserFill className="cursor-pointer" />
              <RxText className="cursor-pointer" />
              <FaPenClip className="cursor-pointer" />
            </div>

            <div>whiteboard</div>

            <div className="flex justify-between items-center  mt-auto ">
              <div className="flex shadow border border-gray-300 p-1 gap-2 ">
                <RiArrowGoBackFill />
                <RiArrowGoForwardFill />
              </div>
              <div className="flex gap-4 text-2xl">
                <HiOutlineUsers
                  onClick={() => {
                    setShowUsers(!showUsers);
                    setShowChatbox(false);
                  }}
                  className="cursor-pointer"
                />
                <MdCallEnd />
                <BsChatLeftText
                  onClick={() => {
                    setShowChatbox(!showChatbox);
                    setShowUsers(false);
                  }}
                  className="cursor-pointer"
                />
              </div>
              <div className="flex border border-gray-300 items-center justify-center shadow p-1">
                <div className="flex gap-2 items-center justify-center  p-1 ">
                  <RiArrowLeftSLine className="cursor-pointer text-xl" />
                  <input
                    type="text"
                    className="outline-none w-6"
                    defaultValue="1/2"
                  />
                  <RiArrowRightSLine className="cursor-pointer text-xl" />
                </div>
                <PiProjectorScreenLight className="text-xl " />
              </div>
            </div>
          </section>
        </div>
        {showUsers || showChatbox ? (
          <div className="flex flex-col gap-4 w-1/5 relative">
            <div
              onClick={() => {
                setShowUsers(false);
                setShowChatbox(false);
              }}
              className="absolute border h-10 flex items-center top-1/2 -translate-y-1/2 
           cursor-pointer rounded border-gray-300  -left-4 bg-white  "
            >
              <RiArrowRightDoubleFill />
            </div>
            <div className="h-full">
              {showUsers ? <GridView /> : <Chatbox />}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4  relative">
            <div
              onClick={() => {
                setShowChatbox(true);
              }}
              className="absolute border h-10 flex items-center top-1/2 -translate-y-1/2 
           cursor-pointer rounded border-gray-300  -left-4 bg-white  "
            >
              <MdKeyboardDoubleArrowLeft />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassSession;
