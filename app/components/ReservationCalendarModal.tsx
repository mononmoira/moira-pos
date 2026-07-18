"use client";

import { createId } from "../lib/createId";

import { useMemo, useState } from "react";
import type {
  CalendarReservation,
  Customer,
  ReservationStatus,
} from "../page";
import type { Staff } from "./StaffModal";

type Props = {
  reservations: CalendarReservation[];
  customers: Customer[];
  staff: Staff[];
  onSave: (
    reservation: CalendarReservation,
  ) => void;
  onDelete: (reservationId: string) => void;
  onClose: () => void;
};

function todayText() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(
      2,
      "0",
    ),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function ReservationCalendarModal({
  reservations,
  customers,
  staff,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [selectedDate, setSelectedDate] =
    useState(todayText());
  const [editingId, setEditingId] =
    useState("");
  const [time, setTime] = useState("20:00");
  const [customerId, setCustomerId] =
    useState("");
  const [customerName, setCustomerName] =
    useState("");
  const [guestCount, setGuestCount] =
    useState(1);
  const [assignedStaffIds, setAssignedStaffIds] =
    useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [status, setStatus] =
    useState<ReservationStatus>("予約");

  const dayReservations = useMemo(
    () =>
      reservations
        .filter(
          (item) =>
            item.date === selectedDate,
        )
        .sort((a, b) =>
          a.time.localeCompare(b.time),
        ),
    [reservations, selectedDate],
  );

  function edit(item: CalendarReservation) {
    setEditingId(item.id);
    setTime(item.time);
    setCustomerId(item.customerId ?? "");
    setCustomerName(item.customerName);
    setGuestCount(item.guestCount);
    setAssignedStaffIds(
      item.assignedStaffIds,
    );
    setMemo(item.memo);
    setStatus(item.status);
  }

  function reset() {
    setEditingId("");
    setTime("20:00");
    setCustomerId("");
    setCustomerName("");
    setGuestCount(1);
    setAssignedStaffIds([]);
    setMemo("");
    setStatus("予約");
  }

  function save() {
    const linkedCustomer = customers.find(
      (item) => item.id === customerId,
    );
    const name =
      linkedCustomer?.name ||
      customerName.trim();

    if (!name) {
      alert("お客様名を入力してください。");
      return;
    }

    const now = new Date().toISOString();

    onSave({
      id:
        editingId || createId(),
      date: selectedDate,
      time,
      customerId:
        customerId || undefined,
      customerName: name,
      guestCount,
      assignedStaffIds,
      memo,
      status,
      createdAt:
        reservations.find(
          (item) => item.id === editingId,
        )?.createdAt ?? now,
      updatedAt: now,
    });

    reset();
  }

  return (
    <div className="fixed inset-0 z-[105] overflow-y-auto bg-black/90 p-4">
      <div className="mx-auto my-4 w-full max-w-6xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex justify-between">
          <div>
            <h2 className="text-3xl font-black">
              予約カレンダー
            </h2>
            <p className="mt-2 text-slate-400">
              日付ごとの予約・担当スタッフ
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-5 py-3"
          >
            閉じる
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_420px]">
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(
                  e.target.value,
                );
                reset();
              }}
              className="w-full rounded-xl bg-slate-800 p-4 text-xl"
            />

            <div className="mt-4 space-y-2">
              {dayReservations.length === 0 ? (
                <p className="rounded-xl bg-slate-800 p-6 text-center text-slate-400">
                  この日の予約はありません。
                </p>
              ) : (
                dayReservations.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => edit(item)}
                    className="w-full rounded-xl bg-slate-800 p-4 text-left"
                  >
                    <div className="flex justify-between">
                      <strong className="text-xl">
                        {item.time}{" "}
                        {item.customerName}
                      </strong>
                      <span>{item.status}</span>
                    </div>
                    <p className="mt-1">
                      {item.guestCount}名
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      担当：
                      {item.assignedStaffIds
                        .map(
                          (id) =>
                            staff.find(
                              (person) =>
                                person.id === id,
                            )?.name ?? id,
                        )
                        .join("・") || "未設定"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800 p-5">
            <h3 className="text-2xl font-bold">
              {editingId
                ? "予約編集"
                : "新規予約"}
            </h3>

            <label className="mt-4 block">
              時刻
            </label>
            <input
              type="time"
              step={300}
              value={time}
              onChange={(e) =>
                setTime(e.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            />

            <label className="mt-4 block">
              登録顧客
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(
                  e.target.value,
                );
                const customer =
                  customers.find(
                    (item) =>
                      item.id ===
                      e.target.value,
                  );

                if (customer) {
                  setCustomerName(
                    customer.name,
                  );
                  setAssignedStaffIds(
                    customer.assignedStaffIds,
                  );
                }
              }}
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            >
              <option value="">
                未登録顧客
              </option>
              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.name}
                </option>
              ))}
            </select>

            <label className="mt-4 block">
              お客様名
            </label>
            <input
              value={customerName}
              onChange={(e) =>
                setCustomerName(
                  e.target.value,
                )
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            />

            <label className="mt-4 block">
              人数
            </label>
            <input
              type="number"
              min={1}
              value={guestCount}
              onChange={(e) =>
                setGuestCount(
                  Number(e.target.value),
                )
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            />

            <label className="mt-4 block">
              担当スタッフ
            </label>
            <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">
              {staff.map((person) => {
                const selected =
                  assignedStaffIds.includes(
                    person.id,
                  );

                return (
                  <button
                    key={person.id}
                    onClick={() =>
                      setAssignedStaffIds(
                        (current) =>
                          selected
                            ? current.filter(
                                (id) =>
                                  id !==
                                  person.id,
                              )
                            : [
                                ...current,
                                person.id,
                              ],
                      )
                    }
                    className={`rounded-xl p-3 ${
                      selected
                        ? "bg-pink-600"
                        : "bg-slate-700"
                    }`}
                  >
                    {selected ? "✓ " : ""}
                    {person.name}
                  </button>
                );
              })}
            </div>

            <label className="mt-4 block">
              状態
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target
                    .value as ReservationStatus,
                )
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            >
              <option>予約</option>
              <option>来店済み</option>
              <option>キャンセル</option>
            </select>

            <label className="mt-4 block">
              メモ
            </label>
            <textarea
              value={memo}
              onChange={(e) =>
                setMemo(e.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-700 p-3"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              {editingId ? (
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "予約を削除しますか？",
                      )
                    ) {
                      onDelete(editingId);
                      reset();
                    }
                  }}
                  className="rounded-xl bg-red-800 p-3 font-bold"
                >
                  削除
                </button>
              ) : (
                <button
                  onClick={reset}
                  className="rounded-xl bg-slate-700 p-3 font-bold"
                >
                  クリア
                </button>
              )}

              <button
                onClick={save}
                className="rounded-xl bg-indigo-700 p-3 font-bold"
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
