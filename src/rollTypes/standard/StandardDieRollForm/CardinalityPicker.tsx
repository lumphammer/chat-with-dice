import type { Operator } from "./types";
import styles from "@/styles/inputs.module.css";
import { Combobox, createListCollection } from "@ark-ui/react/combobox";
import { memo, useCallback, useImperativeHandle, useMemo, useRef } from "react";

const PRESET_DICE_SIZES = ["2", "3", "4", "6", "8", "10", "12", "20", "100"];

type DiceItem = { label: string; value: string };

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
        // Operator navigation shortcuts — consume and redirect
        if (event.key === "+") {
          event.preventDefault();
          onGoToOperator?.("+");
          return;
        } else if (event.key === "-") {
          event.preventDefault();
          onGoToOperator?.("-");
          return;
        } else if (["/", "÷"].includes(event.key)) {
          event.preventDefault();
          onGoToOperator?.("/");
          return;
        } else if (["*", "×", "x"].includes(event.key)) {
          event.preventDefault();
          onGoToOperator?.("*");
          return;
        }

        // Allow ctrl/meta combos (select-all, copy, cut, paste, undo…)
        if (event.ctrlKey || event.metaKey) return;

        // Allow digits
        if (/^\d$/.test(event.key)) return;

        // Allow navigation and editing keys
        const allowedKeys = [
          "Backspace",
          "Delete",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
          "Tab",
          "Enter",
          "Escape",
        ];
        if (allowedKeys.includes(event.key)) return;

        // Block everything else (letters, punctuation, etc.)
        event.preventDefault();
      },
      [onGoToOperator],
    );

    const handlePaste = useCallback(
      (event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        const digits = event.clipboardData.getData("text").replace(/\D+/g, "");
        if (digits) setCardinality(digits);
      },
      [setCardinality],
    );

    // Rebuild the collection whenever cardinality changes so that a custom
    // (non-preset) value appears as the first selectable option
    const collection = useMemo(() => {
      const items: DiceItem[] = [
        ...(!PRESET_DICE_SIZES.includes(cardinality) && cardinality !== ""
          ? [{ label: `d${cardinality}`, value: cardinality }]
          : []),
        ...PRESET_DICE_SIZES.map((s) => ({ label: `d${s}`, value: s })),
      ];

      return createListCollection<DiceItem>({
        items,
        itemToString: (item) => item.label,
        itemToValue: (item) => item.value,
      });
    }, [cardinality]);

    const valueArray = useMemo(() => [cardinality], [cardinality]);

    return (
      <Combobox.Root
        collection={collection}
        // Controlled selected value (array API)
        value={valueArray}
        // Controlled input text – always rendered as "d{number}"
        inputValue={`d${cardinality}`}
        // Allow values that aren't in the preset list
        allowCustomValue
        // Open the listbox when the user clicks into the input (mirrors
        // HeadlessUI's `immediate` prop)
        openOnClick
        onValueChange={(e) => {
          if (e.value[0] != null) {
            setCardinality(e.value[0]);
          }
        }}
        onInputValueChange={(e) => {
          // Strip everything that isn't a digit, just like the original
          const trimmed = e.inputValue.replaceAll(/\D+/g, "");
          setCardinality(trimmed);
        }}
      >
        <Combobox.Control className="h-full">
          <Combobox.Input
            ref={inputRef}
            className={`${styles.input} h-full`}
            aria-label="Die Size"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={(e) => {
              // Pre-select all text after the leading "d"
              const input = e.target as HTMLInputElement | null;
              input?.setSelectionRange(1, input.value.length);
            }}
          />
        </Combobox.Control>
        <Combobox.Positioner>
          <Combobox.Content
            className="bg-base-200 border-accent border p-1 shadow-2xl
              empty:invisible"
          >
            {collection.items.map((item) => (
              <Combobox.Item
                key={item.value}
                item={item}
                className="data-highlighted:bg-accent/30 cursor-pointer p-1"
              >
                <Combobox.ItemText>{item.label}</Combobox.ItemText>
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Combobox.Root>
    );
  },
);
