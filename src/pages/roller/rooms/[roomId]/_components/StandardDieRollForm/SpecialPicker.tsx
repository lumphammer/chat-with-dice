import styles from "../inputs.module.css";
import type { Special } from "../types";
import { Combobox, createListCollection } from "@ark-ui/react/combobox";
import {
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

type SpecialItem = { label: string; value: Special };

const ALL_ITEMS: SpecialItem[] = [
  { label: "Normal", value: "Normal" },
  { label: "With Advantage", value: "With Advantage" },
  { label: "With Disadvantage", value: "With Disadvantage" },
  { label: "Exploding", value: "Exploding" },
];

// Always show all options — never filtered.
const collection = createListCollection<SpecialItem>({
  items: ALL_ITEMS,
  itemToString: (item) => item.label,
  itemToValue: (item) => item.value,
});

/**
 * Match query against the start of each word in a label.
 * "adv" matches "With **Adv**antage" but NOT "With Dis**adv**antage".
 * Ties are broken by whichever matching word appears earlier in the label.
 */
function bestMatch(query: string): Special | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const scored = ALL_ITEMS.map((item) => ({
    item,
    wordIdx: item.value
      .toLowerCase()
      .split(/\s+/)
      .findIndex((word) => word.startsWith(q)),
  }))
    .filter(({ wordIdx }) => wordIdx !== -1)
    .sort((a, b) => a.wordIdx - b.wordIdx);

  return scored[0]?.item.value ?? null;
}

export const SpecialPicker = memo(
  ({
    special,
    setSpecial,
    ref,
  }: {
    special: Special;
    setSpecial: (value: Special) => void;
    ref?: React.Ref<{ focusAndSet: (spec: Special) => void }>;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState(special);

    // Mutable ref so onBlur always reads the latest committed value without
    // the callback needing to be recreated on every render.
    const committedRef = useRef(special);
    committedRef.current = special;

    useImperativeHandle(
      ref,
      () => ({
        focusAndSet(spec: Special) {
          setSpecial(spec);
          setInputValue(spec);
          inputRef.current?.focus();
        },
      }),
      [setSpecial],
    );

    const match = useMemo(() => bestMatch(inputValue), [inputValue]);

    const handleBlur = useCallback(() => {
      if (match != null) {
        // Commit the best match the user was hovering over.
        setSpecial(match);
        setInputValue(match);
      } else {
        // Nothing matched — revert to whatever was last committed.
        setInputValue(committedRef.current);
      }
    }, [match, setSpecial]);

    return (
      <Combobox.Root
        collection={collection}
        value={[special]}
        inputValue={inputValue}
        // Snap the dropdown highlight to the best match without committing.
        highlightedValue={match ?? special}
        onValueChange={(e) => {
          if (e.value[0] != null) {
            const val = e.value[0] as Special;
            setSpecial(val);
            setInputValue(val);
          }
        }}
        onInputValueChange={(e) => {
          setInputValue(e.inputValue);
        }}
        openOnClick
      >
        <Combobox.Control className="h-full w-auto">
          <Combobox.Input
            ref={inputRef}
            className={`${styles.input} h-full w-auto`}
            aria-label="Special"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onBlur={handleBlur}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
          />
        </Combobox.Control>
        <Combobox.Positioner>
          <Combobox.Content
            className="bg-base-200 border-accent border p-1 shadow-2xl
              empty:invisible"
          >
            {ALL_ITEMS.map((item) => (
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
