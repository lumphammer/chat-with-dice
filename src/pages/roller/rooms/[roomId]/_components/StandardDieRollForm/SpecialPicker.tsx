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
    const [inputValue, setInputValue] = useState<string>(special);

    // highlightedValue is driven by two sources:
    //   1. Text matching — snaps to best match as the user types.
    //   2. onHighlightChange — lets keyboard nav and mouse hover move it freely.
    // Without round-tripping onHighlightChange back into state, ArkUI's
    // internal highlight updates are ignored and those interactions break.
    const [highlightedValue, setHighlightedValue] = useState<Special>(special);

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
          setHighlightedValue(spec);
          inputRef.current?.focus();
        },
      }),
      [setSpecial],
    );

    // On blur, commit whatever is currently highlighted (which reflects both
    // text-match snapping and any keyboard/mouse navigation the user did).
    // If the highlighted value is still the committed value and the input text
    // doesn't match anything, this is a no-op on special and just reverts the
    // displayed text.
    const handleBlur = useCallback(() => {
      setSpecial(highlightedValue);
      setInputValue(highlightedValue);
    }, [highlightedValue, setSpecial]);

    const valueArray = useMemo(() => [special], [special]);

    return (
      <Combobox.Root
        collection={collection}
        value={valueArray}
        inputValue={inputValue}
        highlightedValue={highlightedValue}
        onHighlightChange={(e) => {
          // Keep our state in sync so keyboard nav and hover work.
          if (e.highlightedValue != null) {
            setHighlightedValue(e.highlightedValue as Special);
          }
        }}
        onValueChange={(e) => {
          if (e.value[0] != null) {
            const val = e.value[0] as Special;
            setSpecial(val);
            setInputValue(val);
            setHighlightedValue(val);
          }
        }}
        onInputValueChange={(e) => {
          setInputValue(e.inputValue);
          // Snap highlight to best text match; fall back to the last committed
          // value so the highlight is never left on a stale item.
          setHighlightedValue(bestMatch(e.inputValue) ?? committedRef.current);
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
