import { Combobox, createListCollection } from "@ark-ui/react/combobox";
import { memo, useCallback, useMemo, useRef, useState } from "react";

export const rollTypes = ["standard", "f20"] as const;
export type RollType = (typeof rollTypes)[number];

type RollTypeItem = { label: string; value: RollType };

const ALL_ITEMS: RollTypeItem[] = [
  { label: "Roll", value: "standard" },
  { label: "F20", value: "f20" },
];

const LABEL: Record<RollType, string> = {
  standard: "Roll",
  f20: "F20",
};

// Always show all options — never filtered.
const collection = createListCollection<RollTypeItem>({
  items: ALL_ITEMS,
  itemToString: (item) => item.label,
  itemToValue: (item) => item.value,
});

/**
 * Match query against the start of each word in a label.
 * Ties broken by whichever matching word appears earlier.
 */
function bestMatch(query: string): RollType | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const scored = ALL_ITEMS.map((item) => ({
    item,
    wordIdx: item.label
      .toLowerCase()
      .split(/\s+/)
      .findIndex((word) => word.startsWith(q)),
  }))
    .filter(({ wordIdx }) => wordIdx !== -1)
    .sort((a, b) => a.wordIdx - b.wordIdx);

  return scored[0]?.item.value ?? null;
}

export const RollTypePicker = memo(
  ({
    rollType,
    setRollType,
  }: {
    rollType: RollType;
    setRollType: (val: RollType) => void;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // inputValue tracks the label text (what the user sees / types),
    // which may differ from the underlying value ("Roll" vs "standard").
    const [inputValue, setInputValue] = useState<string>(LABEL[rollType]);

    // highlightedValue driven by two sources:
    //   1. Text matching — snaps to best match as the user types.
    //   2. onHighlightChange — lets keyboard nav and mouse hover move it freely.
    const [highlightedValue, setHighlightedValue] = useState<RollType>(rollType);

    // Mutable ref so onBlur always reads the latest committed value without
    // the callback needing to be recreated on every render.
    const committedRef = useRef(rollType);
    committedRef.current = rollType;

    const handleBlur = useCallback(() => {
      setRollType(highlightedValue);
      setInputValue(LABEL[highlightedValue]);
    }, [highlightedValue, setRollType]);

    const valueArray = useMemo(() => [rollType], [rollType]);

    return (
      <Combobox.Root
        collection={collection}
        value={valueArray}
        inputValue={inputValue}
        highlightedValue={highlightedValue}
        onHighlightChange={(e) => {
          if (e.highlightedValue != null) {
            setHighlightedValue(e.highlightedValue as RollType);
          }
        }}
        onValueChange={(e) => {
          if (e.value[0] != null) {
            const val = e.value[0] as RollType;
            setRollType(val);
            setInputValue(LABEL[val]);
            setHighlightedValue(val);
          }
        }}
        onInputValueChange={(e) => {
          setInputValue(e.inputValue);
          // Snap highlight to best text match; fall back to last committed
          // value so the highlight is never left on a stale item.
          setHighlightedValue(bestMatch(e.inputValue) ?? committedRef.current);
        }}
        openOnClick
      >
        <Combobox.Control>
          <Combobox.Input
            ref={inputRef}
            className="bg-primary/10 border-base-content/30 field-sizing-content
              w-30 rounded-none border-r px-4 py-2 outline-none"
            aria-label="Roll Type"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onBlur={handleBlur}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => {
              const input = e.currentTarget;
              // Defer re-selection until after ArkUI's openOnClick handler has
              // run — it resets the input internally, which clears the selection.
              setTimeout(() => input.select(), 0);
            }}
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
