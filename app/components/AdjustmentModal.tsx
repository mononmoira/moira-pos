"use client";

import { useMemo, useState } from "react";

export type AdjustmentType =
  | "service"
  | "amountDiscount"
  | "percentDiscount";

type AdjustmentModalProps = {
  currentTotal: number;
  onRegister: (
    type: AdjustmentType,
    amount: number,
    reason: string,
    percent?: number,
  ) => void;
  onClose: () => void;
};

const serviceAmounts = [100, 500, 1000, 3000, 5000];
const discountPercents = [5, 10, 20, 30];

const reasons = [
  "常連",
  "誕生日",
  "イベント",
  "クレーム対応",
  "その他",
];

function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

export function AdjustmentModal({
  currentTotal,
  onRegister,
  onClose,
}: AdjustmentModalProps) {
  const [type, setType] =
    useState<AdjustmentType>("service");
  const [amountText, setAmountText] = useState("");
  const [percentText, setPercentText] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const amount = Number(amountText) || 0;
  const percent = Number(percentText) || 0;

  const calculatedDiscount = useMemo(() => {
    if (type !== "percentDiscount") {
      return amount;
    }

    return Math.floor(currentTotal * (percent / 100));
  }, [type, currentTotal, amount, percent]);

  function register() {
    const reason =
      selectedReason === "その他"
        ? customReason.trim()
        : selectedReason;

    if (!reason) {
      alert("理由を選択または入力してください。");
      return;
    }

    if (
      type === "percentDiscount" &&
      (percent <= 0 || percent > 100)
    ) {
      alert("割引率は1〜100％で入力してください。");
      return;
    }

    if (
      type !== "percentDiscount" &&
      amount <= 0
    ) {
      alert("金額を入力してください。");
      return;
    }

    if (calculatedDiscount <= 0) {
      alert("割引金額を確認してください。");
      return;
    }

    if (calculatedDiscount > currentTotal) {
      alert("伝票合計を超える金額は登録できません。");
      return;
    }

    onRegister(
      type,
      calculatedDiscount,
      reason,
      type === "percentDiscount"
        ? percent
        : undefined,
    );
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/85 p-4">
      <div className="mx-auto my-4 w-full max-w-2xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">
              サービス・割引
            </h2>
            <p className="mt-1 text-slate-400">
              現在の伝票合計：
              {formatYen(currentTotal)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl bg-slate-700 px-5 font-bold"
          >
            閉じる
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setType("service");
              setAmountText("");
              setPercentText("");
            }}
            className={`min-h-16 rounded-xl p-3 font-bold ${
              type === "service"
                ? "bg-pink-600"
                : "bg-slate-700"
            }`}
          >
            サービス
          </button>

          <button
            type="button"
            onClick={() => {
              setType("amountDiscount");
              setAmountText("");
              setPercentText("");
            }}
            className={`min-h-16 rounded-xl p-3 font-bold ${
              type === "amountDiscount"
                ? "bg-blue-600"
                : "bg-slate-700"
            }`}
          >
            金額割引
          </button>

          <button
            type="button"
            onClick={() => {
              setType("percentDiscount");
              setAmountText("");
              setPercentText("");
            }}
            className={`min-h-16 rounded-xl p-3 font-bold ${
              type === "percentDiscount"
                ? "bg-emerald-600"
                : "bg-slate-700"
            }`}
          >
            ％割引
          </button>
        </div>

        {type !== "percentDiscount" && (
          <section className="mt-6">
            <h3 className="text-xl font-bold">金額</h3>

            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {serviceAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setAmountText(String(value))
                  }
                  className={`min-h-14 rounded-xl p-2 font-bold ${
                    amount === value
                      ? "bg-purple-600"
                      : "bg-slate-700"
                  }`}
                >
                  {formatYen(value)}
                </button>
              ))}
            </div>

            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={amountText}
              onChange={(event) =>
                setAmountText(event.target.value)
              }
              placeholder="自由入力"
              className="mt-3 min-h-14 w-full rounded-xl bg-slate-800 px-4 text-xl font-bold outline-none ring-purple-500 focus:ring-2"
            />
          </section>
        )}

        {type === "percentDiscount" && (
          <section className="mt-6">
            <h3 className="text-xl font-bold">割引率</h3>

            <div className="mt-3 grid grid-cols-4 gap-3">
              {discountPercents.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setPercentText(String(value))
                  }
                  className={`min-h-14 rounded-xl p-2 text-lg font-bold ${
                    percent === value
                      ? "bg-emerald-600"
                      : "bg-slate-700"
                  }`}
                >
                  {value}％
                </button>
              ))}
            </div>

            <input
              type="number"
              min="1"
              max="100"
              inputMode="numeric"
              value={percentText}
              onChange={(event) =>
                setPercentText(event.target.value)
              }
              placeholder="自由入力 例：15"
              className="mt-3 min-h-14 w-full rounded-xl bg-slate-800 px-4 text-xl font-bold outline-none ring-emerald-500 focus:ring-2"
            />

            <div className="mt-3 rounded-xl bg-emerald-950 p-4">
              <p className="text-sm text-emerald-200">
                割引金額
              </p>
              <p className="mt-1 text-2xl font-black">
                -{formatYen(calculatedDiscount)}
              </p>
            </div>
          </section>
        )}

        <section className="mt-6">
          <h3 className="text-xl font-bold">理由</h3>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {reasons.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() =>
                  setSelectedReason(reason)
                }
                className={`min-h-14 rounded-xl p-3 font-bold ${
                  selectedReason === reason
                    ? "bg-amber-600"
                    : "bg-slate-700"
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

          {selectedReason === "その他" && (
            <input
              type="text"
              value={customReason}
              onChange={(event) =>
                setCustomReason(event.target.value)
              }
              placeholder="理由を入力"
              className="mt-3 min-h-14 w-full rounded-xl bg-slate-800 px-4 text-lg outline-none ring-amber-500 focus:ring-2"
            />
          )}
        </section>

        <button
          type="button"
          onClick={register}
          className="mt-6 min-h-16 w-full rounded-xl bg-red-600 p-3 text-xl font-black"
        >
          伝票に登録
        </button>
      </div>
    </div>
  );
}