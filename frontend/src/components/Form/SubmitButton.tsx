import React from "react";

type Props = {
  name: string;
  type: "submit" | "reset" | "button";
};

const SubmitButton = ({ name, type }: Props) => {
  return (
    <div>
      <button
        type={type}
        className="w-full p-2 bg-green-500 text-white text-lg font-semibold cursor-pointer 
      hover:bg-[var(--secondary-color)] "
      >
        {name}
      </button>
    </div>
  );
};

export default SubmitButton;
