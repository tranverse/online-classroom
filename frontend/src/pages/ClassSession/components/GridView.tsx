import React from "react";
import SelfView from "./SelfView";
const GridView = () => {
  return (
    <div className="flex flex-col gap-2 w-full border border-gray-300 h-full rounded-lg shadow ">
      <SelfView />
      <SelfView />
    </div>
  );
};

export default GridView;
