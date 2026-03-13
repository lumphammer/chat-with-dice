import styles from "../inputs.module.css";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { memo, useImperativeHandle, useRef } from "react";

// oxlint-disable-next-line eslint/no-magic-numbers
const PRESET_DICE_SIZES = [2, 3, 4, 6, 8, 10, 12, 20, 100];

export const CardinalityPicker = memo(
  ({
    cardinality,
    setCardinality,
    ref,
  }: {
    cardinality: string;
    setCardinality: (val: string) => void;
    ref?: React.Ref<{ focus: () => void }>;
  }) => {
    const handleKeyDown = (_event: React.KeyboardEvent<HTMLInputElement>) => {
      //
    };

    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => {
      return {
        focus() {
          inputRef.current?.focus();
        },
      };
    }, []);

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
          onChange={(event) => {
            const trimmed = event.target.value.replaceAll(/\D+/g, "");
            console.log("ComboboxInput#onChange", trimmed);
            setCardinality(trimmed);
          }}
        />
        <ComboboxOptions anchor="bottom" className="border empty:invisible">
          {PRESET_DICE_SIZES.map((cardi) => (
            <ComboboxOption
              key={cardi}
              value={cardi}
              className="data-focus:bg-blue-100"
            >
              d{cardi}
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </Combobox>
    );
  },
);
