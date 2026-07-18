"use client";

import { useMemo, useState } from "react";
import type {
  Customer,
  CustomerAgeGroup,
  CustomerGender,
  SmokingStatus,
} from "../page";
import type { Staff } from "./StaffModal";

type Props = {
  customers: Customer[];
  staff: Staff[];
  onSave: (
    customer: {
      name: string;
      ageGroup: CustomerAgeGroup;
      birthMonth: number | null;
      birthDay: number | null;
      smokingStatus: SmokingStatus;
      gender: CustomerGender;
      assignedStaffIds: string[];
      bottleName: string;
      memo: string;
    },
    customerId?: string,
  ) => void;
  onDelete: (customerId: string) => void;
  onOpenReservationCalendar: () => void;
  onClose: () => void;
};

const ageGroups: CustomerAgeGroup[] = [
  "不明",
  "20代以下",
  "30代",
  "40代",
  "50代",
  "60代以上",
];

const genders: CustomerGender[] = [
  "未設定",
  "男性",
  "女性",
  "その他",
];

const smokingStatuses: SmokingStatus[] = [
  "不明",
  "喫煙",
  "禁煙",
];

const months = Array.from(
  { length: 12 },
  (_, index) => index + 1,
);

const days = Array.from(
  { length: 31 },
  (_, index) => index + 1,
);

function formatDate(value: string) {
  return new Date(value).toLocaleString(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export default function CustomerModal({
  customers,
  staff,
  onSave,
  onDelete,
  onOpenReservationCalendar,
  onClose,
}: Props) {
  const [selectedId, setSelectedId] =
    useState(customers[0]?.id ?? "");

  const selected = useMemo(
    () =>
      customers.find(
        (customer) =>
          customer.id === selectedId,
      ) ?? null,
    [customers, selectedId],
  );

  const [name, setName] = useState(
    selected?.name ?? "",
  );

  const [ageGroup, setAgeGroup] =
    useState<CustomerAgeGroup>(
      selected?.ageGroup ?? "不明",
    );

  const [birthMonth, setBirthMonth] =
    useState(
      selected?.birthMonth?.toString() ?? "",
    );

  const [birthDay, setBirthDay] =
    useState(
      selected?.birthDay?.toString() ?? "",
    );

  const [smokingStatus, setSmokingStatus] =
    useState<SmokingStatus>(
      selected?.smokingStatus ?? "不明",
    );

  const [gender, setGender] =
    useState<CustomerGender>(
      selected?.gender ?? "未設定",
    );

  const [
    assignedStaffIds,
    setAssignedStaffIds,
  ] = useState<string[]>(
    selected?.assignedStaffIds ?? [],
  );

  const [bottleName, setBottleName] =
    useState(selected?.bottleName ?? "");

  const [memo, setMemo] = useState(
    selected?.memo ?? "",
  );

  function loadCustomer(
    customer: Customer | null,
  ) {
    setName(customer?.name ?? "");
    setAgeGroup(
      customer?.ageGroup ?? "不明",
    );
    setBirthMonth(
      customer?.birthMonth?.toString() ?? "",
    );
    setBirthDay(
      customer?.birthDay?.toString() ?? "",
    );
    setSmokingStatus(
      customer?.smokingStatus ?? "不明",
    );
    setGender(
      customer?.gender ?? "未設定",
    );
    setAssignedStaffIds(
      customer?.assignedStaffIds ?? [],
    );
    setBottleName(
      customer?.bottleName ?? "",
    );
    setMemo(customer?.memo ?? "");
  }

  function selectCustomer(id: string) {
    setSelectedId(id);

    loadCustomer(
      customers.find(
        (customer) => customer.id === id,
      ) ?? null,
    );
  }

  function startNew() {
    setSelectedId("");
    loadCustomer(null);
  }

  function toggleStaff(staffId: string) {
    setAssignedStaffIds((current) =>
      current.includes(staffId)
        ? current.filter(
            (id) => id !== staffId,
          )
        : [...current, staffId],
    );
  }

  function save() {
    if (!name.trim()) {
      alert(
        "お客様名を入力してください。",
      );
      return;
    }

    onSave(
      {
        name: name.trim(),
        ageGroup,
        birthMonth: birthMonth
          ? Number(birthMonth)
          : null,
        birthDay: birthDay
          ? Number(birthDay)
          : null,
        smokingStatus,
        gender,
        assignedStaffIds,
        bottleName: bottleName.trim(),
        memo: memo.trim(),
      },
      selectedId || undefined,
    );

    alert(
      selectedId
        ? "顧客情報を更新しました。"
        : "顧客を登録しました。",
    );
  }

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/90 p-4">
      <div className="mx-auto my-4 w-full max-w-6xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">
              顧客管理
            </h2>

            <p className="mt-2 text-slate-400">
              年代・誕生日・喫煙状況・担当スタッフ・ボトル・来店履歴
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenReservationCalendar}
              className="rounded-xl bg-indigo-700 px-5 py-3 font-bold"
            >
              予約カレンダー
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
            >
              閉じる
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[290px_1fr]">
          <div>
            <button
              type="button"
              onClick={startNew}
              className="mb-3 w-full rounded-xl bg-violet-700 p-3 font-bold"
            >
              ＋ 新規顧客
            </button>

            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() =>
                    selectCustomer(customer.id)
                  }
                  className={`w-full rounded-xl p-4 text-left ${
                    selectedId === customer.id
                      ? "bg-violet-700"
                      : "bg-slate-800"
                  }`}
                >
                  <p className="font-bold">
                    {customer.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    {customer.ageGroup}・
                    {customer.gender}・
                    {customer.smokingStatus}
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    誕生日：
                    {customer.birthMonth &&
                    customer.birthDay
                      ? `${customer.birthMonth}月${customer.birthDay}日`
                      : "未設定"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    来店 {customer.visitCount}回
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-800 p-5">
              <h3 className="text-2xl font-bold">
                {selectedId
                  ? "顧客情報を編集"
                  : "新規顧客登録"}
              </h3>

              <label className="mt-4 block font-bold">
                お客様名
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                className="mt-2 w-full rounded-xl bg-slate-700 p-3"
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="font-bold">
                    年代
                  </label>

                  <select
                    value={ageGroup}
                    onChange={(event) =>
                      setAgeGroup(
                        event.target
                          .value as CustomerAgeGroup,
                      )
                    }
                    className="mt-2 w-full rounded-xl bg-slate-700 p-3"
                  >
                    {ageGroups.map((item) => (
                      <option key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold">
                    性別
                  </label>

                  <select
                    value={gender}
                    onChange={(event) =>
                      setGender(
                        event.target
                          .value as CustomerGender,
                      )
                    }
                    className="mt-2 w-full rounded-xl bg-slate-700 p-3"
                  >
                    {genders.map((item) => (
                      <option key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold">
                    喫煙状況
                  </label>

                  <select
                    value={smokingStatus}
                    onChange={(event) =>
                      setSmokingStatus(
                        event.target
                          .value as SmokingStatus,
                      )
                    }
                    className="mt-2 w-full rounded-xl bg-slate-700 p-3"
                  >
                    {smokingStatuses.map(
                      (item) => (
                        <option key={item}>
                          {item}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <label className="mt-4 block font-bold">
                誕生日
              </label>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <select
                  value={birthMonth}
                  onChange={(event) =>
                    setBirthMonth(
                      event.target.value,
                    )
                  }
                  className="rounded-xl bg-slate-700 p-3"
                >
                  <option value="">
                    月未設定
                  </option>

                  {months.map((month) => (
                    <option
                      key={month}
                      value={month}
                    >
                      {month}月
                    </option>
                  ))}
                </select>

                <select
                  value={birthDay}
                  onChange={(event) =>
                    setBirthDay(
                      event.target.value,
                    )
                  }
                  className="rounded-xl bg-slate-700 p-3"
                >
                  <option value="">
                    日未設定
                  </option>

                  {days.map((day) => (
                    <option
                      key={day}
                      value={day}
                    >
                      {day}日
                    </option>
                  ))}
                </select>
              </div>

              <label className="mt-4 block font-bold">
                担当スタッフ（複数選択）
              </label>

              <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                {staff.map((person) => {
                  const isSelected =
                    assignedStaffIds.includes(
                      person.id,
                    );

                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() =>
                        toggleStaff(person.id)
                      }
                      className={`rounded-xl p-3 text-left ${
                        isSelected
                          ? "bg-pink-600"
                          : "bg-slate-700"
                      }`}
                    >
                      <strong>
                        {isSelected ? "✓ " : ""}
                        {person.name}
                      </strong>

                      <span className="block text-xs text-slate-300">
                        {person.role}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="mt-4 block font-bold">
                キープボトル名
              </label>

              <input
                value={bottleName}
                onChange={(event) =>
                  setBottleName(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl bg-slate-700 p-3"
              />

              <label className="mt-4 block font-bold">
                メモ
              </label>

              <textarea
                value={memo}
                onChange={(event) =>
                  setMemo(event.target.value)
                }
                rows={3}
                className="mt-2 w-full rounded-xl bg-slate-700 p-3"
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                {selectedId ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "この顧客を削除しますか？",
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
                  type="button"
                  onClick={save}
                  className="rounded-xl bg-emerald-700 p-3 font-bold"
                >
                  保存
                </button>
              </div>
            </div>

            {selected && (
              <div className="rounded-2xl bg-slate-800 p-5">
                <h4 className="text-xl font-bold">
                  来店履歴
                </h4>

                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                  {selected.visits.length === 0 ? (
                    <p className="rounded-xl bg-slate-700 p-4 text-slate-400">
                      来店履歴はありません。
                    </p>
                  ) : (
                    selected.visits
                      .slice()
                      .reverse()
                      .map((visit) => (
                        <div
                          key={visit.id}
                          className="rounded-xl bg-slate-700 p-4"
                        >
                          {formatDate(
                            visit.visitedAt,
                          )}{" "}
                          ／{" "}
                          {visit.ticketTotal.toLocaleString()}
                          円
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
