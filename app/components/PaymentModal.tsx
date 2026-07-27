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
  paymentMode: "prepaid" | "checkout";

onRegisterPayment: (
  method: PaymentMethod,
  amount: number,
  discountAmount: number,
  receivedAmount?: number,
  changeAmount?: number,
) => void;

onClose: () => void;
};

function roundUpToThousand(value: number) {
  return Math.ceil(value / 1000) * 1000;
}

export default function PaymentModal({
  balance,
  customerName,
  paymentMode,
  onRegisterPayment,
  onClose,
}: Props) {
  const [method, setMethod] =
    useState<PaymentMethod>("現金");

  const [amount, setAmount] = useState(balance);

  const [receivedAmount, setReceivedAmount] =
    useState(roundUpToThousand(balance));

    const [customDiscountAmount, setCustomDiscountAmount] =
  useState(0);

    const [discountType, setDiscountType] = useState<
  "none"
| "500"
| "1000"
| "2000"
| "5000"
| "10%"
| "20%"
| "30%"
| "custom"

>("none");

const discountAmount = useMemo(() => {
  switch (discountType) {
    case "500":
      return Math.min(500, balance);

    case "1000":
      return Math.min(1000, balance);

    case "2000":
      return Math.min(2000, balance);

    case "5000":
      return Math.min(5000, balance);

    case "10%":
      return Math.ceil(balance * 0.1);

    case "20%":
      return Math.ceil(balance * 0.2);

    case "30%":
      return Math.ceil(balance * 0.3);

      case "custom":
  return Math.min(customDiscountAmount, balance);

    default:
      return 0;
  }
}, [
  discountType,
  customDiscountAmount,
  balance,
]);

const discountedBalance = Math.max(
  balance - discountAmount,
  0,
);

  const surcharge = useMemo(
    () =>
      method === "Squareカード" || method === "QR"
        ? Math.ceil(amount * 0.1)
        : 0,
    [method, amount],
  );

  const chargedAmount = amount + surcharge;

  const change =
    method === "現金"
      ? Math.max(receivedAmount - amount, 0)
      : 0;

  const shortage =
    method === "現金"
      ? Math.max(amount - receivedAmount, 0)
      : 0;

  const suggestedReceivedAmount =
    roundUpToThousand(amount);

  const quickAmounts = useMemo(() => {
    const fixedAmounts = [
      10000,
      20000,
      30000,
      50000,
      100000,
    ];

    return Array.from(
      new Set([
        suggestedReceivedAmount,
        ...fixedAmounts,
      ]),
    )
      .filter((value) => value >= amount)
      .sort((a, b) => a - b);
  }, [amount, suggestedReceivedAmount]);

  const handleMethodChange = (
    nextMethod: PaymentMethod,
  ) => {
    setMethod(nextMethod);

    if (nextMethod === "現金") {
      setReceivedAmount(roundUpToThousand(amount));
    }
  };

  const handleDiscountChange = (
  value:
    | "none"
    | "500"
    | "1000"
    | "2000"
    | "5000"
    | "10%"
    | "20%"
    | "30%",
) => {
  setDiscountType(value);

  let nextDiscount = 0;

  switch (value) {
    case "500":
      nextDiscount = 500;
      break;

    case "1000":
      nextDiscount = 1000;
      break;

    case "2000":
      nextDiscount = 2000;
      break;

    case "5000":
      nextDiscount = 5000;
      break;

    case "10%":
      nextDiscount = Math.ceil(balance * 0.1);
      break;

    case "20%":
      nextDiscount = Math.ceil(balance * 0.2);
      break;

    case "30%":
      nextDiscount = Math.ceil(balance * 0.3);
      break;
  }

  const nextAmount = Math.max(
    balance - Math.min(nextDiscount, balance),
    0,
  );

  setAmount(nextAmount);

  if (method === "現金") {
    setReceivedAmount(
      roundUpToThousand(nextAmount),
    );
  }
};

  const handleAmountChange = (value: number) => {
    const nextAmount = Math.max(
      0,
      Math.min(value, balance),
    );

    setAmount(nextAmount);

    if (method === "現金") {
      setReceivedAmount(
        roundUpToThousand(nextAmount),
      );
    }
  };

  const paymentDisabled =
    amount <= 0 ||
    (method === "現金" && shortage > 0) ||
    (method === "売掛" && !customerName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-slate-900 p-6 text-white">
        <h2 className="text-3xl font-bold">
  {paymentMode === "prepaid" ? "先払い" : "会計"}
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
            handleMethodChange(
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
  サービス割引
</label>

<div className="mt-2 grid grid-cols-2 gap-3">
  {[
    ["none", "なし"],
    ["500", "−500円"],
    ["1000", "−1,000円"],
    ["2000", "−2,000円"],
    ["5000", "−5,000円"],
    ["10%", "10％"],
    ["20%", "20％"],
    ["30%", "30％"],
  ].map(([value, label]) => (
    <button
      key={value}
      type="button"
      onClick={() =>
        handleDiscountChange(
          value as
            | "none"
            | "500"
            | "1000"
            | "2000"
            | "5000"
            | "10%"
            | "20%"
            | "30%",
        )
      }
      className={`min-h-14 rounded-xl px-2 font-bold ${
        discountType === value
          ? "bg-pink-600"
          : "bg-slate-700"
      }`}
    >
      {label}
    </button>
  ))}
</div>
<label className="mt-4 block font-bold">
  自由割引
</label>

<input
  type="number"
  inputMode="numeric"
  min={0}
  max={balance}
  value={customDiscountAmount}
  onChange={(e) => {
    const value = Math.min(
      Math.max(Number(e.target.value), 0),
      balance,
    );

    setCustomDiscountAmount(value);
    setDiscountType("custom");

    const nextAmount = Math.max(
  balance - value,
  0,
);

setAmount(nextAmount);

if (method === "現金") {
  setReceivedAmount(
    roundUpToThousand(nextAmount),
  );
}

  }}
  placeholder="例：1500"
  className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-xl"
/>
{discountAmount > 0 && (
  <div className="mt-4 rounded-xl bg-amber-950 p-4 text-amber-100">
    <div className="flex justify-between">
      <span>サービス割引</span>

      <strong>
        −{discountAmount.toLocaleString()}円
      </strong>
    </div>

    <div className="mt-2 flex justify-between text-xl">
      <span>割引後</span>

      <strong>
        {discountedBalance.toLocaleString()}円
      </strong>
    </div>
  </div>
)}

        <label className="mt-5 block font-bold">
          元の支払額
        </label>

        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={balance}
          value={amount}
          onChange={(event) =>
            handleAmountChange(
              Number(event.target.value),
            )
          }
          className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-xl"
        />

        {method === "現金" && (
          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950 p-4">
            <label className="block font-bold">
              お預かり金額
            </label>

            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={receivedAmount}
              onChange={(event) =>
                setReceivedAmount(
                  Math.max(
                    0,
                    Number(event.target.value),
                  ),
                )
              }
              className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-2xl font-bold"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setReceivedAmount(value)
                  }
                  className={`min-h-14 rounded-xl px-2 font-bold ${
                    receivedAmount === value
                      ? "bg-emerald-600"
                      : "bg-slate-700"
                  }`}
                >
                  {value.toLocaleString()}円
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setReceivedAmount(
                    (current) => current + 1000,
                  )
                }
                className="min-h-14 rounded-xl bg-blue-700 px-2 font-bold"
              >
                ＋1,000円
              </button>

              <button
                type="button"
                onClick={() =>
                  setReceivedAmount(amount)
                }
                className="min-h-14 rounded-xl bg-slate-700 px-2 font-bold"
              >
                ちょうど
              </button>
            </div>

            <div
              className={`mt-4 rounded-xl p-4 ${
                shortage > 0
                  ? "bg-red-950 text-red-200"
                  : "bg-emerald-950 text-emerald-200"
              }`}
            >
              {shortage > 0 ? (
                <div className="flex items-center justify-between">
                  <span>不足金額</span>
                  <strong className="text-2xl">
                    {shortage.toLocaleString()}円
                  </strong>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span>おつり</span>
                  <strong className="text-3xl">
                    {change.toLocaleString()}円
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}

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
  disabled={paymentDisabled}

  onClick={() =>
  onRegisterPayment(
    method,
    amount,
    discountAmount,
    method === "現金"
      ? receivedAmount
      : undefined,
    method === "現金"
      ? change
      : undefined,
  )
}

  className="min-h-14 rounded-xl bg-pink-600 font-bold disabled:bg-slate-600 disabled:text-slate-400"
>
  {paymentMode === "prepaid"
    ? "先払いを登録"
    : "会計する"}
</button>
        </div>
      </div>
    </div>
  );
}