import { forwardRef } from "react";

export const Select = forwardRef(function Select(
  { value, onChange, children, className = "", error, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      value={value}
      onChange={onChange}
      className={`w-full rounded-xl bg-stone-800 border ${
        error ? "border-rose-500 focus:ring-rose-500" : "border-stone-700 focus:ring-amber-500"
      } px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 transition-colors ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});
