"use client";

import { useState } from "react";
import type { BusinessReport } from "../page";

type Props = {
  reports: BusinessReport[];
  onOpenDailyReport?: () => void;
  onClose?: () => void;
  embedded?: boolean;
};

function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export default function BusinessHistoryModal({
  reports,
  onOpenDailyReport,
  onClose,
  embedded = false,
}: Props) {
  const sortedReports = reports
    .slice()
    .sort((a, b) =>
      b.businessDate.localeCompare(a.businessDate),
    );

  const [selectedId, setSelectedId] = useState(
    sortedReports[0]?.id ?? "",
  );

  const selected =
    sortedReports.find((report) => report.id === selectedId) ??
    sortedReports[0];

  return (
    <div
      className={
        embedded
          ? ""
          : "fixed inset-0 z-[90] overflow-y-auto bg-black/90 p-4"
      }
    >
      <div
        className={
          embedded
            ? "w-full text-white"
            : "mx-auto my-4 w-full max-w-5xl rounded-3xl bg-slate-900 p-6 text-white"
        }
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">
              営業日報履歴
            </h2>
            <p className="mt-2 text-slate-400">
              営業終了で確定した日報を表示します
            </p>
          </div>

          {!embedded && (
            <div className="flex gap-2">
              {onOpenDailyReport && (
                <button
                  type="button"
                  onClick={onOpenDailyReport}
                  className="rounded-xl bg-blue-700 px-5 py-3 font-bold"
                >
                  本日の日報
                </button>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
                >
                  閉じる
                </button>
              )}
            </div>
          )}
        </div>

        {sortedReports.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-slate-800 p-8 text-center text-slate-400">
            確定済みの営業日報はありません。
          </p>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
              {sortedReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedId(report.id)}
                  className={`w-full rounded-xl p-4 text-left ${
                    selected?.id === report.id
                      ? "bg-blue-700"
                      : "bg-slate-800"
                  }`}
                >
                  <p className="font-bold">
                    {displayDate(report.businessDate)}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatYen(report.totalSales)}・
                    {report.groupCount}組
                  </p>
                </button>
              ))}
            </div>

            {selected && (
              <div>
                <h3 className="text-2xl font-bold">
                  {displayDate(selected.businessDate)}営業分
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  確定：
                  {new Date(selected.finalizedAt).toLocaleString(
                    "ja-JP",
                  )}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-blue-900 p-4">
                    <p className="text-sm text-blue-200">売上</p>
                    <p className="mt-2 text-2xl font-black">
                      {formatYen(selected.totalSales)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-800 p-4">
                    <p className="text-sm text-slate-400">組数</p>
                    <p className="mt-2 text-2xl font-black">
                      {selected.groupCount}組
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-800 p-4">
                    <p className="text-sm text-slate-400">人数</p>
                    <p className="mt-2 text-2xl font-black">
                      {selected.guestCount}名
                    </p>
                  </div>
                </div>

                <h4 className="mt-6 text-xl font-bold">
                  支払方法別
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(selected.paymentTotals).map(
                    ([name, amount]) => (
                      <div
                        key={name}
                        className="rounded-xl bg-slate-800 p-4"
                      >
                        <p className="text-slate-400">{name}</p>
                        <p className="mt-1 text-lg font-bold">
                          {formatYen(amount)}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                <h4 className="mt-6 text-xl font-bold">
                  メニュー別
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(selected.categoryTotals).map(
                    ([name, amount]) => (
                      <div
                        key={name}
                        className="rounded-xl bg-slate-800 p-4"
                      >
                        <p className="text-slate-400">{name}</p>
                        <p className="mt-1 text-lg font-bold">
                          {formatYen(amount)}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
