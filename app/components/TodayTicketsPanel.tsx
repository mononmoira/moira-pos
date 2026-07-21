"use client";

import { useMemo, useState } from "react";

import HistoryPanel from "./history/HistoryPanel";
import TableGrid, {
  type Seat,
} from "./TableGrid";

import type {
  ClosedTicket,
  Ticket,
} from "../page";

type TabType =
  | "active"
  | "closed"
  | "history";

type Props = {
  seats: Seat[];
  tickets: Ticket[];
  closedTickets: ClosedTicket[];
  currentTime: number;
  onSelectActiveTicket: (ticketId: string) => void;
};

function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 午前8時より前は、前日の営業日として扱います。
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

export default function TodayTicketsPanel({
  seats,
  tickets,
  closedTickets,
  currentTime,
  onSelectActiveTicket,
}: Props) {
  const [selectedTab, setSelectedTab] =
    useState<TabType>("active");

  const [
    selectedClosedTicketId,
    setSelectedClosedTicketId,
  ] = useState<string | null>(null);

  const todayBusinessDate = getBusinessDate(
    new Date(currentTime),
  );

  const todayClosedTickets = useMemo(() => {
    return closedTickets
      .filter(
        (ticket) =>
          getBusinessDate(new Date(ticket.closedAt)) ===
          todayBusinessDate,
      )
      .sort(
        (a, b) =>
          new Date(b.closedAt).getTime() -
          new Date(a.closedAt).getTime(),
      );
  }, [
    closedTickets,
    todayBusinessDate,
  ]);

  const todaySales = useMemo(() => {
    return todayClosedTickets.reduce(
      (total, ticket) => total + ticket.total,
      0,
    );
  }, [todayClosedTickets]);

  const selectedClosedTicket =
    todayClosedTickets.find(
      (ticket) =>
        ticket.id === selectedClosedTicketId,
    ) ?? null;

  function getSeatName(seatId: number) {
    return (
      seats.find((seat) => seat.id === seatId)?.name ??
      `席${seatId}`
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {/* タブ */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setSelectedTab("active")}
          className={`min-h-14 rounded-xl px-3 py-2 font-black ${
            selectedTab === "active"
              ? "bg-blue-600 text-white"
              : "bg-slate-800 text-slate-300"
          }`}
        >
          営業中
          <span className="ml-2 rounded-full bg-black/30 px-2 py-1 text-sm">
            {tickets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab("closed")}
          className={`min-h-14 rounded-xl px-3 py-2 font-black ${
            selectedTab === "closed"
              ? "bg-emerald-600 text-white"
              : "bg-slate-800 text-slate-300"
          }`}
        >
          会計済み
          <span className="ml-2 rounded-full bg-black/30 px-2 py-1 text-sm">
            {todayClosedTickets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab("history")}
          className={`min-h-14 rounded-xl px-3 py-2 font-black ${
            selectedTab === "history"
              ? "bg-violet-600 text-white"
              : "bg-slate-800 text-slate-300"
          }`}
        >
          履歴
        </button>
      </div>

      {/* 営業中 */}
      {selectedTab === "active" && (
        <TableGrid
          seats={seats}
          tickets={tickets}
          currentTime={currentTime}
          onSelectTicket={onSelectActiveTicket}
        />
      )}

      {/* 本日の会計済み */}
      {selectedTab === "closed" && (
        <div className="flex min-h-0 flex-col gap-3">
          {/* 売上表示 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/50 p-4">
              <p className="text-sm font-bold text-emerald-300">
                本日の会計済み
              </p>

              <p className="mt-1 text-3xl font-black text-white">
                {todayClosedTickets.length}
                <span className="ml-1 text-base">
                  組
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-amber-600 bg-amber-950/40 p-4">
              <p className="text-sm font-bold text-amber-300">
                本日売上
              </p>

              <p className="mt-1 text-3xl font-black text-white">
                {formatYen(todaySales)}
              </p>
            </div>
          </div>

          {todayClosedTickets.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/60 p-6 text-center">
              <div>
                <p className="text-xl font-black text-white">
                  本日の会計済み伝票はありません
                </p>

                <p className="mt-2 text-slate-400">
                  会計終了した伝票がここに表示されます
                </p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
              {/* 伝票一覧 */}
              <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
                {todayClosedTickets.map((ticket) => {
                  const isSelected =
                    selectedClosedTicketId === ticket.id;

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() =>
                        setSelectedClosedTicketId(
                          isSelected
                            ? null
                            : ticket.id,
                        )
                      }
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-900/60"
                          : "border-slate-700 bg-slate-900 hover:border-emerald-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-black text-white">
                            {getSeatName(ticket.seatId)}
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-300">
                            {ticket.customerName ||
                              "お客様未登録"}
                          </p>
                        </div>

                        <p className="text-xl font-black text-emerald-300">
                          {formatYen(ticket.total)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                        <span>
                          {ticket.guests}名
                        </span>

                        <span>
                          {ticket.courseName}
                        </span>

                        <span>
                          会計 {formatTime(ticket.closedAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 選択した伝票の詳細 */}
              <div className="min-h-0">
                {selectedClosedTicket ? (
                  <div className="max-h-[65vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-black text-white">
                          {getSeatName(
                            selectedClosedTicket.seatId,
                          )}
                        </p>

                        <p className="mt-1 font-bold text-slate-300">
                          {selectedClosedTicket.customerName ||
                            "お客様未登録"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedClosedTicketId(null)
                        }
                        className="rounded-lg bg-slate-700 px-3 py-2 font-bold text-white"
                      >
                        閉じる
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-slate-800 p-3">
                        <p className="text-slate-400">
                          人数
                        </p>
                        <p className="mt-1 font-black text-white">
                          {selectedClosedTicket.guests}名
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-800 p-3">
                        <p className="text-slate-400">
                          会計時刻
                        </p>
                        <p className="mt-1 font-black text-white">
                          {formatTime(
                            selectedClosedTicket.closedAt,
                          )}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-xl bg-slate-800 p-3">
                        <p className="text-slate-400">
                          コース
                        </p>
                        <p className="mt-1 font-black text-white">
                          {selectedClosedTicket.courseName}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="font-black text-white">
                        注文内容
                      </p>

                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between rounded-xl bg-slate-800 p-3">
                          <span className="text-slate-200">
                            {selectedClosedTicket.courseName}
                          </span>

                          <span className="font-black text-white">
                            {formatYen(
                              selectedClosedTicket.courseTotal,
                            )}
                          </span>
                        </div>

                        {selectedClosedTicket.orders.map(
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
                                    {formatYen(order.price)}
                                    × {order.quantity}
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
                        {selectedClosedTicket.payments.length ===
                        0 ? (
                          <div className="rounded-xl bg-slate-800 p-3 text-slate-400">
                            支払い情報なし
                          </div>
                        ) : (
                          selectedClosedTicket.payments.map(
                            (payment) => (
                              <div
                                key={payment.id}
                                className="flex justify-between rounded-xl bg-slate-800 p-3"
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
                          selectedClosedTicket.total,
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
                        左の会計済み伝票を押すと
                        <br />
                        詳細が表示されます
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 履歴 */}
      {selectedTab === "history" && (
  <HistoryPanel
    seats={seats}
    closedTickets={closedTickets}
    currentTime={currentTime}
  />
)}
    </div>
  );
}