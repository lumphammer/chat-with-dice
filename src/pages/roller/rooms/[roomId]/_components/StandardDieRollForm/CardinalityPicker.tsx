import styles from "../inputs.module.css";
import type { Operator } from "../types";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { memo, useCallback, useImperativeHandle, useRef } from "react";

// oxlint-disable-next-line eslint/no-magic-numbers
const PRESET_DICE_SIZES = ["2", "3", "4", "6", "8", "10", "12", "20", "100"];

export const CardinalityPicker = memo(
  ({
    cardinality,
    setCardinality,
    ref,
    onGoToOperator,
  }: {
    cardinality: string;
    setCardinality: (val: string) => void;
    ref?: React.Ref<{ focus: () => void }>;
    onGoToOperator?: (op: Operator) => void;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => {
      return {
        focus() {
          inputRef.current?.focus();
        },
      };
    }, []);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "+") {
          event.preventDefault();
          onGoToOperator?.("+");
        } else if (event.key === "-") {
          event.preventDefault();
          onGoToOperator?.("-");
        } else if (["/", "÷"].includes(event.key)) {
          event.preventDefault();
          onGoToOperator?.("/");
        } else if (["*", "x", "×"].includes(event.key)) {
          event.preventDefault();
          onGoToOperator?.("*");
        }
      },
      [onGoToOperator],
    );

    return (
      <Combobox
        value={cardinality}
        immediate
        onChange={(val) => {
          if (val !== null) {
            console.log("Combobox#onChange", val);
            setCardinality(val);
          }
        }}
      >
        <ComboboxInput
          ref={inputRef}
          className={styles.input}
          aria-label="Die Size"
          displayValue={(cardi: number) => `d${cardi}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            // preselect all the text except the first "d"
            const input = e.target as HTMLInputElement | null;
            input?.setSelectionRange(1, input.value.length);
          }}
          onChange={(event) => {
            const trimmed = event.target.value.replaceAll(/\D+/g, "");
            console.log("ComboboxInput#onChange", trimmed);
            setCardinality(trimmed);
          }}
        />
        <ComboboxOptions
          anchor="bottom"
          className="border empty:invisible"
          modal={false}
        >
          {!PRESET_DICE_SIZES.includes(cardinality) && (
            <ComboboxOption
              value={cardinality}
              // className="data-focus:bg-blue-100"
            >
              d{cardinality}
            </ComboboxOption>
          )}
          {PRESET_DICE_SIZES.map((cardi) => (
            <ComboboxOption
              key={cardi}
              value={cardi}
              // className="data-focus:bg-blue-100"
            >
              d{cardi}
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </Combobox>
    );
  },
);
