import { memo } from "react";

type InputProps = {
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">;

export const Input = memo(
  ({ value, onChange, placeholder, ...rest }: InputProps) => {
    return (
      <input
        className="bg-base-100 border-base-300 placeholder:text-base-content/40
          min-w-25 flex-1 border-b px-4 py-2 outline-none sm:border-r
          sm:border-b-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...rest}
      />
    );
  },
);
