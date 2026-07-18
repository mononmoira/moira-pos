"use client";

import type { AuditLog } from "../page";

type Props = {
  logs: AuditLog[];
  onClose: () => void;
};

export default function AuditLogModal({
  logs,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/90 p-4">
      <div className="mx-auto my-4 w-full max-w-5xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex justify-between">
          <div>
            <h2 className="text-3xl font-black">
              修正ログ
            </h2>
            <p className="mt-2 text-slate-400">
              誰が・いつ・何を変更したか
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-5 py-3"
          >
            閉じる
          </button>
        </div>

        <div className="mt-6 max-h-[75vh] space-y-2 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="rounded-xl bg-slate-800 p-6 text-center text-slate-400">
              ログはありません。
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl bg-slate-800 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>
                    {log.userName}／{log.userRole}
                  </strong>
                  <span className="text-sm text-slate-400">
                    {new Date(
                      log.createdAt,
                    ).toLocaleString("ja-JP")}
                  </span>
                </div>
                <p className="mt-2">
                  {log.action}｜{log.target}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {log.detail}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
