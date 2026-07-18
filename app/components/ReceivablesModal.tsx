"use client";

import { useMemo, useState } from "react";
import type { Receivable } from "../page";

type CollectionMethod =
  | "現金"
  | "Squareカード"
  | "QR";

type Props = {
  receivables: Receivable[];
  onCollect: (
    receivableId: string,
    amount: number,
    method: CollectionMethod,
  ) => void;
  onDeleteCollection: (
    receivableId: string,
    collectionId: string,
  ) => void;
  onClose: () => void;
};

function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function remaining(item: Receivable) {
  return Math.max(
    0,
    item.originalAmount -
      item.collections.reduce(
        (total, collection) =>
          total + collection.amount,
        0,
      ),
  );
}

export default function ReceivablesModal({
  receivables,
  onCollect,
  onDeleteCollection,
  onClose,
}: Props) {
  const active = useMemo(
    () =>
      receivables
        .filter((item) => remaining(item) > 0)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        ),
    [receivables],
  );

  const [selectedId, setSelectedId] = useState(
    active[0]?.id ?? "",
  );

  const selected =
    receivables.find(
      (item) => item.id === selectedId,
    ) ?? active[0];

  const balance = selected
    ? remaining(selected)
    : 0;

  const [amount, setAmount] = useState(balance);
  const [method, setMethod] =
    useState<CollectionMethod>("現金");

  const surcharge =
    method === "Squareカード" || method === "QR"
      ? Math.ceil(amount * 0.1)
      : 0;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 p-4">
      <div className="mx-auto my-4 w-full max-w-5xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">
              売掛管理
            </h2>
            <p className="mt-2 text-slate-400">
              顧客別の残高と回収履歴
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
          >
            閉じる
          </button>
        </div>

        {active.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-slate-800 p-8 text-center text-slate-400">
            未回収の売掛はありません。
          </p>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[300px_1fr]">
            <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
              {active.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setAmount(remaining(item));
                    setMethod("現金");
                  }}
                  className={`w-full rounded-xl p-4 text-left ${
                    selected?.id === item.id
                      ? "bg-amber-700"
                      : "bg-slate-800"
                  }`}
                >
                  <p className="font-bold">
                    {item.customerName}
                  </p>
                  <p className="mt-1 text-lg font-black">
                    残り {formatYen(remaining(item))}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {new Date(
                      item.createdAt,
                    ).toLocaleDateString("ja-JP")}
                  </p>
                </button>
              ))}
            </div>

            {selected && (
              <div>
                <h3 className="text-2xl font-bold">
                  {selected.customerName}
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-800 p-4">
                    <p className="text-slate-400">
                      売掛元金
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {formatYen(
                        selected.originalAmount,
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-950 p-4">
                    <p className="text-amber-200">
                      未回収残高
                    </p>
                    <p className="mt-1 text-2xl font-black">
                      {formatYen(balance)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-800 p-5">
                  <h4 className="text-xl font-bold">
                    入金登録
                  </h4>

                  <label className="mt-4 block font-bold">
                    回収方法
                  </label>
                  <select
                    value={method}
                    onChange={(event) =>
                      setMethod(
                        event.target
                          .value as CollectionMethod,
                      )
                    }
                    className="mt-2 w-full rounded-xl bg-slate-700 p-3"
                  >
                    <option>現金</option>
                    <option>Squareカード</option>
                    <option>QR</option>
                  </select>

                  <label className="mt-4 block font-bold">
                    元金への入金額
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={balance}
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        Number(event.target.value),
                      )
                    }
                    className="mt-2 w-full rounded-xl bg-slate-700 p-3 text-xl"
                  />

                  {surcharge > 0 && (
                    <p className="mt-3 rounded-xl bg-pink-950 p-3">
                      決済額：
                      <strong>
                        {formatYen(amount + surcharge)}
                      </strong>
                      （10％加算）
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onCollect(
                        selected.id,
                        amount,
                        method,
                      );
                    }}
                    className="mt-4 w-full rounded-xl bg-emerald-700 p-4 text-lg font-bold"
                  >
                    入金を登録
                  </button>
                </div>

                <h4 className="mt-5 text-xl font-bold">
                  回収履歴
                </h4>

                {selected.collections.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-slate-800 p-4 text-slate-400">
                    まだ入金はありません。
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {selected.collections
                      .slice()
                      .reverse()
                      .map((collection) => (
                        <div
                          key={collection.id}
                          className="flex items-center justify-between rounded-xl bg-slate-800 p-4"
                        >
                          <div>
                            <p className="font-bold">
                              {collection.method}
                            </p>
                            <p className="text-sm text-slate-400">
                              元金 {formatYen(collection.amount)}
                              {collection.chargedAmount !==
                                collection.amount &&
                                `／決済 ${formatYen(
                                  collection.chargedAmount,
                                )}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onDeleteCollection(
                                selected.id,
                                collection.id,
                              )
                            }
                            className="rounded-lg bg-red-900 px-3 py-2 text-sm font-bold"
                          >
                            取消
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
