"use client";

import { useMemo, useState } from "react";

import type { ClosedTicket } from "../../page";
import type { Seat } from "../TableGrid";

import HistoryDayCard from "./HistoryDayCard";
import HistoryTicketCard from "./HistoryTicketCard";

type Props = {
  seats: Seat[];
  closedTickets: ClosedTicket[];
  currentTime: number;
};

type HistoryDay = {
  businessDate: string;
  tickets: ClosedTicket[];
  sales: number;
};

function formatYen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 午前8時より前は、前日の営業日として扱う
 */
function getBusinessDate(value: Date) {
  const date = new Date(value);

  if (date.getHours() < 8) {
    date.setDate(date.getDate() - 1);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatBusinessDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(year, month - 1, day);

  const weekday = new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
  }).format(date);

  return `${year}/${String(month).padStart(
    2,
    "0",
  )}/${String(day).padStart(2, "0")}（${weekday}）`;
}

export default function HistoryPanel({
  seats,
  closedTickets,
  currentTime,
}: Props) {
  const historyDays = useMemo<HistoryDay[]>(() => {
    const grouped = new Map<string, ClosedTicket[]>();

    closedTickets.forEach((ticket) => {
      const businessDate = getBusinessDate(
        new Date(ticket.closedAt),
      );

      const tickets =
        grouped.get(businessDate) ?? [];

      tickets.push(ticket);
      grouped.set(businessDate, tickets);
    });

    return Array.from(grouped.entries())
      .map(([businessDate, tickets]) => {
        const sortedTickets = [...tickets].sort(
          (a, b) =>
            new Date(b.closedAt).getTime() -
            new Date(a.closedAt).getTime(),
        );

        return {
          businessDate,
          tickets: sortedTickets,
          sales: sortedTickets.reduce(
            (total, ticket) =>
              total + ticket.total,
            0,
          ),
        };
      })
      .sort((a, b) =>
        b.businessDate.localeCompare(a.businessDate),
      );
  }, [closedTickets]);

  const currentBusinessDate = getBusinessDate(
    new Date(currentTime),
  );

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const [
    selectedTicketId,
    setSelectedTicketId,
  ] = useState<string | null>(null);

  const activeDate =
    selectedDate ??
    historyDays[0]?.businessDate ??
    currentBusinessDate;

  const selectedDay =
    historyDays.find(
      (day) => day.businessDate === activeDate,
    ) ?? null;

  const selectedTicket =
    selectedDay?.tickets.find(
      (ticket) =>
        ticket.id === selectedTicketId,
    ) ?? null;

  function getSeatName(seatId: number) {
    return (
      seats.find((seat) => seat.id === seatId)
        ?.name ?? `席${seatId}`
    );
  }

  function handleSelectDay(
    businessDate: string,
  ) {
    setSelectedDate(businessDate);
    setSelectedTicketId(null);
  }

  if (historyDays.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border-2 border-dashed border-violet-800 bg-violet-950/30 p-6 text-center">
        <div>
          <p className="text-xl font-black text-violet-200">
            会計履歴はありません
          </p>

          <p className="mt-2 text-slate-400">
            会計済み伝票が保存されると、
            営業日ごとに表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 gap-3 xl:grid-cols-[280px_minmax(300px,0.9fr)_minmax(340px,1fr)]">
      {/* 営業日一覧 */}
      <section className="min-h-0 rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
        <div className="mb-3">
          <p className="text-xl font-black text-white">
            営業日
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {historyDays.length}日分
          </p>
        </div>

        <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
          {historyDays.map((day) => (
            <HistoryDayCard
              key={day.businessDate}
              date={formatBusinessDate(
                day.businessDate,
              )}
              sales={day.sales}
              guests={day.tickets.length}
              selected={
                day.businessDate === activeDate
              }
              onClick={() =>
                handleSelectDay(day.businessDate)
              }
            />
          ))}
        </div>
      </section>

      {/* 選択日の伝票一覧 */}
      <section className="min-h-0 rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
        {selectedDay ? (
          <>
            <div className="mb-3 rounded-xl bg-violet-950/60 p-3">
              <p className="font-black text-violet-200">
                {formatBusinessDate(
                  selectedDay.businessDate,
                )}
              </p>

              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-sm text-slate-400">
                  会計 {selectedDay.tickets.length}組
                </p>

                <p className="text-2xl font-black text-emerald-300">
                  {formatYen(selectedDay.sales)}
                </p>
              </div>
            </div>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {selectedDay.tickets.map(
                (ticket) => (
                  <HistoryTicketCard
                    key={ticket.id}
                    seatName={getSeatName(
                      ticket.seatId,
                    )}
                    customerName={
                      ticket.customerName ?? ""
                    }
                    total={ticket.total}
                    closedAt={ticket.closedAt}
                    selected={
                      selectedTicketId ===
                      ticket.id
                    }
                    onClick={() =>
                      setSelectedTicketId(
                        selectedTicketId ===
                          ticket.id
                          ? null
                          : ticket.id,
                      )
                    }
                  />
                ),
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-72 items-center justify-center text-slate-400">
            営業日を選択してください
          </div>
        )}
      </section>

      {/* 伝票詳細 */}
      <section className="min-h-0">
        {selectedTicket ? (
          <div className="max-h-[68vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-black text-white">
                  {getSeatName(
                    selectedTicket.seatId,
                  )}
                </p>

                <p className="mt-1 font-bold text-slate-300">
                  {selectedTicket.customerName ||
                    "お客様未登録"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTicketId(null)
                }
                className="rounded-lg bg-slate-700 px-3 py-2 font-bold text-white"
              >
                閉じる
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="text-sm text-slate-400">
                  人数
                </p>

                <p className="mt-1 font-black text-white">
                  {selectedTicket.guests}名
                </p>
              </div>

              <div className="rounded-xl bg-slate-800 p-3">
                <p className="text-sm text-slate-400">
                  会計時刻
                </p>

                <p className="mt-1 font-black text-white">
                  {formatTime(
                    selectedTicket.closedAt,
                  )}
                </p>
              </div>

              <div className="col-span-2 rounded-xl bg-slate-800 p-3">
                <p className="text-sm text-slate-400">
                  コース
                </p>

                <p className="mt-1 font-black text-white">
                  {selectedTicket.courseName}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="font-black text-white">
                注文内容
              </p>

              <div className="mt-2 space-y-2">
                <div className="flex justify-between gap-3 rounded-xl bg-slate-800 p-3">
                  <span className="text-slate-200">
                    {selectedTicket.courseName}
                  </span>

                  <span className="font-black text-white">
                    {formatYen(
                      selectedTicket.courseTotal,
                    )}
                  </span>
                </div>

                {selectedTicket.orders.map(
                  (order) => (
                    <div
                      key={order.id}
                      className="flex justify-between gap-3 rounded-xl bg-slate-800 p-3"
                    >
                      <div>
                        <p className="text-slate-200">
                          {order.name}
                        </p>

                        {order.quantity > 1 && (
                          <p className="mt-1 text-xs text-slate-400">
                            {formatYen(order.price)} ×{" "}
                            {order.quantity}
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 font-black text-white">
                        {formatYen(
                          order.price *
                            order.quantity,
                        )}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="mt-5">
              <p className="font-black text-white">
                支払い
              </p>

              <div className="mt-2 space-y-2">
                {selectedTicket.payments.length ===
                0 ? (
                  <div className="rounded-xl bg-slate-800 p-3 text-slate-400">
                    支払い情報なし
                  </div>
                ) : (
                  selectedTicket.payments.map(
                    (payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between gap-3 rounded-xl bg-slate-800 p-3"
                      >
                        <span className="text-slate-200">
                          {payment.method}
                        </span>

                        <span className="font-black text-white">
                          {formatYen(
                            payment.amount,
                          )}
                        </span>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-emerald-700 p-4">
              <span className="text-lg font-black text-white">
                合計
              </span>

              <span className="text-3xl font-black text-white">
                {formatYen(
                  selectedTicket.total,
                )}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/60 p-6 text-center">
            <div>
              <p className="text-lg font-black text-white">
                伝票を選択してください
              </p>

              <p className="mt-2 text-sm text-slate-400">
                会計済み伝票を押すと
                <br />
                詳細が表示されます
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}