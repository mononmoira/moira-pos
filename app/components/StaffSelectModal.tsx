"use client";

import { useMemo, useState } from "react";
import type { Staff } from "./StaffModal";

type Props = {
  title: string;
  description: string;
  staff: Staff[];
  multiple: boolean;
  castOnly?: boolean;
  onRegister: (staffIds: string[]) => void;
  onClose: () => void;
};

export default function StaffSelectModal({
  title,
  description,
  staff,
  multiple,
  castOnly = false,
  onRegister,
  onClose,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visibleStaff = useMemo(
    () =>
      castOnly
        ? staff.filter((person) => person.role !== "ボーイ")
        : staff,
    [staff, castOnly],
  );

  function toggle(staffId: string) {
    if (multiple) {
      setSelectedIds((current) =>
        current.includes(staffId)
          ? current.filter((id) => id !== staffId)
          : [...current, staffId],
      );
    } else {
      setSelectedIds([staffId]);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/90 p-4">
      <div className="mx-auto my-4 w-full max-w-2xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">{title}</h2>
            <p className="mt-2 text-slate-400">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
          >
            閉じる
          </button>
        </div>

        <div className="mt-6 grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
          {visibleStaff.map((person) => {
            const selected = selectedIds.includes(person.id);

            return (
              <button
                key={person.id}
                type="button"
                onClick={() => toggle(person.id)}
                className={`min-h-24 rounded-2xl border-2 p-4 text-left ${
                  selected
                    ? "border-pink-200 bg-pink-600"
                    : "border-slate-600 bg-slate-800"
                }`}
              >
                <p className="text-xl font-bold">
                  {selected ? "✓ " : ""}
                  {person.name}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {person.role}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl bg-slate-800 p-4">
          選択中：{selectedIds.length}名
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
            disabled={selectedIds.length === 0}
            onClick={() => onRegister(selectedIds)}
            className="min-h-14 rounded-xl bg-pink-600 p-3 text-lg font-bold disabled:bg-slate-600 disabled:text-slate-400"
          >
            伝票に追加
          </button>
        </div>
      </div>
      </div>
  );
}

   
  