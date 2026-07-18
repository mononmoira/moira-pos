"use client";

import { createId } from "../lib/createId";

import { useState } from "react";
import type {
  AppUser,
  UserRole,
} from "../page";
import type { Staff } from "./StaffModal";

type Props = {
  users: AppUser[];
  staff: Staff[];
  onSave: (user: AppUser) => void;
  onDelete: (userId: string) => void;
  onClose: () => void;
};

const roles: UserRole[] = [
  "ママ",
  "店長",
  "チーママ",
  "MG",
  "キャスト",
  "ボーイ",
];

export default function UserManagementModal({
  users,
  staff,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [selectedId, setSelectedId] =
    useState(users[0]?.id ?? "");
  const selected = users.find(
    (user) => user.id === selectedId,
  );

  const [name, setName] = useState(
    selected?.name ?? "",
  );
  const [role, setRole] =
    useState<UserRole>(
      selected?.role ?? "キャスト",
    );
  const [pin, setPin] = useState(
    selected?.pin ?? "0000",
  );
  const [staffId, setStaffId] = useState(
    selected?.staffId ?? "",
  );
  const [enabled, setEnabled] = useState(
    selected?.enabled ?? true,
  );

  function select(id: string) {
    setSelectedId(id);
    const user = users.find(
      (item) => item.id === id,
    );
    setName(user?.name ?? "");
    setRole(user?.role ?? "キャスト");
    setPin(user?.pin ?? "0000");
    setStaffId(user?.staffId ?? "");
    setEnabled(user?.enabled ?? true);
  }

  function startNew() {
    setSelectedId("");
    setName("");
    setRole("キャスト");
    setPin("0000");
    setStaffId("");
    setEnabled(true);
  }

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/90 p-4">
      <div className="mx-auto my-4 w-full max-w-4xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex justify-between">
          <h2 className="text-3xl font-black">
            権限管理
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-5 py-3"
          >
            閉じる
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
          <div>
            <button
              onClick={startNew}
              className="mb-3 w-full rounded-xl bg-sky-700 p-3 font-bold"
            >
              ＋ 新規ユーザー
            </button>
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => select(user.id)}
                  className={`w-full rounded-xl p-4 text-left ${
                    selectedId === user.id
                      ? "bg-sky-700"
                      : "bg-slate-800"
                  }`}
                >
                  <strong>{user.name}</strong>
                  <span className="block text-sm">
                    {user.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800 p-5">
            <label className="font-bold">
              表示名
            </label>
            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            />

            <label className="mt-4 block font-bold">
              権限
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(
                  e.target.value as UserRole,
                )
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            >
              {roles.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <label className="mt-4 block font-bold">
              スタッフ紐付け
            </label>
            <select
              value={staffId}
              onChange={(e) =>
                setStaffId(e.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            >
              <option value="">なし</option>
              {staff.map((person) => (
                <option
                  key={person.id}
                  value={person.id}
                >
                  {person.name}
                </option>
              ))}
            </select>

            <label className="mt-4 block font-bold">
              PIN
            </label>
            <input
              value={pin}
              onChange={(e) =>
                setPin(e.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            />

            <label className="mt-4 flex gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) =>
                  setEnabled(e.target.checked)
                }
              />
              有効
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {selectedId ? (
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "削除しますか？",
                      )
                    ) {
                      onDelete(selectedId);
                      startNew();
                    }
                  }}
                  className="rounded-xl bg-red-800 p-3 font-bold"
                >
                  削除
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => {
                  if (!name || !pin) {
                    alert(
                      "名前とPINを入力してください。",
                    );
                    return;
                  }

                  onSave({
                    id:
                      selectedId ||
                      createId(),
                    name,
                    role,
                    pin,
                    staffId:
                      staffId || undefined,
                    enabled,
                  });
                }}
                className="rounded-xl bg-emerald-700 p-3 font-bold"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
