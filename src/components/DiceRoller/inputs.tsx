import { memo } from "react";

type InputProps = {
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">;

export const Input = memo(
  ({ value, onChange, placeholder, ...rest }: InputProps) => {
    return (
      <input
        className="input w-12 border-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...rest}
      />
    );
  },
);
