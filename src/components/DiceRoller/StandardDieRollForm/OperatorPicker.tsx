import styles from "../inputs.module.css";
import type { Operator } from "../types";
import { Combobox, createListCollection } from "@ark-ui/react/combobox";
import {
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

type OperatorItem = { label: string; value: Operator };

const OPERATOR_ITEMS: OperatorItem[] = [
  { label: "+", value: "+" },
  { label: "-", value: "-" },
  { label: "×", value: "*" },
  { label: "÷", value: "/" },
];

const DISPLAY: Record<Operator, string> = {
  "+": "+",
  "-": "-",
  "*": "×",
  "/": "÷",
};

const collection = createListCollection<OperatorItem>({
  items: OPERATOR_ITEMS,
  itemToString: (item) => item.label,
  itemToValue: (item) => item.value,
});

export const OperatorPicker = memo(
  ({
    operator,
    setOperator,
    ref,
    onGoToModifier,
  }: {
    operator: Operator;
    setOperator: (val: Operator) => void;
    ref?: React.Ref<{ focusAndSet: (operator: Operator) => void }>;
    onGoToModifier?: (mod: string) => void;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [highlightedValue, setHighlightedValue] = useState<string>(operator);

    useImperativeHandle(
      ref,
      () => ({
        focusAndSet(op: Operator) {
          setOperator(op);
          setHighlightedValue(op);
          inputRef.current?.focus();
        },
      }),
      [setOperator],
    );

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "+") {
          event.preventDefault();
          setOperator("+");
          setHighlightedValue("+");
        } else if (event.key === "-") {
          event.preventDefault();
          setOperator("-");
          setHighlightedValue("-");
        } else if (["/", "÷"].includes(event.key)) {
          event.preventDefault();
          setOperator("/");
          setHighlightedValue("/");
        } else if (["*", "x", "×"].includes(event.key)) {
          event.preventDefault();
          setOperator("*");
          setHighlightedValue("*");
        } else if (/^\d$/.test(event.key)) {
          event.preventDefault();
          onGoToModifier?.(event.key);
        }
      },
      [setOperator, onGoToModifier],
    );

    const valueArray = useMemo(() => [operator], [operator]);

    return (
      <Combobox.Root
        collection={collection}
        value={valueArray}
        inputValue={DISPLAY[operator]}
        highlightedValue={highlightedValue}
        onHighlightChange={(e) => {
          if (e.highlightedValue != null) {
            setHighlightedValue(e.highlightedValue);
          }
        }}
        onValueChange={(e) => {
          if (e.value[0] != null) {
            const val = e.value[0] as Operator;
            setOperator(val);
            setHighlightedValue(val);
          }
        }}
        onInputValueChange={() => {}}
        openOnClick
      >
        <Combobox.Control className="h-full">
          <Combobox.Input
            ref={inputRef}
            className={`${styles.input} h-full text-2xl`}
            aria-label="Operator"
            readOnly
            onKeyDown={handleKeyDown}
          />
        </Combobox.Control>
        <Combobox.Positioner>
          <Combobox.Content
            className="bg-base-200 border-accent border p-1 shadow-2xl
              empty:invisible"
          >
            {OPERATOR_ITEMS.map((item) => (
              <Combobox.Item
                key={item.value}
                item={item}
                className="data-highlighted:bg-accent/30 cursor-pointer p-1
                  text-2xl"
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
