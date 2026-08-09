"use client";

import { useMemo, useState } from "react";
import type { Staff } from "./StaffModal";

type Props = {
  staff: Staff[];
  hiddenStaffIds: string[];
  onSetVisible: (
    staffId: string,
    visible: boolean,
  ) => void;
  onClose: () => void;
};

export default function StaffVisibilityModal({
  staff,
  hiddenStaffIds,
  onSetVisible,
  onClose,
}: Props) {
  const [showHiddenOnly, setShowHiddenOnly] =
    useState(false);

  const sortedStaff = useMemo(() => {
    const list = showHiddenOnly
      ? staff.filter((person) =>
          hiddenStaffIds.includes(person.id),
        )
      : staff;

    return [...list].sort((a, b) => {
      const aHidden = hiddenStaffIds.includes(a.id);
      const bHidden = hiddenStaffIds.includes(b.id);

      if (aHidden !== bHidden) {
        return aHidden ? 1 : -1;
      }

      return a.name.localeCompare(
        b.name,
        "ja",
      );
    });
  }, [
    staff,
    hiddenStaffIds,
    showHiddenOnly,
  ]);

  const visibleCount =
    staff.length - hiddenStaffIds.length;

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/90 p-3 sm:p-5">
      <div className="mx-auto mt-20 w-full max-w-4xl rounded-3xl bg-slate-900 p-5 text-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">
              スタッフ表示設定
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              退職・休止中のスタッフを新しい注文のスタッフ選択から非表示にします。
              過去の売上・給与・履歴データは削除されません。
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

        <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl bg-slate-950 p-3 text-center">
            <p className="text-xs text-slate-400">
              使用中
            </p>
            <p className="mt-1 text-xl font-black text-emerald-300">
              {visibleCount}名
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 text-center">
            <p className="text-xs text-slate-400">
              非表示
            </p>
            <p className="mt-1 text-xl font-black text-slate-300">
              {hiddenStaffIds.length}名
            </p>
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 rounded-xl bg-slate-950 p-4 font-bold">
          <input
            type="checkbox"
            checked={showHiddenOnly}
            onChange={(event) =>
              setShowHiddenOnly(
                event.target.checked,
              )
            }
            className="h-5 w-5"
          />
          非表示スタッフだけ表示
        </label>

        <div className="mt-4 space-y-3">
          {sortedStaff.length === 0 ? (
            <div className="rounded-2xl bg-slate-950 p-8 text-center text-slate-400">
              該当するスタッフはいません。
            </div>
          ) : (
            sortedStaff.map((person) => {
              const hidden =
                hiddenStaffIds.includes(
                  person.id,
                );

              const currentlyWorking =
                Boolean(
                  person.clockIn &&
                    !person.clockOut,
                );

              return (
                <div
                  key={person.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950 p-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black">
                        {person.name}
                      </p>

                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300">
                        {person.role}
                      </span>

                      {currentlyWorking && (
                        <span className="rounded-full bg-emerald-800 px-2.5 py-1 text-xs font-bold text-emerald-100">
                          出勤中
                        </span>
                      )}

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          hidden
                            ? "bg-slate-700 text-slate-200"
                            : "bg-blue-800 text-blue-100"
                        }`}
                      >
                        {hidden
                          ? "スタッフ選択に非表示"
                          : "スタッフ選択に表示"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      時給{" "}
                      {person.hourlyWage.toLocaleString(
                        "ja-JP",
                      )}
                      円
                    </p>
                  </div>

                  {hidden ? (
                    <button
                      type="button"
                      onClick={() =>
                        onSetVisible(
                          person.id,
                          true,
                        )
                      }
                      className="min-h-11 rounded-xl bg-blue-700 px-5 py-2 font-black"
                    >
                      選択に戻す
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={currentlyWorking}
                      onClick={() => {
                        const confirmed =
                          window.confirm(
                            `${person.name}さんをスタッフ選択から非表示にしますか？\n\n過去の売上・給与・履歴は残ります。`,
                          );

                        if (!confirmed) {
                          return;
                        }

                        onSetVisible(
                          person.id,
                          false,
                        );
                      }}
                      className="min-h-11 rounded-xl bg-red-800 px-5 py-2 font-black disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      {currentlyWorking
                        ? "退勤後に非表示"
                        : "選択から非表示"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}