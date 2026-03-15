import { Combobox, createListCollection } from "@ark-ui/react/combobox";
import {
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * A label/value pair for use with {@link MatchCombobox}.
 *
 * `label` is what the user sees and types to search against.
 * `value` is the committed internal value, which may differ from the label
 * (e.g. `{ label: "Roll", value: "standard" }`).
 */
export type MatchItem<V extends string = string> = {
  label: string;
  value: V;
};

/**
 * Match query against the start of each word in a label.
 * "adv" matches "With **Adv**antage" but NOT "With Dis**adv**antage".
 * Ties are broken by whichever matching word appears earlier in the label.
 */
function bestMatch<V extends string>(
  query: string,
  items: ReadonlyArray<MatchItem<V>>,
): V | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Exact label match takes priority — handles multi-word labels like
  // "With Advantage" where no single word starts with the full query.
  const exact = items.find((item) => item.label.toLowerCase() === q);
  if (exact) return exact.value;

  const scored = items
    .map((item) => ({
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

function getLabelOf<V extends string>(
  val: V,
  items: ReadonlyArray<MatchItem<V>>,
): string {
  return items.find((item) => item.value === val)?.label ?? val;
}

/**
 * Ref handle exposed by {@link MatchCombobox}, allowing a parent to
 * programmatically focus the input and set the committed value in one step.
 */
export type MatchComboboxRef<V extends string> = {
  /** Focus the input and commit `val`, updating both the displayed label and
   *  the highlighted item to match. */
  focusAndSet(val: V): void;
};

type MatchComboboxProps<V extends string> = {
  items: ReadonlyArray<MatchItem<V>>;
  value: V;
  onValueChange: (val: V) => void;
  /** className applied to Combobox.Control */
  controlClassName?: string;
  /** className applied to Combobox.Input */
  inputClassName?: string;
  ariaLabel?: string;
  ref?: React.Ref<MatchComboboxRef<V>>;
};

/**
 * A searchable combobox that always shows all options — the list is never
 * filtered. As the user types, the dropdown highlight snaps to the best
 * word-start match ("adv" → "With **Adv**antage", not "With Dis**adv**antage").
 * On blur or Enter the highlighted option is committed; if nothing matched the
 * input text, the displayed label reverts to the last committed value.
 *
 * Pass a stable (module-level) `items` array to avoid rebuilding the
 * collection on every render.
 */
function MatchComboboxImpl<V extends string>({
  items,
  value,
  onValueChange,
  controlClassName,
  inputClassName,
  ariaLabel,
  ref,
}: MatchComboboxProps<V>) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState<string>(() =>
    getLabelOf(value, items),
  );

  // highlightedValue is driven by two sources:
  //   1. Text matching — snaps to best match as the user types.
  //   2. onHighlightChange — lets keyboard nav and mouse hover move it freely.
  // Without round-tripping onHighlightChange back into state, ArkUI's
  // internal highlight updates are ignored and those interactions break.
  const [highlightedValue, setHighlightedValue] = useState<V>(value);

  // Mutable ref so onBlur always reads the latest committed value without
  // the callback needing to be recreated on every render.
  const committedRef = useRef(value);
  committedRef.current = value;

  useImperativeHandle(
    ref,
    () => ({
      focusAndSet(val: V) {
        onValueChange(val);
        setInputValue(getLabelOf(val, items));
        setHighlightedValue(val);
        inputRef.current?.focus();
      },
    }),
    [onValueChange, items],
  );

  const collection = useMemo(
    () =>
      createListCollection({
        items: [...items],
        itemToString: (item) => item.label,
        itemToValue: (item) => item.value,
      }),
    [items],
  );

  const valueArray = useMemo(() => [value], [value]);

  // On blur, commit whatever is currently highlighted (which reflects both
  // text-match snapping and any keyboard/mouse navigation the user did).
  const handleBlur = useCallback(() => {
    onValueChange(highlightedValue);
    setInputValue(getLabelOf(highlightedValue, items));
  }, [highlightedValue, onValueChange, items]);

  return (
    <Combobox.Root
      collection={collection}
      value={valueArray}
      inputValue={inputValue}
      highlightedValue={highlightedValue}
      onHighlightChange={(e) => {
        if (e.highlightedValue != null) {
          setHighlightedValue(e.highlightedValue as V);
        }
      }}
      onValueChange={(e) => {
        if (e.value[0] != null) {
          const val = e.value[0] as V;
          onValueChange(val);
          setInputValue(getLabelOf(val, items));
          setHighlightedValue(val);
        }
      }}
      onInputValueChange={(e) => {
        setInputValue(e.inputValue);
        // Snap highlight to best text match; fall back to the last committed
        // value so the highlight is never left on a stale item.
        setHighlightedValue(
          bestMatch(e.inputValue, items) ?? committedRef.current,
        );
      }}
      openOnClick
    >
      <Combobox.Control className={controlClassName}>
        <Combobox.Input
          ref={inputRef}
          className={inputClassName}
          aria-label={ariaLabel}
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
          {items.map((item) => (
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
}

/** {@inheritDoc MatchComboboxImpl} */
// memo() loses generic type parameters — the cast restores them.
export const MatchCombobox = memo(
  MatchComboboxImpl,
) as typeof MatchComboboxImpl;
