"use client";

import { useMemo, useState } from "react";

export type PaymentMethod =
  | "現金"
  | "Squareカード"
  | "QR"
  | "売掛";

type Props = {
  balance: number;
  customerName?: string;
  onRegisterPayment: (
    method: PaymentMethod,
    amount: number,
  ) => void;
  onClose: () => void;
};

export default function PaymentModal({
  balance,
  customerName,
  onRegisterPayment,
  onClose,
}: Props) {
  const [method, setMethod] =
    useState<PaymentMethod>("現金");
  const [amount, setAmount] = useState(balance);

  const surcharge = useMemo(
    () =>
      method === "Squareカード" || method === "QR"
        ? Math.ceil(amount * 0.1)
        : 0,
    [method, amount],
  );

  const chargedAmount = amount + surcharge;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 p-6 text-white">
        <h2 className="text-3xl font-bold">
          先払い・会計
        </h2>

        <div className="mt-5 rounded-xl bg-slate-800 p-4">
          未会計：{balance.toLocaleString()}円
        </div>

        <label className="mt-5 block font-bold">
          支払方法
        </label>

        <select
          value={method}
          onChange={(event) =>
            setMethod(
              event.target.value as PaymentMethod,
            )
          }
          className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-lg"
        >
          <option>現金</option>
          <option>Squareカード</option>
          <option>QR</option>
          <option>売掛</option>
        </select>

        {method === "売掛" && (
          <div
            className={`mt-3 rounded-xl p-3 ${
              customerName
                ? "bg-amber-950 text-amber-100"
                : "bg-red-950 text-red-200"
            }`}
          >
            {customerName
              ? `売掛先：${customerName}`
              : "売掛には顧客設定が必要です。"}
          </div>
        )}

        <label className="mt-5 block font-bold">
          元の支払額
        </label>

        <input
          type="number"
          min={1}
          max={balance}
          value={amount}
          onChange={(event) =>
            setAmount(Number(event.target.value))
          }
          className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-xl"
        />

        {surcharge > 0 && (
          <div className="mt-4 rounded-xl bg-pink-950 p-4">
            <div className="flex justify-between">
              <span>キャッシュレス加算</span>
              <strong>
                ＋{surcharge.toLocaleString()}円
              </strong>
            </div>
            <div className="mt-2 flex justify-between text-xl">
              <span>決済額</span>
              <strong>
                {chargedAmount.toLocaleString()}円
              </strong>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-14 rounded-xl bg-slate-700 font-bold"
          >
            キャンセル
          </button>

          <button
            type="button"
            disabled={
              method === "売掛" && !customerName
            }
            onClick={() =>
              onRegisterPayment(method, amount)
            }
            className="min-h-14 rounded-xl bg-pink-600 font-bold disabled:bg-slate-600 disabled:text-slate-400"
          >
            支払い登録
          </button>
        </div>
      </div>
    </div>
  );
}
