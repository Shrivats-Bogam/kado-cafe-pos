import { forwardRef } from "react";

export const TextInput = forwardRef(function TextInput(
  { value, onChange, placeholder, type = "text", className = "", error, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full rounded-xl bg-stone-800 border ${
        error ? "border-rose-500 focus:ring-rose-500" : "border-stone-700 focus:ring-amber-500"
      } px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 transition-colors ${className}`}
      {...rest}
    />
  );
});
