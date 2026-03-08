import { roomTypeOptions } from "#/components/roomTypeOptions";
import type { RoomType } from "#/types";

interface RoomTypePickerProps {
  value: RoomType;
  onChange: (type: RoomType) => void;
}

export const RoomTypePicker = ({ value, onChange }: RoomTypePickerProps) => {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="label-text mb-1 font-medium">Room type</legend>
      <div className="grid grid-cols-2 gap-3">
        {roomTypeOptions.map(({ type, label, description, Icon }) => {
          const isSelected = value === type;
          return (
            <label
              key={type}
              className={`card focus-within:ring-primary/50 cursor-pointer
              border-2 transition-all focus-within:ring-2 ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-base-300 bg-base-100 hover:border-primary/40"
              }`}
            >
              <input
                type="radio"
                name="roomType"
                value={type}
                checked={isSelected}
                onChange={() => onChange(type)}
                className="sr-only"
              />
              <div className="card-body gap-2 p-4">
                <Icon
                  size={22}
                  className={
                    isSelected ? "text-primary" : "text-base-content/50"
                  }
                />
                <p
                  className={`text-sm leading-tight font-semibold ${
                    isSelected ? "text-primary" : ""
                  }`}
                >
                  {label}
                </p>
                <p className="text-base-content/60 text-xs leading-snug">
                  {description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
