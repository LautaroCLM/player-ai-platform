import React, { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{ className?: string }>;

const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return <div className={"rounded-md shadow-sm " + className}>{children}</div>;
};

export default Card;
export { Card };
