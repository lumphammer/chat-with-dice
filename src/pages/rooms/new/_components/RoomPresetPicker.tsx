import { roomPresets, type RoomPresetName } from "#/roomPresets.tsx";
import { Wrench } from "lucide-react";
import { memo } from "react";

export const RoomPresetPicker = memo(
  ({
    value,
    onChange,
    disabled,
  }: {
    value: RoomPresetName;
    onChange: (type: RoomPresetName) => void;
    disabled?: boolean;
  }) => {
    return (
      <fieldset className="fieldset flex flex-col gap-1" disabled={disabled}>
        <legend className="fieldset-legend">
          <Wrench size="16" />
          Room presets
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(roomPresets).map(
            ([name, { label, description, Icon }]) => {
              const isSelected = value === name;
              return (
                <label
                  key={name}
                  className={`card focus-within:ring-primary/50 cursor-pointer
                  border-2 transition-all focus-within:ring-2 ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-base-300 bg-base-100 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    disabled={disabled}
                    name="roomType"
                    value={name}
                    checked={isSelected}
                    onChange={() => onChange(name as RoomPresetName)}
                    className="sr-only"
                  />
                  <div className="card-body gap-2 p-4">
                    <Icon
                      size={22}
                      className={
                        isSelected
                          ? "text-primary-text"
                          : "text-base-content/50"
                      }
                    />
                    <p
                      className={`leading-tight font-semibold ${
                        isSelected ? "text-primary-text" : ""
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
            },
          )}
        </div>
      </fieldset>
    );
  },
);

RoomPresetPicker.displayName = "RoomPresetPicker";
