"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const details = `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}${
    error.digest ? `\nDigest: ${error.digest}` : ""
  }`;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-950 p-4 text-white">
        <main className="mx-auto max-w-4xl rounded-3xl border-2 border-red-500 bg-red-950 p-6">
          <h1 className="text-2xl font-black">Moira POS 初期化エラー</h1>
          <p className="mt-3">画面の初期化中にエラーが発生しました。</p>
          <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/60 p-4 text-sm">
            {details}
          </pre>
          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-xl bg-red-600 px-6 py-3 text-lg font-bold"
          >
            再試行
          </button>
        </main>
      </body>
    </html>
  );
}