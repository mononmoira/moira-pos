"use client";

import { useMemo, useState } from "react";
import type {
  ReservationEntry,
} from "../page";
import type { Staff } from "./StaffModal";

type Props = {
  staff: Staff[];
  initialEntries: ReservationEntry[];
  onSave: (entries: ReservationEntry[]) => void;
  onClose: () => void;
};

export default function ReservationModal({
  staff,
  initialEntries,
  onSave,
  onClose,
}: Props) {
  const [quantities, setQuantities] = useState<
    Record<string, number>
  >(() =>
    Object.fromEntries(
      initialEntries.map((entry) => [
        entry.staffId,
        entry.quantity,
      ]),
    ),
  );

  const totalPeople = useMemo(
    () =>
      Object.values(quantities).reduce(
        (total, quantity) => total + quantity,
        0,
      ),
    [quantities],
  );

  function changeQuantity(
    staffId: string,
    amount: number,
  ) {
    setQuantities((current) => {
      const next = Math.max(
        0,
        (current[staffId] ?? 0) + amount,
      );

      return {
        ...current,
        [staffId]: next,
      };
    });
  }

  function save() {
    const entries: ReservationEntry[] = Object.entries(
      quantities,
    )
      .filter(([, quantity]) => quantity > 0)
      .map(([staffId, quantity]) => ({
        staffId,
        quantity,
      }));

    onSave(entries);
  }

  return (
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-black/90 p-4">
      <div className="mx-auto my-4 w-full max-w-3xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">
              予約設定
            </h2>
            <p className="mt-2 text-slate-400">
              予約を取ったスタッフごとに来店人数を入力
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

        <div className="mt-6 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {staff.map((person) => {
            const quantity = quantities[person.id] ?? 0;

            return (
              <div
                key={person.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-4 ${
                  quantity > 0
                    ? "border-cyan-300 bg-cyan-900"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                <div>
                  <p className="text-xl font-bold">
                    {person.name}
                  </p>
                  <p className="text-sm text-slate-400">
                    {person.role}・1人300円
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      changeQuantity(person.id, -1)
                    }
                    className="min-h-12 min-w-12 rounded-xl bg-slate-700 text-2xl font-bold"
                  >
                    −
                  </button>

                  <span className="min-w-14 text-center text-2xl font-black">
                    {quantity}人
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      changeQuantity(person.id, 1)
                    }
                    className="min-h-12 min-w-12 rounded-xl bg-cyan-600 text-2xl font-bold"
                  >
                    ＋
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl bg-slate-800 p-5">
          <div className="flex justify-between text-xl">
            <span>予約人数合計</span>
            <strong>{totalPeople}人</strong>
          </div>
          <div className="mt-2 flex justify-between text-2xl">
            <span>予約バック合計</span>
            <strong>
              {(totalPeople * 300).toLocaleString("ja-JP")}円
            </strong>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-14 rounded-xl bg-slate-700 p-3 text-lg font-bold"
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={save}
            className="min-h-14 rounded-xl bg-cyan-600 p-3 text-lg font-bold"
          >
            予約設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}
