"use client";

type Props = {
  seatName: string;
  customerName: string;
  total: number;
  closedAt: string;
  selected?: boolean;
  onClick: () => void;
};

function formatYen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryTicketCard({
  seatName,
  customerName,
  total,
  closedAt,
  selected = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-emerald-500 bg-emerald-900/40"
          : "border-slate-700 bg-slate-900 hover:border-emerald-500"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-bold text-white">
            {seatName}
          </p>

          <p className="mt-1 text-slate-300">
            {customerName || "お客様未登録"}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            会計 {formatTime(closedAt)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-emerald-400">
            {formatYen(total)}
          </p>
        </div>
      </div>
    </button>
  );
}