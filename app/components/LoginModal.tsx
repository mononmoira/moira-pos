"use client";

import { useState } from "react";
import type { AppUser } from "../page";

type Props = {
  users: AppUser[];
  currentUserId: string;
  onLogin: (userId: string) => void;
  onClose: () => void;
};

export default function LoginModal({
  users,
  currentUserId,
  onLogin,
  onClose,
}: Props) {
  const enabled = users.filter(
    (user) => user.enabled,
  );
  const [selectedId, setSelectedId] =
    useState(
      currentUserId ||
        enabled[0]?.id ||
        "",
    );
  const [pin, setPin] = useState("");

  function login() {
    const user = enabled.find(
      (item) => item.id === selectedId,
    );

    if (!user || user.pin !== pin) {
      alert("PINが違います。");
      return;
    }

    onLogin(user.id);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 p-6 text-white">
        <h2 className="text-3xl font-black">
          ログイン
        </h2>
        <p className="mt-2 text-slate-400">
          初期ママPINは 0000 です
        </p>

        <label className="mt-5 block font-bold">
          ユーザー
        </label>
        <select
          value={selectedId}
          onChange={(event) =>
            setSelectedId(event.target.value)
          }
          className="mt-2 w-full rounded-xl bg-slate-800 p-4"
        >
          {enabled.map((user) => (
            <option
              key={user.id}
              value={user.id}
            >
              {user.name}／{user.role}
            </option>
          ))}
        </select>

        <label className="mt-5 block font-bold">
          PIN
        </label>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) =>
            setPin(event.target.value)
          }
          className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-2xl tracking-widest"
        />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={!currentUserId}
            className="rounded-xl bg-slate-700 p-4 font-bold disabled:opacity-30"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={login}
            className="rounded-xl bg-blue-700 p-4 font-bold"
          >
            ログイン
          </button>
        </div>
      </div>
    </div>
  );
}
