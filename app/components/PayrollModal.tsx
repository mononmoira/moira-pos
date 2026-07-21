"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ClosedTicket,
  PayrollAdjustment,
  PayrollAdjustmentType,
  PayrollPayment,
  Ticket,
} from "../page";
import type { Staff } from "./StaffModal";

type Props = {
  staff: Staff[];
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
  onDeleteAdjustment: (adjustmentId: string) => void;
  onRegisterPayment: (
    staffId: string,
    amount: number,
    note: string,
  ) => void;
  onDeletePayment: (paymentId: string) => void;
  onClose: () => void;
};

const champagneBack: Record<string, number> = {
  pompa: 1000,
  mavam: 1500,
  veuve: 3000,
  moetNir: 3500,
  soumei: 5000,
  angel: 10000,
  armand: 12000,
};

const normalDrinkBack: Record<string, number> = {
  castDrink: 300,
  castJug: 500,
  castShot: 500,
  castMega: 1500,
  castAnejo: 1000,
};

const companionDrinkBack: Record<string, number> = {
  castDrink: 400,
  castJug: 500,
  castShot: 500,
  castMega: 1600,
  castAnejo: 1100,
};

function eventBackPerCup(productId: string) {
  const lower = productId.toLowerCase();

  if (productId.startsWith("ferris") || productId.startsWith("heart")) {
    if (lower.includes("tequilakleiner") || lower.includes("mix")) return 700;
    if (lower.includes("kleiner")) return 600;
    if (lower.includes("soft")) return 400;
    if (lower.includes("ginger")) return 500;
    return 800;
  }

  if (productId.startsWith("roulette")) {
    if (lower.includes("kleiner")) return 600;
    if (lower.includes("soft")) return 400;
    if (lower.includes("ginger")) return 500;
    return 700;
  }

  if (lower.includes("cocabombcola")) return 600;
  if (lower.includes("cocabomb")) return 700;
  return 0;
}

function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatMinutes(minutes: number) {
  return `${Math.floor(minutes / 60)}時間${minutes % 60}分`;
}

function getMinutes(
  clockIn: string | null,
  clockOut: string | null,
  currentTime: number,
) {
  if (!clockIn) return 0;
  const start = new Date(clockIn).getTime();
  const end = clockOut ? new Date(clockOut).getTime() : currentTime;
  return Math.max(0, Math.floor((end - start) / 60000));
}

function isDailyPayment(person: Staff) {
  return person.paymentCycle === "当日日払い";
}

export default function PayrollModal({
  staff,
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
  const attendedStaff = useMemo(
    () => staff.filter((person) => Boolean(person.clockIn)),
    [staff],
  );

  const [selectedStaffId, setSelectedStaffId] = useState(
    attendedStaff[0]?.id ?? "",
  );
  const [adjustmentType, setAdjustmentType] =
    useState<PayrollAdjustmentType>("送迎");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState("");

  useEffect(() => {
    if (
      attendedStaff.length > 0 &&
      !attendedStaff.some((person) => person.id === selectedStaffId)
    ) {
      setSelectedStaffId(attendedStaff[0].id);
    }

    if (attendedStaff.length === 0 && selectedStaffId) {
      setSelectedStaffId("");
    }
  }, [attendedStaff, selectedStaffId]);

  const rows = useMemo(() => {
    const tickets: Ticket[] = [...closedTickets, ...activeTickets];

    return attendedStaff.map((person) => {
      const minutes = getMinutes(person.clockIn, person.clockOut, currentTime);
      const hourly = Math.floor((minutes * person.hourlyWage) / 60);
      let drink = 0;
      let champagne = 0;
      let event = 0;

      for (const ticket of tickets) {
        const companionSeat = ticket.orders.some(
          (order) => order.productId === "companion",
        );
        const drinkTable = companionSeat ? companionDrinkBack : normalDrinkBack;

        for (const order of ticket.orders) {
          if (
            order.assignedStaffIds?.includes(person.id) &&
            drinkTable[order.productId]
          ) {
            drink += drinkTable[order.productId] * order.quantity;
          }

          const totalChampagneBack = champagneBack[order.productId];
          if (
            totalChampagneBack &&
            order.assignedStaffIds?.includes(person.id)
          ) {
            const assignedCount = order.assignedStaffIds.length;
            champagne +=
              Math.floor(totalChampagneBack / assignedCount / 100) *
              100 *
              order.quantity;
          }

          const cups = order.eventCups?.[person.id] ?? 0;
          event += cups * eventBackPerCup(order.productId);

          if (order.representativeStaffId === person.id) {
            event += 1000;
          }
        }
      }

      const staffAdjustments = adjustments.filter(
        (item) => item.staffId === person.id,
      );

      const reservationFromTickets = tickets.reduce((total, ticket) => {
        const quantity = (ticket.reservationEntries ?? [])
          .filter((entry) => entry.staffId === person.id)
          .reduce((subtotal, entry) => subtotal + entry.quantity, 0);
        return total + quantity * 300;
      }, 0);

      const legacyReservation = staffAdjustments
        .filter((item) => item.type === "予約")
        .reduce(
          (total, item) => total + item.quantity * item.unitAmount,
          0,
        );

      const reservation = reservationFromTickets + legacyReservation;
      const transport = staffAdjustments
        .filter((item) => item.type === "送迎")
        .reduce(
          (total, item) => total + item.quantity * item.unitAmount,
          0,
        );
      const parking = staffAdjustments
        .filter((item) => item.type === "駐車場")
        .reduce(
          (total, item) => total + item.quantity * item.unitAmount,
          0,
        );

      const gross =
        hourly +
        drink +
        champagne +
        event +
        reservation +
        transport +
        parking;

      const daily = isDailyPayment(person);
      const paid = daily
        ? 0
        : payments
            .filter((payment) => payment.staffId === person.id)
            .reduce((total, payment) => total + payment.amount, 0);
      const unpaid = daily ? 0 : Math.max(0, gross - paid);

      return {
        person,
        minutes,
        hourly,
        drink,
        champagne,
        event,
        reservation,
        transport,
        parking,
        gross,
        paid,
        unpaid,
        daily,
      };
    });
  }, [
    attendedStaff,
    closedTickets,
    activeTickets,
    currentTime,
    adjustments,
    payments,
  ]);

  const selectedRow = rows.find(
    (row) => row.person.id === selectedStaffId,
  );
  const selectedAdjustments = adjustments
    .filter((item) => item.staffId === selectedStaffId)
    .slice()
    .reverse();
  const selectedPayments = payments
    .filter((item) => item.staffId === selectedStaffId)
    .slice()
    .reverse();

  const dailyTotal = rows
    .filter((row) => row.daily)
    .reduce((total, row) => total + row.gross, 0);
  const monthlyUnpaidTotal = rows
    .filter((row) => !row.daily)
    .reduce((total, row) => total + row.unpaid, 0);

  function selectStaff(staffId: string, unpaid: number, daily: boolean) {
    setSelectedStaffId(staffId);
    setPaymentAmount(daily ? 0 : unpaid);
    setPaymentNote("");
  }

  function registerSelectedPayment() {
    if (!selectedRow || selectedRow.daily) return;
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      window.alert("支払額を入力してください。");
      return;
    }

    onRegisterPayment(
      selectedRow.person.id,
      paymentAmount,
      paymentNote.trim(),
    );
    setPaymentNote("");
    setPaymentAmount(0);
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/90 p-3 sm:p-4">
      <div className="mx-auto my-3 w-full max-w-7xl rounded-3xl bg-slate-900 p-4 text-white sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">給与・バック管理</h2>
            <p className="mt-1 text-sm text-slate-400 sm:text-base">
              本日出勤したスタッフだけを表示しています
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-slate-700 px-5 py-3 font-bold"
          >
            閉じる
          </button>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/50 p-4">
            <p className="text-sm font-bold text-emerald-300">今日用意する日払い現金</p>
            <p className="mt-1 text-3xl font-black text-emerald-200">
              {formatYen(dailyTotal)}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-700/60 bg-blue-950/50 p-4">
            <p className="text-sm font-bold text-blue-300">月払いスタッフの未払い</p>
            <p className="mt-1 text-3xl font-black text-blue-200">
              {formatYen(monthlyUnpaidTotal)}
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-800 p-10 text-center">
            <p className="text-xl font-bold">本日の出勤スタッフはいません</p>
            <p className="mt-2 text-slate-400">出勤登録後に給与とバックが表示されます。</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[340px_1fr]">
            <aside className="space-y-3">
              <h3 className="px-1 text-lg font-black">本日の出勤スタッフ</h3>
              <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                {rows.map((row) => {
                  const selected = row.person.id === selectedStaffId;
                  return (
                    <button
                      key={row.person.id}
                      type="button"
                      onClick={() =>
                        selectStaff(row.person.id, row.unpaid, row.daily)
                      }
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-blue-400 bg-blue-900/70"
                          : "border-slate-700 bg-slate-800 hover:bg-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-black">{row.person.name}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {row.person.role}・{formatMinutes(row.minutes)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            row.daily
                              ? "bg-emerald-900 text-emerald-200"
                              : "bg-blue-900 text-blue-200"
                          }`}
                        >
                          {row.daily ? "日払い" : "月払い"}
                        </span>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-400">
                            {row.daily ? "本日の支給" : "現在の未払い"}
                          </p>
                          <p
                            className={`text-2xl font-black ${
                              row.daily
                                ? "text-emerald-300"
                                : row.unpaid > 0
                                  ? "text-red-300"
                                  : "text-emerald-300"
                            }`}
                          >
                            {formatYen(row.daily ? row.gross : row.unpaid)}
                          </p>
                        </div>
                        {!row.daily && (
                          <span className="text-xs font-bold text-slate-300">
                            支払済 {formatYen(row.paid)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {selectedRow && (
              <main className="space-y-4">
                <section className="rounded-2xl bg-slate-800 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-black">{selectedRow.person.name}</h3>
                      <p className="mt-1 text-slate-400">
                        {formatMinutes(selectedRow.minutes)}勤務
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-black ${
                        selectedRow.daily
                          ? "bg-emerald-900 text-emerald-200"
                          : "bg-blue-900 text-blue-200"
                      }`}
                    >
                      {selectedRow.person.paymentCycle}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="mt-1 text-lg font-black">
                          {formatYen(Number(amount))}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-amber-950/60 p-5">
                    <p className="text-sm font-bold text-amber-300">総支給額</p>
                    <p className="mt-1 text-4xl font-black text-amber-200">
                      {formatYen(selectedRow.gross)}
                    </p>
                  </div>
                </section>

                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="rounded-2xl bg-slate-800 p-5">
                    <h3 className="text-xl font-black">追加バック</h3>
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
                            Math.max(1, Number(event.target.value) || 1),
                          )
                        }
                        className="rounded-xl bg-slate-700 p-3"
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      予約は伝票の予約設定から登録します。送迎500円／人、駐車場500円／回
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        onAddAdjustment(
                          selectedRow.person.id,
                          adjustmentType,
                          adjustmentQuantity,
                        )
                      }
                      className="mt-3 w-full rounded-xl bg-purple-600 p-3 font-bold"
                    >
                      バックを追加
                    </button>

                    <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
                      {selectedAdjustments.length === 0 ? (
                        <p className="rounded-xl bg-slate-700/50 p-3 text-sm text-slate-400">
                          追加バックはありません。
                        </p>
                      ) : (
                        selectedAdjustments.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-700 p-3"
                          >
                            <div>
                              <strong>{item.type}</strong>
                              <span className="ml-2 text-sm text-slate-300">
                                {item.quantity} × {formatYen(item.unitAmount)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => onDeleteAdjustment(item.id)}
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
                    {selectedRow.daily ? (
                      <>
                        <h3 className="text-xl font-black">当日日払い</h3>
                        <div className="mt-4 rounded-2xl border border-emerald-700/60 bg-emerald-950/50 p-5">
                          <p className="text-sm font-bold text-emerald-300">
                            営業終了時に支給する金額
                          </p>
                          <p className="mt-2 text-4xl font-black text-emerald-200">
                            {formatYen(selectedRow.gross)}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-emerald-100/80">
                            日払いスタッフは支払い登録を行いません。この金額を営業終了時に精算してください。
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-black">月払い・支払い登録</h3>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-700 p-4">
                            <p className="text-xs text-slate-400">支払済み</p>
                            <p className="mt-1 text-xl font-black text-emerald-300">
                              {formatYen(selectedRow.paid)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-700 p-4">
                            <p className="text-xs text-slate-400">未払い</p>
                            <p className="mt-1 text-xl font-black text-red-300">
                              {formatYen(selectedRow.unpaid)}
                            </p>
                          </div>
                        </div>

                        <input
                          type="number"
                          min={1}
                          value={paymentAmount || ""}
                          onChange={(event) =>
                            setPaymentAmount(Number(event.target.value))
                          }
                          className="mt-4 w-full rounded-xl bg-slate-700 p-3 text-xl"
                          placeholder="支払額"
                        />
                        <input
                          value={paymentNote}
                          onChange={(event) => setPaymentNote(event.target.value)}
                          className="mt-3 w-full rounded-xl bg-slate-700 p-3"
                          placeholder="メモ"
                        />
                        <button
                          type="button"
                          onClick={registerSelectedPayment}
                          disabled={
                            paymentAmount <= 0 || !Number.isFinite(paymentAmount)
                          }
                          className="mt-3 w-full rounded-xl bg-emerald-600 p-3 font-bold disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          支払いを登録
                        </button>

                        <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
                          {selectedPayments.length === 0 ? (
                            <p className="rounded-xl bg-slate-700/50 p-3 text-sm text-slate-400">
                              支払い履歴はありません。
                            </p>
                          ) : (
                            selectedPayments.map((payment) => (
                              <div
                                key={payment.id}
                                className="flex items-center justify-between gap-3 rounded-xl bg-slate-700 p-3"
                              >
                                <div>
                                  <strong>{formatYen(payment.amount)}</strong>
                                  <p className="text-sm text-slate-300">
                                    {new Date(payment.paidAt).toLocaleString("ja-JP")}
                                    {payment.note ? `・${payment.note}` : ""}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onDeletePayment(payment.id)}
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

        <p className="mt-5 text-xs leading-5 text-slate-400 sm:text-sm">
          シャンパンバックは担当人数で割った後、1人分を100円単位で切り捨てます。日払いスタッフは履歴登録せず、月払いスタッフのみ支払い登録できます。
        </p>
      </div>
    </div>
  );
}