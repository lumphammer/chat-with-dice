type ResultStatProps = {
  label: string;
  value: number | string;
};

export function ResultStat({ label, value }: ResultStatProps) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-base-content/40 text-xs">{label}</span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
    </div>
  );
}
