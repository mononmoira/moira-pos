"use client";

import { useState } from "react";
import type { Product } from "./OrderModal";
import type { Staff } from "./StaffModal";

type Props = {
  product: Product;
  staff: Staff[];
  onRegister: (
    cups: Record<string, number>,
    representativeStaffId: string | null,
  ) => void;
  onClose: () => void;
};

export default function EventStaffModal({
  product,
  staff,
  onRegister,
  onClose,
}: Props) {
  const [cups, setCups] = useState<Record<string, number>>({});
  const [representativeStaffId, setRepresentativeStaffId] =
    useState("");

  const selectedIds = Object.entries(cups)
    .filter(([, value]) => value > 0)
    .map(([id]) => id);

  function changeCups(staffId: string, amount: number) {
    setCups((current) => ({
      ...current,
      [staffId]: Math.max(0, (current[staffId] ?? 0) + amount),
    }));
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/90 p-4">
      <div className="mx-auto my-4 w-full max-w-3xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">イベント入力</h2>
            <p className="mt-2 text-xl font-bold text-purple-300">
              {product.name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-700 px-5 py-3 font-bold">閉じる</button>
        </div>

        <p className="mt-5 text-slate-400">各スタッフが飲んだ杯数を入力してください。</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {staff.map((person) => {
            const value = cups[person.id] ?? 0;
            return (
              <div key={person.id} className={`rounded-2xl border-2 p-4 ${value > 0 ? "border-pink-400 bg-slate-800" : "border-slate-700 bg-slate-800"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold">{person.name}</p>
                    <p className="text-sm text-slate-400">{person.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => changeCups(person.id, -1)} className="min-h-11 min-w-11 rounded-lg bg-slate-700 text-xl font-bold">−</button>
                    <span className="min-w-10 text-center text-2xl font-black">{value}</span>
                    <button type="button" onClick={() => changeCups(person.id, 1)} className="min-h-11 min-w-11 rounded-lg bg-pink-600 text-xl font-bold">＋</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <label className="mt-6 block text-lg font-bold">イベント代表者（任意・1人）</label>
        <select value={representativeStaffId} onChange={(e) => setRepresentativeStaffId(e.target.value)} className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-lg">
          <option value="">代表者なし</option>
          {selectedIds.map((id) => {
            const person = staff.find((item) => item.id === id);
            return person ? <option key={id} value={id}>{person.name}</option> : null;
          })}
        </select>
        <p className="mt-2 text-sm text-slate-400">代表者にはイベントバックへ1,000円を追加します。</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="min-h-14 rounded-xl bg-slate-700 p-3 text-lg font-bold">キャンセル</button>
          <button type="button" disabled={selectedIds.length === 0} onClick={() => onRegister(cups, representativeStaffId || null)} className="min-h-14 rounded-xl bg-pink-600 p-3 text-lg font-bold disabled:bg-slate-600">伝票に追加</button>
        </div>
      </div>
    </div>
  );
}
