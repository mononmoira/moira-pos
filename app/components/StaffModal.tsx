"use client";

import { useMemo, useState } from "react";

export type StaffRole =
  | "キャスト"
  | "ボーイ"
  | "オーナー"
  | "ママ"
  | "新規スタッフ"
  | "体入"
  | "臨時・応援";

export type PaymentCycle =
  | "当日日払い"
  | "翌日払い"
  | "週払い"
  | "月払い";

export type Staff = {
  id: string;
  name: string;
  role: StaffRole;
  hourlyWage: number;
  paymentCycle: PaymentCycle;
  clockIn: string | null;
  clockOut: string | null;
};

type Props = {
  staff: Staff[];
  onClockIn: (
    staffId: string,
    businessTime: string,
  ) => void;
  onClockOut: (
    staffId: string,
    businessTime: string,
  ) => void;
  onUpdateStaff: (
    staffId: string,
    hourlyWage: number,
    paymentCycle: PaymentCycle,
  ) => void;
  onAddTemporaryStaff: (
    name: string,
    role: StaffRole,
    hourlyWage: number,
    paymentCycle: PaymentCycle,
  ) => void;
  onClose: () => void;
};

const timeOptions = Array.from(
  { length: ((29 - 20) * 60) / 5 + 1 },
  (_, index) => {
    const total = 20 * 60 + index * 5;
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  },
);

export default function StaffModal({
  staff,
  onClockIn,
  onClockOut,
  onUpdateStaff,
  onAddTemporaryStaff,
  onClose,
}: Props) {
  const [selectedId, setSelectedId] =
    useState(staff[0]?.id ?? "");

  const selected = useMemo(
    () => staff.find((person) => person.id === selectedId),
    [staff, selectedId],
  );

  const [hourlyWage, setHourlyWage] =
    useState(selected?.hourlyWage ?? 1400);
  const [paymentCycle, setPaymentCycle] =
    useState<PaymentCycle>(
      selected?.paymentCycle ?? "当日日払い",
    );
  const [clockInTime, setClockInTime] = useState("21:00");
  const [clockOutTime, setClockOutTime] = useState("25:00");

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] =
    useState<StaffRole>("体入");
  const [newHourlyWage, setNewHourlyWage] =
    useState(1400);

  function changeSelected(id: string) {
    const person = staff.find((item) => item.id === id);
    setSelectedId(id);

    if (person) {
      setHourlyWage(person.hourlyWage);
      setPaymentCycle(person.paymentCycle);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4">
      <div className="mx-auto my-4 w-full max-w-3xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex justify-between">
          <h2 className="text-3xl font-bold">スタッフ管理</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
          >
            閉じる
          </button>
        </div>

        <label className="mt-6 block font-bold">
          スタッフを選択
        </label>

        <select
          size={Math.min(staff.length, 8)}
          value={selectedId}
          onChange={(event) =>
            changeSelected(event.target.value)
          }
          className="mt-2 h-60 w-full rounded-xl bg-slate-800 p-3 text-xl"
        >
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}｜{person.role}
            </option>
          ))}
        </select>

        {selected && (
          <div className="mt-5 rounded-2xl bg-slate-800 p-5">
            <h3 className="text-2xl font-bold">
              {selected.name}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">出勤時刻</label>
                <select
                  value={clockInTime}
                  onChange={(event) =>
                    setClockInTime(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl bg-slate-700 p-3"
                >
                  {timeOptions.map((time) => (
                    <option key={time}>{time}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onClockIn(selected.id, clockInTime)
                  }
                  className="mt-2 w-full rounded-xl bg-emerald-700 p-3 font-bold"
                >
                  出勤保存
                </button>
              </div>

              <div>
                <label className="font-bold">退勤時刻</label>
                <select
                  value={clockOutTime}
                  onChange={(event) =>
                    setClockOutTime(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl bg-slate-700 p-3"
                >
                  {timeOptions.map((time) => (
                    <option key={time}>{time}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onClockOut(selected.id, clockOutTime)
                  }
                  className="mt-2 w-full rounded-xl bg-red-700 p-3 font-bold"
                >
                  退勤保存
                </button>
              </div>
            </div>

            <label className="mt-4 block font-bold">時給</label>
            <input
              type="number"
              value={hourlyWage}
              onChange={(event) =>
                setHourlyWage(Number(event.target.value))
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            />

            <label className="mt-4 block font-bold">
              支払サイクル
            </label>
            <select
              value={paymentCycle}
              onChange={(event) =>
                setPaymentCycle(
                  event.target.value as PaymentCycle,
                )
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            >
              <option>当日日払い</option>
              <option>翌日払い</option>
              <option>週払い</option>
              <option>月払い</option>
            </select>

            <button
              type="button"
              onClick={() =>
                onUpdateStaff(
                  selected.id,
                  hourlyWage,
                  paymentCycle,
                )
              }
              className="mt-4 w-full rounded-xl bg-blue-700 p-3 font-bold"
            >
              時給・支払方法を保存
            </button>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-slate-800 p-5">
          <h3 className="text-xl font-bold">
            新規・体入・応援者を追加
          </h3>

          <input
            placeholder="名前"
            value={newName}
            onChange={(event) =>
              setNewName(event.target.value)
            }
            className="mt-3 w-full rounded-xl bg-slate-700 p-3"
          />

          <select
            value={newRole}
            onChange={(event) =>
              setNewRole(event.target.value as StaffRole)
            }
            className="mt-3 w-full rounded-xl bg-slate-700 p-3"
          >
            <option>新規スタッフ</option>
            <option>体入</option>
            <option>臨時・応援</option>
            <option>キャスト</option>
            <option>ボーイ</option>
          </select>

          <input
            type="number"
            value={newHourlyWage}
            onChange={(event) =>
              setNewHourlyWage(
                Number(event.target.value),
              )
            }
            className="mt-3 w-full rounded-xl bg-slate-700 p-3"
          />

          <button
            type="button"
            onClick={() => {
              if (!newName.trim()) {
                alert("名前を入力してください。");
                return;
              }

              onAddTemporaryStaff(
                newName.trim(),
                newRole,
                newHourlyWage,
                "当日日払い",
              );

              setNewName("");
            }}
            className="mt-3 w-full rounded-xl bg-emerald-600 p-3 font-bold"
          >
            スタッフ追加
          </button>
        </div>
      </div>
    </div>
  );
}
