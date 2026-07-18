"use client";

import { useRef, useState } from "react";

type Props = {
  onCreateBackup: () => void;
  onRestoreBackup: (data: unknown) => void;
  onClose?: () => void;
  embedded?: boolean;
};

export default function BackupModal({
  onCreateBackup,
  onRestoreBackup,
  onClose,
  embedded = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] =
    useState("");
  const [pendingData, setPendingData] =
    useState<unknown>(null);
  const [errorMessage, setErrorMessage] =
    useState("");

  async function readBackupFile(
    file: File | undefined,
  ) {
    setErrorMessage("");
    setPendingData(null);

    if (!file) {
      setSelectedFileName("");
      return;
    }

    setSelectedFileName(file.name);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      setPendingData(parsed);
    } catch {
      setErrorMessage(
        "ファイルを読み込めませんでした。JSON形式のバックアップを選んでください。",
      );
    }
  }

  function restore() {
    if (!pendingData) {
      setErrorMessage(
        "復元するバックアップファイルを選択してください。",
      );
      return;
    }

    const confirmed = window.confirm(
      "現在のデータをバックアップ内容で置き換えます。復元前に現在のバックアップを作成することをおすすめします。続けますか？",
    );

    if (!confirmed) {
      return;
    }

    try {
      onRestoreBackup(pendingData);
      alert("バックアップを復元しました。");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "復元に失敗しました。",
      );
    }
  }

  return (
    <div
      className={
        embedded
          ? ""
          : "fixed inset-0 z-[110] overflow-y-auto bg-black/90 p-4"
      }
    >
      <div
        className={
          embedded
            ? "mx-auto w-full max-w-3xl text-white"
            : "mx-auto my-4 w-full max-w-2xl rounded-3xl bg-slate-900 p-6 text-white"
        }
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">
              バックアップ・復元
            </h2>
            <p className="mt-2 text-slate-400">
              伝票・顧客・スタッフ・給与・日報・売掛をまとめて保存します
            </p>
          </div>

          {!embedded && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
            >
              閉じる
            </button>
          )}
        </div>

        <section className="mt-6 rounded-2xl bg-slate-800 p-5">
          <h3 className="text-2xl font-bold">
            1．バックアップを作成
          </h3>

          <p className="mt-2 text-slate-300">
            現在の全データをJSONファイルとしてダウンロードします。USBメモリや別のPCにもコピーできます。
          </p>

          <button
            type="button"
            onClick={onCreateBackup}
            className="mt-4 min-h-14 w-full rounded-xl bg-sky-700 p-4 text-xl font-bold"
          >
            バックアップファイルを保存
          </button>
        </section>

        <section className="mt-5 rounded-2xl bg-slate-800 p-5">
          <h3 className="text-2xl font-bold">
            2．バックアップから復元
          </h3>

          <p className="mt-2 text-slate-300">
            以前保存したMoira POSのバックアップファイルを選択します。現在のデータは置き換わります。
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) =>
              readBackupFile(
                event.target.files?.[0],
              )
            }
            className="hidden"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 min-h-14 w-full rounded-xl bg-slate-700 p-4 text-lg font-bold"
          >
            復元ファイルを選択
          </button>

          <div className="mt-3 rounded-xl bg-slate-700 p-4">
            <p className="text-sm text-slate-400">
              選択中のファイル
            </p>
            <p className="mt-1 break-all font-bold">
              {selectedFileName || "未選択"}
            </p>
          </div>

          {errorMessage && (
            <p className="mt-3 rounded-xl bg-red-950 p-4 text-red-200">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={restore}
            disabled={!pendingData}
            className="mt-4 min-h-14 w-full rounded-xl bg-red-700 p-4 text-xl font-bold disabled:bg-slate-600 disabled:text-slate-400"
          >
            このバックアップから復元
          </button>
        </section>

        <div className="mt-5 rounded-2xl bg-amber-950 p-4 text-amber-100">
          <p className="font-bold">おすすめ運用</p>
          <p className="mt-2 text-sm">
            営業終了後に毎日1回バックアップを作成し、週に1回はUSBメモリなどPC以外の場所へコピーしてください。
          </p>
        </div>
      </div>
    </div>
  );
}
