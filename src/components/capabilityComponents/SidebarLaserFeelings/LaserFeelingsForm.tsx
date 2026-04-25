import {
  DEFAULT_NUMBER_OF_DICE,
  DEFAULT_YOUR_NUMBER,
  NUMBER_OF_DICE_OPTIONS,
  YOUR_NUMBER_OPTIONS,
  type Formula,
  type Mode,
  type NumberOfDice,
  type YourNumber,
} from "#/capabilities/laserFeelingsCapability";
import { Zap } from "lucide-react";
import { memo, useState } from "react";

type LaserFeelingsFormProps = {
  onRoll: (formula: Formula) => void;
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    className="text-base-content/50 mb-1 text-xs font-semibold tracking-wide
      uppercase"
  >
    {children}
  </p>
);

type SegmentedButtonGroupProps<T extends number> = {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
};

function SegmentedButtonGroup<T extends number>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedButtonGroupProps<T>) {
  return (
    <div className="join" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`btn btn-sm join-item ${
              active ? "btn-primary" : "btn-outline"
            }`}
            aria-pressed={active}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export const LaserFeelingsForm = memo(({ onRoll }: LaserFeelingsFormProps) => {
  const [yourNumber, setYourNumber] = useState<YourNumber>(DEFAULT_YOUR_NUMBER);
  const [numberOfDice, setNumberOfDice] = useState<NumberOfDice>(
    DEFAULT_NUMBER_OF_DICE,
  );

  const handleRoll = (mode: Mode) => {
    onRoll({ yourNumber, numberOfDice, mode });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel>Your number</FieldLabel>
        <SegmentedButtonGroup
          options={YOUR_NUMBER_OPTIONS}
          value={yourNumber}
          onChange={setYourNumber}
          ariaLabel="Your number"
        />
      </div>

      <div>
        <FieldLabel>Number of dice</FieldLabel>
        <SegmentedButtonGroup
          options={NUMBER_OF_DICE_OPTIONS}
          value={numberOfDice}
          onChange={setNumberOfDice}
          ariaLabel="Number of dice"
        />
      </div>

      <button
        type="button"
        onClick={() => handleRoll("lasers")}
        className="btn btn-info mt-2 w-full"
      >
        <Zap className="h-5 w-5" />
        Roll Lasers
      </button>
      <button
        type="button"
        onClick={() => handleRoll("feelings")}
        className="btn btn-secondary w-full"
      >
        <Zap className="h-5 w-5" />
        Roll Feelings
      </button>
      <aside className="prose prose-sm opacity-80">
        {/*<hr />*/}
        <p>
          Based on{" "}
          <a
            href="http://www.onesevendesign.com/laserfeelings/"
            target="_blank"
          >
            Lasers & Feelings
          </a>{" "}
          by John Harper.
        </p>
      </aside>
    </div>
  );
});

LaserFeelingsForm.displayName = "LaserFeelingsForm";
