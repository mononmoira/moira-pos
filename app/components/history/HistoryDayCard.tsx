"use client";

type Props = {
  date: string;
  sales: number;
  guests: number;
  selected?: boolean;
  onClick: () => void;
};

function formatYen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

export default function HistoryDayCard({
  date,
  sales,
  guests,
  selected = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-blue-500 bg-blue-900/40"
          : "border-slate-700 bg-slate-900 hover:border-blue-500"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-bold text-white">
            {date}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            会計 {guests}組
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-400">
            売上
          </p>

          <p className="text-2xl font-bold text-emerald-400">
            {formatYen(sales)}
          </p>
        </div>
      </div>
    </button>
  );
}