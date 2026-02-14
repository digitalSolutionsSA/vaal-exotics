import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function Container({ children, className = "" }: Props) {
  return (
    <div
      className={[
        "mx-auto w-full max-w-[1600px]",
        "px-4 sm:px-6 lg:px-10 2xl:px-16",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
