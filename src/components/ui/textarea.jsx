import { forwardRef } from "react";

export const TextArea = forwardRef(function TextArea(
  { value, onChange, placeholder, rows = 3, className = "", error, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`w-full rounded-xl bg-stone-800 border ${
        error ? "border-rose-500 focus:ring-rose-500" : "border-stone-700 focus:ring-amber-500"
      } px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 transition-colors resize-none ${className}`}
      {...rest}
    />
  );
});
