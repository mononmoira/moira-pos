"use client";

import { useState } from "react";
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

type Tab = "daily" | "history" | "backup";

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

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "daily", label: "本日の日報" },
    { id: "history", label: "営業履歴" },
    { id: "backup", label: "バックアップ／復元" },
  ];

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/90 p-3 sm:p-4">
      <div className="mx-auto my-2 w-full max-w-7xl rounded-3xl bg-slate-900 p-4 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black">履歴・日報</h2>
            <p className="mt-2 text-slate-400">
              日報、確定済みの営業履歴、バックアップをまとめて管理
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
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
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
