import { TrendingDown, TrendingUp } from "lucide-react";

type TrendTextProps = {
  value: number;
  suffix: string;
};

export function TrendText({ value, suffix }: TrendTextProps) {
  const isUp = value >= 0;
  const absoluteValue = Math.abs(value);

  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      {isUp ? (
        <TrendingUp className="size-3 text-emerald-600" />
      ) : (
        <TrendingDown className="size-3 text-rose-600" />
      )}
      <span className={isUp ? "text-emerald-600" : "text-rose-600"}>
        {isUp ? "+" : "-"}
        {absoluteValue}
      </span>
      <span>{suffix}</span>
    </p>
  );
}
