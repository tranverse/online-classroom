import React from "react";

const Heading = ({ name, className }) => {
  return (
    <div className={`text-center font-bold uppercase   ${className}`}>
      {name}
    </div>
  );
};

export default Heading;
