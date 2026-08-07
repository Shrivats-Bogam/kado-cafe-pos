import { useState } from "react";

export function Tooltip({ text, children, position = "top" }) {
  const [show, setShow] = useState(false);

  const posClasses = {
    top: "-top-8 left-1/2 -translate-x-1/2",
    bottom: "-bottom-8 left-1/2 -translate-x-1/2",
    left: "top-1/2 -left-2 -translate-x-full -translate-y-1/2",
    right: "top-1/2 -right-2 translate-x-full -translate-y-1/2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && text && (
        <div className={`absolute z-50 px-2 py-1 text-[10px] font-semibold text-stone-100 bg-stone-950 border border-stone-800 rounded-lg shadow-xl whitespace-nowrap pointer-events-none ${posClasses[position]}`}>
          {text}
        </div>
      )}
    </div>
  );
}
