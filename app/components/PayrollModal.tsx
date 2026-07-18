"use client";

import { useMemo, useState } from "react";
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

function getMinutes(
  clockIn: string | null,
  clockOut: string | null,
  currentTime: number,
) {
  if (!clockIn) return 0;
  const start = new Date(clockIn).getTime();
  const end = clockOut
    ? new Date(clockOut).getTime()
    : currentTime;
  return Math.max(0, Math.floor((end - start) / 60000));
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
  const [selectedStaffId, setSelectedStaffId] = useState(
    staff[0]?.id ?? "",
  );
  const [adjustmentType, setAdjustmentType] =
    useState<PayrollAdjustmentType>("送迎");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState("");

  const tickets: Ticket[] = [
    ...closedTickets,
    ...activeTickets,
  ];

  const rows = useMemo(
    () =>
      staff.map((person) => {
        const minutes = getMinutes(
          person.clockIn,
          person.clockOut,
          currentTime,
        );
        const hourly = Math.floor(
          (minutes * person.hourlyWage) / 60,
        );
        let drink = 0;
        let champagne = 0;
        let event = 0;

        for (const ticket of tickets) {
          const companionSeat = ticket.orders.some(
            (order) => order.productId === "companion",
          );
          const drinkTable = companionSeat
            ? companionDrinkBack
            : normalDrinkBack;

          for (const order of ticket.orders) {
            if (
              order.assignedStaffIds?.includes(person.id) &&
              drinkTable[order.productId]
            ) {
              drink +=
                drinkTable[order.productId] * order.quantity;
            }

            const totalChampagneBack =
              champagneBack[order.productId];
            if (
              totalChampagneBack &&
              order.assignedStaffIds?.includes(person.id)
            ) {
              const count = order.assignedStaffIds.length;
              champagne +=
                Math.floor(totalChampagneBack / count / 100) *
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
        const reservationFromTickets = tickets.reduce(
          (total, ticket) => {
            const quantity = (
              ticket.reservationEntries ?? []
            )
              .filter(
                (entry) => entry.staffId === person.id,
              )
              .reduce(
                (subtotal, entry) =>
                  subtotal + entry.quantity,
                0,
              );

            return total + quantity * 300;
          },
          0,
        );

        const legacyReservation = staffAdjustments
          .filter((item) => item.type === "予約")
          .reduce(
            (total, item) =>
              total + item.quantity * item.unitAmount,
            0,
          );

        const reservation =
          reservationFromTickets + legacyReservation;
        const transport = staffAdjustments
          .filter((item) => item.type === "送迎")
          .reduce(
            (total, item) =>
              total + item.quantity * item.unitAmount,
            0,
          );
        const parking = staffAdjustments
          .filter((item) => item.type === "駐車場")
          .reduce(
            (total, item) =>
              total + item.quantity * item.unitAmount,
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
        const paid = payments
          .filter((payment) => payment.staffId === person.id)
          .reduce((total, payment) => total + payment.amount, 0);
        const unpaid = Math.max(0, gross - paid);

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
        };
      }),
    [staff, tickets, currentTime, adjustments, payments],
  );

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

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/90 p-4">
      <div className="mx-auto my-4 w-full max-w-7xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">
              給与・バック・支払管理
            </h2>
            <p className="mt-2 text-slate-400">
              総支給、支払済み、未払い残高を自動集計
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

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1250px] border-separate border-spacing-y-2 text-left">
            <thead className="text-sm text-slate-400">
              <tr>
                <th className="px-3">スタッフ</th>
                <th className="px-3">支払周期</th>
                <th className="px-3">勤務</th>
                <th className="px-3">時給分</th>
                <th className="px-3">ドリンク</th>
                <th className="px-3">シャンパン</th>
                <th className="px-3">イベント</th>
                <th className="px-3">予約</th>
                <th className="px-3">送迎</th>
                <th className="px-3">駐車場</th>
                <th className="px-3">総支給</th>
                <th className="px-3">支払済み</th>
                <th className="px-3">未払い</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.person.id}
                  onClick={() => {
                    setSelectedStaffId(row.person.id);
                    setPaymentAmount(row.unpaid);
                  }}
                  className={`cursor-pointer ${
                    selectedStaffId === row.person.id
                      ? "bg-blue-900"
                      : "bg-slate-800"
                  }`}
                >
                  <td className="rounded-l-xl px-3 py-4">
                    <strong>{row.person.name}</strong>
                    <div className="text-sm text-slate-400">
                      {row.person.role}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    {row.person.paymentCycle}
                  </td>
                  <td className="px-3 py-4">
                    {Math.floor(row.minutes / 60)}時間
                    {row.minutes % 60}分
                  </td>
                  <td className="px-3 py-4">{formatYen(row.hourly)}</td>
                  <td className="px-3 py-4">{formatYen(row.drink)}</td>
                  <td className="px-3 py-4">{formatYen(row.champagne)}</td>
                  <td className="px-3 py-4">{formatYen(row.event)}</td>
                  <td className="px-3 py-4">{formatYen(row.reservation)}</td>
                  <td className="px-3 py-4">{formatYen(row.transport)}</td>
                  <td className="px-3 py-4">{formatYen(row.parking)}</td>
                  <td className="px-3 py-4 font-bold text-amber-300">
                    {formatYen(row.gross)}
                  </td>
                  <td className="px-3 py-4 text-emerald-300">
                    {formatYen(row.paid)}
                  </td>
                  <td className="rounded-r-xl px-3 py-4 text-xl font-black text-red-300">
                    {formatYen(row.unpaid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedRow && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl bg-slate-800 p-5">
              <h3 className="text-2xl font-bold">
                {selectedRow.person.name}：追加バック
              </h3>

              <div className="mt-4 grid grid-cols-[1fr_120px] gap-3">
                <select
                  value={adjustmentType}
                  onChange={(event) =>
                    setAdjustmentType(
                      event.target.value as PayrollAdjustmentType,
                    )
                  }
                  className="rounded-xl bg-slate-700 p-3"
                >
                  <option>送迎</option>
                  <option>駐車場</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={adjustmentQuantity}
                  onChange={(event) =>
                    setAdjustmentQuantity(
                      Math.max(1, Number(event.target.value)),
                    )
                  }
                  className="rounded-xl bg-slate-700 p-3"
                />
              </div>

              <p className="mt-2 text-sm text-slate-400">
                予約は各伝票の「予約設定」から登録します。送迎500円／人、駐車場500円／回
              </p>

              <button
                type="button"
                onClick={() =>
                  onAddAdjustment(
                    selectedStaffId,
                    adjustmentType,
                    adjustmentQuantity,
                  )
                }
                className="mt-3 w-full rounded-xl bg-purple-600 p-3 font-bold"
              >
                バックを追加
              </button>

              <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
                {selectedAdjustments.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-slate-700 p-3"
                  >
                    <div>
                      <strong>{item.type}</strong>
                      <span className="ml-2 text-slate-300">
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
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-slate-800 p-5">
              <h3 className="text-2xl font-bold">
                支払い登録
              </h3>
              <div className="mt-3 rounded-xl bg-slate-700 p-4">
                <p>支払サイクル：{selectedRow.person.paymentCycle}</p>
                <p className="mt-2 text-2xl font-black text-red-300">
                  未払い {formatYen(selectedRow.unpaid)}
                </p>
              </div>

              <input
                type="number"
                min={1}
                value={paymentAmount}
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
                placeholder="メモ（日払い、週払いなど）"
              />
              <button
                type="button"
                onClick={() => {
                  onRegisterPayment(
                    selectedStaffId,
                    paymentAmount,
                    paymentNote.trim(),
                  );
                  setPaymentNote("");
                  setPaymentAmount(0);
                }}
                className="mt-3 w-full rounded-xl bg-emerald-600 p-3 font-bold"
              >
                支払いを登録
              </button>

              <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
                {selectedPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl bg-slate-700 p-3"
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
                ))}
              </div>
            </section>
          </div>
        )}

        <p className="mt-5 text-sm text-slate-400">
          シャンパンは人数割り後、1人分を100円単位で切り捨てます。支払登録後も履歴と未払い残高は自動保存されます。
        </p>
      </div>
    </div>
  );
}
