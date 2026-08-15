import { Menu } from "@ark-ui/react/menu";
import { NumberInput } from "@ark-ui/react/number-input";
import { Portal } from "@ark-ui/react/portal";
import { ChevronsDown, ChevronsUp, EllipsisVertical } from "lucide-react";

type NumberComboProps = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  // Values offered in the ⋮ menu for a two-click pick. Free typing and the
  // steppers cover everything outside this list.
  quickOptions: readonly number[];
  ariaLabel: string;
};

// Ark's NumberInput owns the step/type/clamp/keyboard behaviour and lays its
// parts out as flex siblings — no absolute positioning to go wonky. The Menu is
// portalled and auto-positioned so the sidebar can't clip it. Double chevrons
// (not +/−) keep the steppers visually distinct from the modifier's +/−
// operators sitting alongside.
//
// The whole row has to survive a ~230px sidebar column on a 375px phone, which
// takes two things. All three chrome buttons are `btn-square`, so each is one
// `--size` square around its icon rather than a slab of `--btn-p` either side of
// it. And the input carries `min-w-0`: daisyUI's `.btn` is `flex-shrink: 0`, so
// the input is the only elastic item here, and a width utility on it would floor
// the whole row via `min-width: auto` and make it inelastic too.
export const NumberCombo = ({
  value,
  onChange,
  min,
  max,
  quickOptions,
  ariaLabel,
}: NumberComboProps) => (
  <NumberInput.Root
    value={String(value)}
    min={min}
    max={max}
    clampValueOnBlur
    onValueChange={(details) => {
      if (!Number.isNaN(details.valueAsNumber)) onChange(details.valueAsNumber);
    }}
    className="join flex items-stretch"
  >
    <NumberInput.DecrementTrigger
      className="btn btn-sm btn-neutral btn-square join-item"
      aria-label={`Decrease ${ariaLabel}`}
    >
      <ChevronsDown className="h-4 w-4" />
    </NumberInput.DecrementTrigger>

    <NumberInput.Input
      className="input input-sm join-item min-w-0 flex-1 text-center text-lg
        font-bold"
      aria-label={ariaLabel}
    />

    <Menu.Root onSelect={(details) => onChange(Number(details.value))}>
      <Menu.Trigger
        className="btn btn-sm btn-ghost btn-square join-item"
        aria-label={`Choose ${ariaLabel} from list`}
      >
        <EllipsisVertical className="h-4 w-4" />
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            className="bg-base-100 border-base-content/10 rounded-box z-50
              min-w-16 overflow-y-auto border p-1 shadow-lg focus:outline-none"
          >
            {quickOptions.map((option) => (
              <Menu.Item
                key={option}
                value={String(option)}
                className={`hover:bg-base-200 data-highlighted:bg-base-200
                cursor-pointer rounded px-3 py-1.5 text-center ${
                  option === value ? "text-primary font-bold" : ""
                }`}
              >
                {option}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>

    <NumberInput.IncrementTrigger
      className="btn btn-neutral btn-sm btn-square join-item"
      aria-label={`Increase ${ariaLabel}`}
    >
      <ChevronsUp className="h-4 w-4" />
    </NumberInput.IncrementTrigger>
  </NumberInput.Root>
);
