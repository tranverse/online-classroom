import React from "react";

const SubmitButton = ({ name }) => {
  return (
    <div>
      <button
        className="w-full p-2 bg-green-500 text-white text-lg font-semibold cursor-pointer 
      hover:bg-[var(--secondary-color)] "
      >
        {name}
      </button>
    </div>
  );
};

export default SubmitButton;
