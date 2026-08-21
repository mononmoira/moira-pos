"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  BusinessReport,
  ClosedTicket,
  PayrollAdjustment,
  PayrollAdjustmentType,
  PayrollPayment,
  Ticket,
} from "../page";
import type { Staff } from "./StaffModal";
import {
  calculatePayrollSnapshotRows,
  getBusinessDate,
  type PayrollSnapshotRow,
} from "../lib/payroll";

type Props = {
  staff: Staff[];
  reports: BusinessReport[];
  closedTickets: ClosedTicket[];
  activeTickets: Ticket[];
  currentTime: number;
  adjustments: PayrollAdjustment[];
  payments: PayrollPayment[];
  onAddAdjustment: (
    staffId: string,
    type: PayrollAdjustmentType,
    quantity: number,
  ) => void;
  onDeleteAdjustment: (
    adjustmentId: string,
  ) => void;
  onRegisterPayment: (
    staffId: string,
    amount: number,
    note: string,
  ) => void;
  onDeletePayment: (
    paymentId: string,
  ) => void;
  onClose: () => void;
};

type Tab = "today" | "month" | "all";

type ManualPayrollEntry = {
  id: string;
  businessDate: string;
  staffId: string;
  name: string;
  role: string;
  paymentCycle: string;
  hourlyWage: number;
  amount: number;
  note: string;
  createdAt: string;
};

type PayrollSummarySourceRow =
  PayrollSnapshotRow & {
    manual?: number;
  };

type SummaryRow = PayrollSummarySourceRow & {
  days: number;
  manual: number;
};

function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatMinutes(minutes: number) {
  return `${Math.floor(minutes / 60)}時間${
    minutes % 60
  }分`;
}

function aggregateRows(
  rows: PayrollSummarySourceRow[],
): SummaryRow[] {
  const map = new Map<
    string,
    SummaryRow & {
      dateSet: Set<string>;
    }
  >();

  for (const row of rows) {
    const current =
      map.get(row.staffId) ?? {
        ...row,
        minutes: 0,
        hourly: 0,
        drink: 0,
        champagne: 0,
        event: 0,
        reservation: 0,
        transport: 0,
        parking: 0,
        manual: 0,
        gross: 0,
        paid: 0,
        days: 0,
        dateSet: new Set<string>(),
      };

    current.name = row.name;
    current.role = row.role;
    current.paymentCycle =
      row.paymentCycle;
    current.hourlyWage =
      row.hourlyWage;

    current.minutes += row.minutes;
    current.hourly += row.hourly;
    current.drink += row.drink;
    current.champagne += row.champagne;
    current.event += row.event;
    current.reservation += row.reservation;
    current.transport += row.transport;
    current.parking += row.parking;
    current.manual += row.manual ?? 0;
    current.gross += row.gross;
    current.paid += row.paid;
    current.dateSet.add(row.businessDate);

    map.set(row.staffId, current);
  }

  return [...map.values()]
    .map(({ dateSet, ...row }) => ({
      ...row,
      days: dateSet.size,
    }))
    .sort(
      (a, b) =>
        b.gross - a.gross ||
        a.name.localeCompare(b.name, "ja"),
    );
}

function monthLabel(value: string) {
  const [year, month] = value.split("-");

  return `${Number(year)}年${Number(month)}月`;
}

export default function PayrollModal({
  staff,
  reports,
  closedTickets,
  activeTickets,
  currentTime,
  adjustments,
  payments,
  onAddAdjustment,
  onDeleteAdjustment,
  onRegisterPayment,
  onDeletePayment,
  onClose,
}: Props) {
  const today = getBusinessDate(
    new Date(currentTime),
  );

  const [tab, setTab] =
    useState<Tab>("today");

  const [selectedMonth, setSelectedMonth] =
    useState(today.slice(0, 7));

  const [manualEntries, setManualEntries] =
    useState<ManualPayrollEntry[]>([]);

  const [manualDate, setManualDate] =
    useState(today);

  const [manualStaffId, setManualStaffId] =
    useState("");

  const [manualAmount, setManualAmount] =
    useState(0);

  const [manualNote, setManualNote] =
    useState("");

  const [manualSaving, setManualSaving] =
    useState(false);

  const [selectedStaffId, setSelectedStaffId] =
    useState("");

  const [adjustmentType, setAdjustmentType] =
    useState<PayrollAdjustmentType>("送迎");

  const [adjustmentQuantity, setAdjustmentQuantity] =
    useState(1);

  const [paymentAmount, setPaymentAmount] =
    useState(0);

  const [paymentNote, setPaymentNote] =
    useState("");

  const todayRows = useMemo(
  () =>
    calculatePayrollSnapshotRows({
      businessDate: today,
      staff,
      closedTickets,
      activeTickets,
      currentTime,
      adjustments,
      payments,
    }),
  [
    today,
    staff,
    closedTickets,
    activeTickets,
    currentTime,
    adjustments,
    payments,
  ],
);

  useEffect(() => {
    const manualPayrollHistoryDocument = doc(
      db,
      "stores",
      "moira",
      "shared",
      "manualPayrollHistory",
    );

    const unsubscribe = onSnapshot(
      manualPayrollHistoryDocument,
      (snapshot) => {
        if (!snapshot.exists()) {
          setManualEntries([]);
          return;
        }

        const data = snapshot.data();

        setManualEntries(
          Array.isArray(data.entries)
            ? (data.entries as ManualPayrollEntry[])
            : [],
        );
      },
      (error) => {
        console.error(
          "過去給与履歴の読み込みに失敗しました。",
          error,
        );
      },
    );

    return unsubscribe;
  }, []);

  const manualRows = useMemo<
    PayrollSummarySourceRow[]
  >(
    () =>
      manualEntries.map((entry) => ({
        businessDate: entry.businessDate,
        staffId: entry.staffId,
        name: entry.name,
        role: entry.role,
        paymentCycle: entry.paymentCycle,
        hourlyWage: entry.hourlyWage,
        minutes: 0,
        hourly: 0,
        drink: 0,
drinkCount: 0,

champagne: 0,
champagneCount: 0,

event: 0,
eventCount: 0,

reservation: 0,
reservationCount: 0,
        transport: 0,
        parking: 0,
        manual: entry.amount,
        gross: entry.amount,
        paid: 0,
      })),
    [manualEntries],
  );

  const finalizedRows = useMemo(
    () =>
      reports.flatMap((report) =>
        (report.payrollRows ?? []).map((row) => ({
          ...row,
          businessDate:
            row.businessDate || report.businessDate,
        })),
      ),
    [reports],
  );

  const hasFinalizedToday = reports.some(
    (report) =>
      report.businessDate === today &&
      Array.isArray(report.payrollRows),
  );

  const monthRawRows = useMemo(() => {
    const saved = finalizedRows.filter((row) =>
      row.businessDate.startsWith(selectedMonth),
    );

    const manualSaved = manualRows.filter((row) =>
      row.businessDate.startsWith(selectedMonth),
    );

    if (
      !hasFinalizedToday &&
      today.startsWith(selectedMonth)
    ) {
      return [
        ...saved,
        ...manualSaved,
        ...todayRows,
      ];
    }

    return [
      ...saved,
      ...manualSaved,
    ];
  }, [
    finalizedRows,
    manualRows,
    selectedMonth,
    hasFinalizedToday,
    today,
    todayRows,
  ]);

  const allRawRows = useMemo(
    () =>
      hasFinalizedToday
        ? [
            ...finalizedRows,
            ...manualRows,
          ]
        : [
            ...finalizedRows,
            ...manualRows,
            ...todayRows,
          ],
    [
      finalizedRows,
      manualRows,
      hasFinalizedToday,
      todayRows,
    ],
  );

  const monthRows = useMemo(
    () => aggregateRows(monthRawRows),
    [monthRawRows],
  );

  const allRows = useMemo(
    () => aggregateRows(allRawRows),
    [allRawRows],
  );

  useEffect(() => {
    if (
      todayRows.length > 0 &&
      !todayRows.some(
        (row) => row.staffId === selectedStaffId,
      )
    ) {
      setSelectedStaffId(todayRows[0].staffId);
    }

    if (
      todayRows.length === 0 &&
      selectedStaffId
    ) {
      setSelectedStaffId("");
    }
  }, [todayRows, selectedStaffId]);

  const selectedRow =
    todayRows.find(
      (row) => row.staffId === selectedStaffId,
    ) ?? null;

  const selectedAdjustments = adjustments
    .filter(
      (item) =>
        item.staffId === selectedStaffId &&
        getBusinessDate(new Date(item.createdAt)) ===
          today,
    )
    .slice()
    .reverse();

  const selectedPayments = payments
    .filter(
      (item) =>
        item.staffId === selectedStaffId &&
        getBusinessDate(new Date(item.paidAt)) ===
          today,
    )
    .slice()
    .reverse();

  const oldReportsWithoutPayroll = reports.filter(
    (report) => !Array.isArray(report.payrollRows),
  );

  const monthOldReportCount =
    oldReportsWithoutPayroll.filter((report) =>
      report.businessDate.startsWith(selectedMonth),
    ).length;

  const todayTotal = todayRows.reduce(
    (sum, row) => sum + row.gross,
    0,
  );

  const monthTotal = monthRows.reduce(
    (sum, row) => sum + row.gross,
    0,
  );

  const allTotal = allRows.reduce(
    (sum, row) => sum + row.gross,
    0,
  );

  function selectTodayStaff(
    row: PayrollSnapshotRow,
  ) {
    setSelectedStaffId(row.staffId);

    const isDaily =
      row.paymentCycle === "当日日払い";

    setPaymentAmount(
      isDaily
        ? 0
        : Math.max(0, row.gross - row.paid),
    );

    setPaymentNote("");
  }

  function registerSelectedPayment() {
    if (!selectedRow) return;

    if (
      selectedRow.paymentCycle === "当日日払い"
    ) {
      return;
    }

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      window.alert("支払額を入力してください。");
      return;
    }

    onRegisterPayment(
      selectedRow.staffId,
      paymentAmount,
      paymentNote.trim(),
    );

    setPaymentNote("");
    setPaymentAmount(0);
  }

  async function saveManualEntries(
    entries: ManualPayrollEntry[],
  ) {
    const manualPayrollHistoryDocument = doc(
      db,
      "stores",
      "moira",
      "shared",
      "manualPayrollHistory",
    );

    await setDoc(
      manualPayrollHistoryDocument,
      {
        entries,
        updatedAt:
          new Date().toISOString(),
      },
      { merge: true },
    );
  }

  async function addManualPayrollEntry() {
    const person = staff.find(
      (item) =>
        item.id === manualStaffId,
    );

    if (!person) {
      window.alert(
        "スタッフを選択してください。",
      );
      return;
    }

    if (!manualDate) {
      window.alert(
        "日付を選択してください。",
      );
      return;
    }

    if (
      !Number.isFinite(manualAmount) ||
      manualAmount <= 0
    ) {
      window.alert(
        "給与額を1円以上で入力してください。",
      );
      return;
    }

    const entry: ManualPayrollEntry = {
      id:
        "manual-payroll-" +
        Date.now().toString(36) +
        "-" +
        Math.random()
          .toString(36)
          .slice(2, 8),
      businessDate: manualDate,
      staffId: person.id,
      name: person.name,
      role: person.role,
      paymentCycle: person.paymentCycle,
      hourlyWage: person.hourlyWage,
      amount: Math.floor(manualAmount),
      note: manualNote.trim(),
      createdAt:
        new Date().toISOString(),
    };

    const next = [
      ...manualEntries,
      entry,
    ];

    try {
      setManualSaving(true);

      await saveManualEntries(next);

      setManualEntries(next);
      setManualAmount(0);
      setManualNote("");

      window.alert(
        "過去給与を追加しました。",
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "過去給与の保存に失敗しました。",
      );
    } finally {
      setManualSaving(false);
    }
  }

  async function deleteManualPayrollEntry(
    entryId: string,
  ) {
    const target = manualEntries.find(
      (item) => item.id === entryId,
    );

    if (!target) return;

    const ok = window.confirm(
      `${target.businessDate} / ${target.name} / ${formatYen(
        target.amount,
      )}\nこの過去給与を削除しますか？`,
    );

    if (!ok) return;

    const next = manualEntries.filter(
      (item) => item.id !== entryId,
    );

    try {
      setManualSaving(true);

      await saveManualEntries(next);

      setManualEntries(next);
    } catch (error) {
      console.error(error);

      window.alert(
        "過去給与の削除に失敗しました。",
      );
    } finally {
      setManualSaving(false);
    }
  }

  function renderSummary(
    rows: SummaryRow[],
    total: number,
    title: string,
  ) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-amber-950/60 p-5">
          <p className="text-sm font-bold text-amber-300">
            {title} 給与合計
          </p>
          <p className="mt-1 text-4xl font-black text-amber-200">
            {formatYen(total)}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl bg-slate-800 p-8 text-center text-slate-400">
            集計できる給与履歴はありません。
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <section
                key={row.staffId}
                className="rounded-2xl bg-slate-800 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black">
                      {row.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {row.role}・{row.days}日・
                      {formatMinutes(row.minutes)}
                    </p>
                  </div>

                  <p className="text-2xl font-black text-amber-300">
                    {formatYen(row.gross)}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  {[
                    ["時給分", row.hourly],
                    ["ドリンク", row.drink],
                    ["シャンパン", row.champagne],
                    ["イベント", row.event],
                    ["予約", row.reservation],
                    ["送迎", row.transport],
                    ["駐車場", row.parking],
                    ["過去入力", row.manual],
                  ].map(([label, amount]) => (
                    <div
                      key={String(label)}
                      className="rounded-xl bg-slate-700/70 p-3"
                    >
                      <p className="text-xs text-slate-400">
                        {label}
                      </p>
                      <p className="mt-1 font-black">
                        {formatYen(Number(amount))}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/90 p-3 sm:p-4">
      <div className="mx-auto my-4 w-full max-w-7xl rounded-3xl bg-slate-900 p-4 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black">
              給与・バック集計
            </h2>
            <p className="mt-2 text-slate-400">
              当日・月別・全期間で給与を確認
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

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-950 p-2">
          {[
            { id: "today" as const, label: "当日" },
            { id: "month" as const, label: "月別" },
            { id: "all" as const, label: "全集計" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-14 rounded-xl px-3 py-3 font-black ${
                tab === item.id
                  ? "bg-amber-600 text-white"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "today" && (
          <div className="mt-5">
            <div className="rounded-2xl bg-amber-950/60 p-5">
              <p className="text-sm font-bold text-amber-300">
                {today} 営業分
              </p>
              <p className="mt-1 text-4xl font-black text-amber-200">
                {formatYen(todayTotal)}
              </p>
            </div>

            {todayRows.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-slate-800 p-10 text-center">
                <p className="text-xl font-bold">
                  本日の給与データはありません
                </p>
                <p className="mt-2 text-slate-400">
                  出勤登録またはバック発生後に表示されます。
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-5 lg:grid-cols-[330px_1fr]">
                <aside className="space-y-2">
                  {todayRows.map((row) => {
                    const selected =
                      row.staffId === selectedStaffId;

                    return (
                      <button
                        key={row.staffId}
                        type="button"
                        onClick={() => selectTodayStaff(row)}
                        className={`w-full rounded-2xl border p-4 text-left ${
                          selected
                            ? "border-amber-400 bg-amber-950/60"
                            : "border-slate-700 bg-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xl font-black">
                              {row.name}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {row.role}・
                              {formatMinutes(row.minutes)}
                            </p>
                          </div>

                          <p className="text-xl font-black text-amber-300">
                            {formatYen(row.gross)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </aside>

                {selectedRow && (
                  <main className="space-y-4">
                    <section className="rounded-2xl bg-slate-800 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-2xl font-black">
                            {selectedRow.name}
                          </h3>
                          <p className="mt-1 text-slate-400">
                            {formatMinutes(selectedRow.minutes)}勤務・
                            {selectedRow.paymentCycle}
                          </p>
                        </div>

                        <p className="text-3xl font-black text-amber-300">
                          {formatYen(selectedRow.gross)}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                        {[
                          ["時給分", selectedRow.hourly],
                          ["ドリンク", selectedRow.drink],
                          ["シャンパン", selectedRow.champagne],
                          ["イベント", selectedRow.event],
                          ["予約", selectedRow.reservation],
                          ["送迎", selectedRow.transport],
                          ["駐車場", selectedRow.parking],
                        ].map(([label, amount]) => (
                          <div
                            key={String(label)}
                            className="rounded-xl bg-slate-700/70 p-3"
                          >
                            <p className="text-xs text-slate-400">
                              {label}
                            </p>
                            <p className="mt-1 font-black">
                              {formatYen(Number(amount))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <section className="rounded-2xl bg-slate-800 p-5">
                        <h3 className="text-xl font-black">
                          追加バック
                        </h3>

                        <div className="mt-4 grid grid-cols-[1fr_100px] gap-3">
                          <select
                            value={adjustmentType}
                            onChange={(event) =>
                              setAdjustmentType(
                                event.target.value as PayrollAdjustmentType,
                              )
                            }
                            className="rounded-xl bg-slate-700 p-3"
                          >
                            <option value="送迎">送迎</option>
                            <option value="駐車場">駐車場</option>
                          </select>

                          <input
                            type="number"
                            min={1}
                            value={adjustmentQuantity}
                            onChange={(event) =>
                              setAdjustmentQuantity(
                                Math.max(
                                  1,
                                  Number(event.target.value) || 1,
                                ),
                              )
                            }
                            className="rounded-xl bg-slate-700 p-3"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onAddAdjustment(
                              selectedRow.staffId,
                              adjustmentType,
                              adjustmentQuantity,
                            )
                          }
                          className="mt-3 w-full rounded-xl bg-blue-600 p-3 font-bold"
                        >
                          追加する
                        </button>

                        <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
                          {selectedAdjustments.length === 0 ? (
                            <p className="rounded-xl bg-slate-700/50 p-3 text-sm text-slate-400">
                              本日の追加バックはありません。
                            </p>
                          ) : (
                            selectedAdjustments.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 rounded-xl bg-slate-700 p-3"
                              >
                                <div>
                                  <strong>
                                    {item.type}×{item.quantity}
                                  </strong>
                                  <p className="text-sm text-slate-300">
                                    {formatYen(
                                      item.quantity * item.unitAmount,
                                    )}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    onDeleteAdjustment(item.id)
                                  }
                                  className="rounded-lg bg-red-800 px-3 py-2 text-sm font-bold"
                                >
                                  削除
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      <section className="rounded-2xl bg-slate-800 p-5">
                        <h3 className="text-xl font-black">
                          支払い
                        </h3>

                        {selectedRow.paymentCycle ===
                        "当日日払い" ? (
                          <div className="mt-4 rounded-xl bg-emerald-950/60 p-4">
                            <p className="font-bold text-emerald-200">
                              当日日払い
                            </p>
                            <p className="mt-2 text-3xl font-black">
                              {formatYen(selectedRow.gross)}
                            </p>
                            <p className="mt-2 text-sm text-slate-400">
                              日払いスタッフは支払履歴登録を行いません。
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="mt-4 rounded-xl bg-slate-700 p-4">
                              <p>
                                本日支給{" "}
                                <strong>
                                  {formatYen(selectedRow.gross)}
                                </strong>
                              </p>
                              <p className="mt-1">
                                本日支払済{" "}
                                <strong>
                                  {formatYen(selectedRow.paid)}
                                </strong>
                              </p>
                              <p className="mt-2 text-xl font-black text-red-300">
                                差引{" "}
                                {formatYen(
                                  Math.max(
                                    0,
                                    selectedRow.gross -
                                      selectedRow.paid,
                                  ),
                                )}
                              </p>
                            </div>

                            <input
                              type="number"
                              min={1}
                              value={paymentAmount}
                              onChange={(event) =>
                                setPaymentAmount(
                                  Number(event.target.value),
                                )
                              }
                              className="mt-4 w-full rounded-xl bg-slate-700 p-3 text-xl"
                              placeholder="支払額"
                            />

                            <input
                              value={paymentNote}
                              onChange={(event) =>
                                setPaymentNote(event.target.value)
                              }
                              className="mt-3 w-full rounded-xl bg-slate-700 p-3"
                              placeholder="メモ"
                            />

                            <button
                              type="button"
                              onClick={registerSelectedPayment}
                              className="mt-3 w-full rounded-xl bg-emerald-600 p-3 font-bold"
                            >
                              支払いを登録
                            </button>

                            <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
                              {selectedPayments.length === 0 ? (
                                <p className="rounded-xl bg-slate-700/50 p-3 text-sm text-slate-400">
                                  本日の支払い履歴はありません。
                                </p>
                              ) : (
                                selectedPayments.map((payment) => (
                                  <div
                                    key={payment.id}
                                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-700 p-3"
                                  >
                                    <div>
                                      <strong>
                                        {formatYen(payment.amount)}
                                      </strong>
                                      <p className="text-sm text-slate-300">
                                        {new Date(
                                          payment.paidAt,
                                        ).toLocaleString("ja-JP")}
                                        {payment.note
                                          ? `・${payment.note}`
                                          : ""}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        onDeletePayment(payment.id)
                                      }
                                      className="rounded-lg bg-red-800 px-3 py-2 text-sm font-bold"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </section>
                    </div>
                  </main>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "month" && (
          <div className="mt-5">
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-800 p-4">
              <strong>集計月</strong>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(event.target.value)
                }
                className="rounded-xl bg-slate-700 px-4 py-3 font-bold"
              />
              <span className="text-slate-400">
                {monthLabel(selectedMonth)}
              </span>
            </div>

            {renderSummary(
              monthRows,
              monthTotal,
              monthLabel(selectedMonth),
            )}

            <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-800 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">
                    過去給与追加
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    給与履歴保存を導入する前の日を手入力できます。
                  </p>
                </div>
                <p className="rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-400">
                  給与専用データとして保存
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-sm text-slate-300">
                    日付
                  </span>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(event) =>
                      setManualDate(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl bg-slate-700 p-3"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-slate-300">
                    スタッフ
                  </span>
                  <select
                    value={manualStaffId}
                    onChange={(event) =>
                      setManualStaffId(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl bg-slate-700 p-3"
                  >
                    <option value="">
                      選択してください
                    </option>
                    {staff.map((person) => (
                      <option
                        key={person.id}
                        value={person.id}
                      >
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-slate-300">
                    給与額
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={
                      manualAmount || ""
                    }
                    onChange={(event) =>
                      setManualAmount(
                        Number(
                          event.target.value,
                        ),
                      )
                    }
                    placeholder="例 12500"
                    className="w-full rounded-xl bg-slate-700 p-3"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-slate-300">
                    メモ
                  </span>
                  <input
                    value={manualNote}
                    onChange={(event) =>
                      setManualNote(
                        event.target.value,
                      )
                    }
                    placeholder="例 8/3勤務分"
                    className="w-full rounded-xl bg-slate-700 p-3"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={addManualPayrollEntry}
                disabled={manualSaving}
                className="mt-4 min-h-12 w-full rounded-xl bg-emerald-600 px-4 py-3 font-black disabled:opacity-50"
              >
                {manualSaving
                  ? "保存中..."
                  : "この過去給与を追加"}
              </button>

              <div className="mt-5 space-y-2">
                <p className="font-bold">
                  {monthLabel(selectedMonth)}
                  の過去給与入力
                </p>

                {manualEntries.filter((entry) =>
                  entry.businessDate.startsWith(
                    selectedMonth,
                  ),
                ).length === 0 ? (
                  <p className="rounded-xl bg-slate-700/50 p-3 text-sm text-slate-400">
                    この月の手入力給与はありません。
                  </p>
                ) : (
                  manualEntries
                    .filter((entry) =>
                      entry.businessDate.startsWith(
                        selectedMonth,
                      ),
                    )
                    .slice()
                    .sort((a, b) =>
                      b.businessDate.localeCompare(
                        a.businessDate,
                      ),
                    )
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-700 p-3"
                      >
                        <div>
                          <strong>
                            {entry.businessDate}
                            ・{entry.name}
                          </strong>
                          <p className="mt-1 text-sm text-slate-300">
                            {formatYen(
                              entry.amount,
                            )}
                            {entry.note
                              ? `・${entry.note}`
                              : ""}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            deleteManualPayrollEntry(
                              entry.id,
                            )
                          }
                          disabled={manualSaving}
                          className="rounded-lg bg-red-800 px-3 py-2 text-sm font-bold disabled:opacity-50"
                        >
                          削除
                        </button>
                      </div>
                    ))
                )}
              </div>
            </section>

            {monthOldReportCount > 0 && (
              <p className="mt-4 rounded-xl bg-orange-950/60 p-4 text-sm text-orange-200">
                この月には給与履歴保存を導入する前の営業日報が
                {monthOldReportCount}日分あります。その日分は月集計に含まれていません。
              </p>
            )}
          </div>
        )}

        {tab === "all" && (
          <div className="mt-5">
            {renderSummary(allRows, allTotal, "全期間")}

            {oldReportsWithoutPayroll.length > 0 && (
              <p className="mt-4 rounded-xl bg-orange-950/60 p-4 text-sm text-orange-200">
                給与履歴保存を導入する前の営業日報が
                {oldReportsWithoutPayroll.length}日分あります。その日分は全集計に含まれていません。
              </p>
            )}
          </div>
        )}

        <p className="mt-5 text-xs leading-5 text-slate-400 sm:text-sm">
          月別・全集計は営業終了時に確定保存した給与履歴と「過去給与追加」の手入力分を使用します。営業終了前の本日分は、重複しない範囲で月別・全集計にも含めて表示します。
        </p>
      </div>
    </div>
  );
}
