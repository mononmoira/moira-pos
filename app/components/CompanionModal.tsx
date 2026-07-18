"use client";

import type { Staff } from "./StaffModal";

type CompanionModalProps = {
  staff: Staff[];
  selectedStaffIds: string[];
  onToggleStaff: (staffId: string) => void;
  onRegister: () => void;
  onClose: () => void;
};

export default function CompanionModal({
  staff,
  selectedStaffIds,
  onToggleStaff,
  onRegister,
  onClose,
}: CompanionModalProps) {
  const castStaff = staff.filter(
    (person) => person.role !== "ボーイ",
  );

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/85 p-4">
      <div className="mx-auto my-4 w-full max-w-2xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">
              同伴キャスト選択
            </h2>

            <p className="mt-2 text-slate-400">
              選択人数 × 1,000円で伝票に追加します
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

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {castStaff.map((person) => {
            const selected = selectedStaffIds.includes(
              person.id,
            );

            return (
              <button
                key={person.id}
                type="button"
                onClick={() => onToggleStaff(person.id)}
                className={`rounded-2xl border-2 p-4 text-left ${
                  selected
                    ? "border-pink-300 bg-pink-700"
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

        {castStaff.length === 0 && (
          <p className="mt-6 rounded-xl bg-slate-800 p-5 text-slate-400">
            選択できるキャストがいません。
          </p>
        )}

        <div className="mt-6 rounded-2xl bg-slate-800 p-5">
          <div className="flex justify-between text-xl">
            <span>選択人数</span>
            <strong>{selectedStaffIds.length}名</strong>
          </div>

          <div className="mt-2 flex justify-between text-2xl">
            <span>同伴料金</span>
            <strong>
              {(selectedStaffIds.length * 1000).toLocaleString(
                "ja-JP",
              )}
              円
            </strong>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 p-4 text-xl font-bold"
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={onRegister}
            disabled={selectedStaffIds.length === 0}
            className="rounded-xl bg-pink-600 p-4 text-xl font-bold disabled:bg-slate-600 disabled:text-slate-400"
          >
            同伴を追加
          </button>
        </div>
      </div>
    </div>
  );
}