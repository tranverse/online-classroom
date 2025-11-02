import React from "react";
type Props = {
  name: string;
  className: string;
};

const Heading = ({ name, className }: Props) => {
  return (
    <div className={`text-center font-bold uppercase   ${className}`}>
      {name}
    </div>
  );
};

export default Heading;
