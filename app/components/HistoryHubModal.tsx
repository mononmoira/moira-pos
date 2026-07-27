"use client";

import { useMemo, useState } from "react";
import type {
  BusinessReport,
  BusinessSession,
  ClosedTicket,
  PayrollAdjustment,
  PayrollPayment,
} from "../page";
import type { Staff } from "./StaffModal";
import DailyReportModal from "./DailyReportModal";
import BusinessHistoryModal from "./BusinessHistoryModal";
import BackupModal from "./BackupModal";

type Tab =
  | "daily"
  | "tickets"
  | "history"
  | "backup";

type Props = {
  reports: BusinessReport[];
  closedTickets: ClosedTicket[];
  activeTicketCount: number;
  staff: Staff[];
  adjustments: PayrollAdjustment[];
  payments: PayrollPayment[];
  currentTime: number;
  businessSession: BusinessSession | null;
  onCreateBackup: () => void;
  onRestoreBackup: (data: unknown) => void;
  onClose: () => void;
};

function formatYen(value: number) {
  return `${value.toLocaleString()}円`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryHubModal({
  reports,
  closedTickets,
  activeTicketCount,
  staff,
  adjustments,
  payments,
  currentTime,
  businessSession,
  onCreateBackup,
  onRestoreBackup,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>("daily");

  const [selectedTicketId, setSelectedTicketId] =
    useState<string | null>(null);

  const sortedClosedTickets = useMemo(
    () =>
      [...closedTickets].sort(
        (a, b) =>
          new Date(b.closedAt).getTime() -
          new Date(a.closedAt).getTime(),
      ),
    [closedTickets],
  );

  const selectedTicket =
    sortedClosedTickets.find(
      (ticket) => ticket.id === selectedTicketId,
    ) ?? null;

  const tabs: Array<{
    id: Tab;
    label: string;
  }> = [
    { id: "daily", label: "本日の日報" },
    { id: "tickets", label: "伝票明細" },
    { id: "history", label: "営業履歴" },
    { id: "backup", label: "バックアップ／復元" },
  ];

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/90 p-3 sm:p-4">
      <div className="mx-auto my-2 w-full max-w-7xl rounded-3xl bg-slate-900 p-4 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black">
              履歴・日報
            </h2>

            <p className="mt-2 text-slate-400">
              日報、伝票明細、営業履歴、バックアップをまとめて管理
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

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-950 p-2 sm:grid-cols-4">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setSelectedTicketId(null);
              }}
              className={`min-h-14 rounded-xl px-3 py-3 text-sm font-bold sm:text-lg ${
                tab === item.id
                  ? "bg-blue-700 text-white"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-slate-950/60 p-3 sm:p-5">
          {tab === "daily" && (
            <DailyReportModal
              embedded
              closedTickets={closedTickets}
              activeTicketCount={activeTicketCount}
              staff={staff}
              adjustments={adjustments}
              payments={payments}
              currentTime={currentTime}
              businessSession={businessSession}
            />
          )}

          {tab === "tickets" && (
            <div>
              {!selectedTicket && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-black">
                      終了済み伝票
                    </h3>

                    <span className="rounded-xl bg-slate-800 px-4 py-2 font-bold">
                      {sortedClosedTickets.length}件
                    </span>
                  </div>

                  {sortedClosedTickets.length === 0 ? (
                    <div className="mt-5 rounded-2xl bg-slate-800 p-6 text-center text-slate-300">
                      終了済みの伝票はありません。
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {sortedClosedTickets.map(
                        (ticket) => {
                          const orderTotal =
                            ticket.orders.reduce(
                              (total, order) =>
                                total +
                                order.price *
                                  order.quantity,
                              0,
                            );

                          return (
                            <button
                              key={ticket.id}
                              type="button"
                              onClick={() =>
                                setSelectedTicketId(
                                  ticket.id,
                                )
                              }
                              className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-left transition hover:border-blue-500 hover:bg-slate-750"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <strong className="text-xl">
                                  {ticket.seatId}卓
                                </strong>

                                <span className="text-sm text-slate-400">
                                  {formatDateTime(
                                    ticket.closedAt,
                                  )}
                                </span>
                              </div>

                              <div className="mt-3 text-slate-300">
                                お客様：
                                {ticket.customerName ||
                                  "未設定"}
                              </div>

                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-slate-400">
                                  注文
                                  {
                                    ticket.orders
                                      .length
                                  }
                                  件
                                </span>

                                <strong className="text-xl text-emerald-300">
                                  {formatYen(
                                    orderTotal,
                                  )}
                                </strong>
                              </div>
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </>
              )}

              {selectedTicket && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-3xl font-black">
                        {selectedTicket.seatId}卓
                        の伝票明細
                      </h3>

                      <p className="mt-2 text-slate-400">
                        終了：
                        {formatDateTime(
                          selectedTicket.closedAt,
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTicketId(null)
                      }
                      className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
                    >
                      伝票一覧へ戻る
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl bg-slate-800 p-4">
                      <h4 className="text-xl font-black">
                        基本情報
                      </h4>

                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">
                            卓番号
                          </span>
                          <strong>
                            {selectedTicket.seatId}卓
                          </strong>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">
                            お客様
                          </span>
                          <strong>
                            {selectedTicket.customerName ||
                              "未設定"}
                          </strong>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">
                            伝票終了
                          </span>
                          <strong>
                            {formatDateTime(
                              selectedTicket.closedAt,
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-800 p-4">
                      <h4 className="text-xl font-black">
                        支払い合計
                      </h4>

                      <div className="mt-4 text-3xl font-black text-emerald-300">
                        {formatYen(
                          selectedTicket.payments.reduce(
                            (total, payment) =>
                              total +
                              (payment.appliedAmount ??
                                payment.amount),
                            0,
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-800 p-4">
                    <h4 className="text-xl font-black">
                      注文明細
                    </h4>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-slate-600 text-left text-slate-400">
                            <th className="p-3">
                              商品
                            </th>
                            <th className="p-3 text-right">
                              単価
                            </th>
                            <th className="p-3 text-right">
                              数量
                            </th>
                            <th className="p-3 text-right">
                              金額
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedTicket.orders.map(
                            (order) => (
                              <tr
                                key={order.id}
                                className="border-b border-slate-700"
                              >
                                <td className="p-3 font-bold">
                                  {order.name}
                                </td>

                                <td className="p-3 text-right">
                                  {formatYen(
                                    order.price,
                                  )}
                                </td>

                                <td className="p-3 text-right">
                                  {order.quantity}
                                </td>

                                <td className="p-3 text-right font-bold">
                                  {formatYen(
                                    order.price *
                                      order.quantity,
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>

                        <tfoot>
                          <tr>
                            <td
                              colSpan={3}
                              className="p-3 text-right text-lg font-black"
                            >
                              注文合計
                            </td>

                            <td className="p-3 text-right text-xl font-black text-emerald-300">
                              {formatYen(
                                selectedTicket.orders.reduce(
                                  (total, order) =>
                                    total +
                                    order.price *
                                      order.quantity,
                                  0,
                                ),
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-800 p-4">
                    <h4 className="text-xl font-black">
                      支払い明細
                    </h4>

                    {selectedTicket.payments.length ===
                    0 ? (
                      <div className="mt-4 text-slate-400">
                        支払い記録はありません。
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {selectedTicket.payments.map(
                          (payment, index) => (
                            <div
                              key={payment.id}
                              className="rounded-2xl bg-slate-900 p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <strong className="text-lg">
                                  支払い
                                  {index + 1}
                                </strong>

                                <span className="rounded-lg bg-blue-900 px-3 py-1 font-bold text-blue-100">
                                  {payment.method}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="flex justify-between gap-3">
                                  <span className="text-slate-400">
                                    支払額
                                  </span>
                                  <strong>
                                    {formatYen(
                                      payment.appliedAmount ??
                                        payment.amount,
                                    )}
                                  </strong>
                                </div>

                                {payment.surchargeAmount !==
                                  undefined &&
                                  payment.surchargeAmount >
                                    0 && (
                                    <div className="flex justify-between gap-3">
                                      <span className="text-slate-400">
                                        キャッシュレス加算
                                      </span>
                                      <strong>
                                        {formatYen(
                                          payment.surchargeAmount,
                                        )}
                                      </strong>
                                    </div>
                                  )}

                                {payment.discountAmount !==
                                  undefined &&
                                  payment.discountAmount >
                                    0 && (
                                    <div className="flex justify-between gap-3">
                                      <span className="text-slate-400">
                                        サービス割引
                                      </span>
                                      <strong className="text-amber-300">
                                        −
                                        {formatYen(
                                          payment.discountAmount,
                                        )}
                                      </strong>
                                    </div>
                                  )}

                                {payment.receivedAmount !==
                                  undefined && (
                                  <div className="flex justify-between gap-3">
                                    <span className="text-slate-400">
                                      お預かり
                                    </span>
                                    <strong>
                                      {formatYen(
                                        payment.receivedAmount,
                                      )}
                                    </strong>
                                  </div>
                                )}

                                {payment.changeAmount !==
                                  undefined && (
                                  <div className="flex justify-between gap-3">
                                    <span className="text-slate-400">
                                      おつり
                                    </span>
                                    <strong className="text-emerald-300">
                                      {formatYen(
                                        payment.changeAmount,
                                      )}
                                    </strong>
                                  </div>
                                )}

                                <div className="flex justify-between gap-3">
                                  <span className="text-slate-400">
                                    登録日時
                                  </span>
                                  <strong>
                                    {formatDateTime(
                                      payment.paidAt,
                                    )}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "history" && (
            <BusinessHistoryModal
              embedded
              reports={reports}
            />
          )}

          {tab === "backup" && (
            <BackupModal
              embedded
              onCreateBackup={onCreateBackup}
              onRestoreBackup={onRestoreBackup}
            />
          )}
        </div>
      </div>
    </div>
  );
}
