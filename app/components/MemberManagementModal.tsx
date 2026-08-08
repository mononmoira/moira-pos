"use client";

import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { memberDb } from "../lib/memberFirebase";

type Member = {
  uid: string;
  memberNo?: string;
  name?: string;
  rank?: string;
  point?: number;
  birthday?: string;
  visitCount?: number;
  lastVisitAt?: unknown;
};

type Props = {
  onClose: () => void;
};

function formatDate(value: unknown) {
  if (!value) return "なし";

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate ===
      "function"
  ) {
    return (
      value as { toDate: () => Date }
    )
      .toDate()
      .toLocaleDateString("ja-JP");
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("ja-JP");
}


type ScannerInstance = {
  stop: () => Promise<void>;
  clear: () => void;
  scanFile: (
    imageFile: File,
    showImage?: boolean,
  ) => Promise<string>;
};

function extractMemberUid(decodedText: string) {
  const raw = decodedText.trim();

  if (!raw) return "";

  // 現在の会員証はUIDそのもの。
  // 将来、JSON形式やURL形式に変更しても読めるようにしておく。
  try {
    const parsed = JSON.parse(raw) as {
      uid?: unknown;
    };

    if (typeof parsed?.uid === "string") {
      return parsed.uid.trim();
    }
  } catch {
    // JSONでなくても問題なし
  }

  try {
    const url = new URL(raw);
    const uidFromQuery =
      url.searchParams.get("uid");

    if (uidFromQuery) {
      return uidFromQuery.trim();
    }
  } catch {
    // URLでなくても問題なし
  }

  return raw;
}

export default function MemberManagementModal({
  onClose,
}: Props) {
  const [member, setMember] =
    useState<Member | null>(null);

  const [loading, setLoading] = useState(false);

  const [scannerActive, setScannerActive] =
    useState(false);


  const [customPoint, setCustomPoint] =
    useState(100);

  const [checkoutAmount, setCheckoutAmount] =
    useState(0);

  const scannerRef =
    useRef<ScannerInstance | null>(null);

  // iPadでは同じQRを連続フレームで複数回検出することがあるため、
  // 1回のスキャン処理を1度だけ実行する。
  const scanHandledRef = useRef(false);

  const qrImageInputRef =
    useRef<HTMLInputElement | null>(null);

  const [scannerMessage, setScannerMessage] =
    useState("");

  const [imageScanBusy, setImageScanBusy] =
    useState(false);


  useEffect(() => {
    // 会員管理を開いた時点でQRライブラリを先読みして、
    // 「QRを読み取る」を押した後の待ち時間を短くする。
    void import("html5-qrcode").catch(() => {
      // 起動時の先読み失敗は、実際の読取開始時に再試行する。
    });

    return () => {
      const scanner = scannerRef.current;

      if (!scanner) return;

      void scanner.stop().catch(() => {
        // すでに停止済みなら何もしない
      });

      scannerRef.current = null;
    };
  }, []);

  async function loadMember(uid: string) {
    const trimmedUid = uid.trim();

    if (!trimmedUid) {
      alert("QRコードから会員情報を読み取れませんでした。もう一度お試しください。");
      return;
    }

    setLoading(true);

    try {
      const memberRef = doc(
        memberDb,
        "users",
        trimmedUid,
      );

      const snapshot =
        await getDoc(memberRef);

      if (!snapshot.exists()) {
        alert("会員情報が見つかりませんでした。会員証を確認してください。");
        return;
      }

      const data = snapshot.data();

      setMember({
        uid: trimmedUid,
        memberNo: data.memberNo,
        name: data.name,
        rank: data.rank ?? "Bronze",
        point:
          typeof data.point === "number"
            ? data.point
            : 0,
        birthday: data.birthday,
        visitCount:
          typeof data.visitCount === "number"
            ? data.visitCount
            : 0,
        lastVisitAt:
          data.lastVisitAt ??
          data.lastVisit ??
          null,
      });

      setScannerMessage("会員情報を取得しました。");
    } catch (error) {
      console.error("会員情報の取得に失敗しました。", error);

      alert(
        "会員情報を取得できませんでした。通信状況を確認して、もう一度お試しください。",
      );
    } finally {
      setLoading(false);
    }
  }

  async function startScanner() {
    if (scannerActive || imageScanBusy) {
      return;
    }

    scanHandledRef.current = false;
    setScannerActive(true);
    setScannerMessage(
      "背面カメラを準備しています...",
    );

    try {
      const {
        Html5Qrcode,
        Html5QrcodeSupportedFormats,
      } = await import("html5-qrcode");

      // 前回のスキャナーが残っていた場合は先に片付ける
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}

        try {
          scannerRef.current.clear();
        } catch {}

        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode(
        "member-qr-reader",
        {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        },
      ) as unknown as ScannerInstance;

      scannerRef.current = scanner;

      // iPadではカメラ一覧の列挙が数秒かかることがあるため、
      // 一覧取得はせず背面カメラを直接指定して起動する。
      const camera = {
        facingMode: "environment" as const,
      };

      await (
        scanner as unknown as {
          start: (
            cameraIdOrConfig:
              | string
              | { facingMode: string },
            config: {
              fps: number;
              qrbox: (
                viewfinderWidth: number,
                viewfinderHeight: number,
              ) => {
                width: number;
                height: number;
              };
            },
            onSuccess: (
              decodedText: string,
            ) => void,
            onFailure?: (
              errorMessage: string,
            ) => void,
          ) => Promise<void>;
        }
      ).start(
        camera,
        {
          fps: 12,
          qrbox: (
            viewfinderWidth,
            viewfinderHeight,
          ) => {
            const shorterSide = Math.min(
              viewfinderWidth,
              viewfinderHeight,
            );

            // iPadでは260px固定より少し広い方が
            // 画面上の会員QRを捉えやすい。
            const size = Math.max(
              220,
              Math.min(
                360,
                Math.floor(shorterSide * 0.72),
              ),
            );

            return {
              width: size,
              height: size,
            };
          },
        },
        async (decodedText) => {
          // 同じQRを連続検出しても1回だけ処理する
          if (scanHandledRef.current) return;
          scanHandledRef.current = true;

          const uid = extractMemberUid(decodedText);

          setScannerMessage(
            "QRを読み取りました。会員情報を確認しています...",
          );

          // 重要: iPadでは scanner.stop() が数秒待たされることがある。
          // 会員検索を止め処理の完了待ちにしない。
          setScannerActive(false);
          scannerRef.current = null;

          void scanner
            .stop()
            .then(() => {
              try {
                scanner.clear();
              } catch {}
            })
            .catch(() => {
              // すでに停止済みなら問題なし
            });

          // QR読取直後にFirestore検索を開始する
          await loadMember(uid);
        },
        () => {
          // フレームごとの読取失敗は正常なので何もしない
        },
      );

      setScannerMessage(
        "QRコードを枠の中央に入れて、少し離してかざしてください。",
      );
    } catch (error) {
      console.error(error);

      const activeScanner =
        scannerRef.current;

      if (activeScanner) {
        try {
          await activeScanner.stop();
        } catch {}

        try {
          activeScanner.clear();
        } catch {}
      }

      scannerRef.current = null;
      setScannerActive(false);
      setScannerMessage(
        "カメラを起動できませんでした。",
      );

      alert(
        "カメラを起動できませんでした。iPadのカメラ許可を確認するか、「QR画像から読み取る」をお試しください。",
      );
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();

        try {
          scannerRef.current.clear();
        } catch {}
      }
    } catch {}

    scannerRef.current = null;
    setScannerActive(false);
    setScannerMessage("");
  }

  async function scanQrImage(
    file: File,
  ) {
    if (!file) return;

    await stopScanner();

    setImageScanBusy(true);
    setScannerMessage(
      "QR画像を読み取っています...",
    );

    try {
      const {
        Html5Qrcode,
        Html5QrcodeSupportedFormats,
      } = await import("html5-qrcode");

      const scanner = new Html5Qrcode(
        "member-qr-reader",
        {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        },
      ) as unknown as ScannerInstance;

      scannerRef.current = scanner;

      const decodedText =
        await scanner.scanFile(file, true);

      const uid =
        extractMemberUid(decodedText);


      try {
        scanner.clear();
      } catch {}

      scannerRef.current = null;
      setScannerMessage(
        "QRを読み取りました。会員情報を確認しています...",
      );

      await loadMember(uid);
    } catch (error) {
      console.error(error);

      try {
        scannerRef.current?.clear();
      } catch {}

      scannerRef.current = null;
      setScannerMessage(
        "画像からQRコードを読み取れませんでした。",
      );

      alert(
        "画像からQRコードを読み取れませんでした。QR全体が写っている画像を選んでください。",
      );
    } finally {
      setImageScanBusy(false);

      if (qrImageInputRef.current) {
        qrImageInputRef.current.value = "";
      }
    }
  }

  async function addPoint(
    amount: number,
    detail: string,
  ) {
    if (!member || amount <= 0) {
      return;
    }

    setLoading(true);

    try {
      const memberRef = doc(
        memberDb,
        "users",
        member.uid,
      );

      await updateDoc(memberRef, {
        point: increment(amount),
      });

      await addDoc(
        collection(memberDb, "pointLogs"),
        {
          uid: member.uid,
          point: amount,
          detail,
          createdAt: serverTimestamp(),
        },
      );

      setMember((current) =>
        current
          ? {
              ...current,
              point:
                (current.point ?? 0) +
                amount,
            }
          : current,
      );
    } catch (error) {
      console.error(error);

      alert(
        "ポイント付与に失敗しました。",
      );
    } finally {
      setLoading(false);
    }
  }

  async function addVisitAndCheckoutPoint() {
    if (!member) return;

    const salesPoint = Math.floor(
      checkoutAmount / 100,
    );

    const totalPoint =
      30 + salesPoint;

    const confirmed =
      window.confirm(
        `来店ポイント 30pt\n` +
          `会計ポイント ${salesPoint}pt\n\n` +
          `合計 ${totalPoint}pt を付与しますか？`,
      );

    if (!confirmed) return;

    setLoading(true);

    try {
      const memberRef = doc(
        memberDb,
        "users",
        member.uid,
      );

      await updateDoc(memberRef, {
        point: increment(totalPoint),
        visitCount: increment(1),
        lastVisitAt: serverTimestamp(),
      });

      await addDoc(
        collection(memberDb, "pointLogs"),
        {
          uid: member.uid,
          point: 30,
          detail: "来店ポイント",
          createdAt: serverTimestamp(),
        },
      );

      if (salesPoint > 0) {
        await addDoc(
          collection(
            memberDb,
            "pointLogs",
          ),
          {
            uid: member.uid,
            point: salesPoint,
            detail: `会計ポイント ${checkoutAmount.toLocaleString()}円`,
            createdAt:
              serverTimestamp(),
          },
        );
      }

      await addDoc(
        collection(
          memberDb,
          "visitHistory",
        ),
        {
          uid: member.uid,
          amount: checkoutAmount,
          point: totalPoint,
          visitedAt:
            serverTimestamp(),
        },
      );

      setMember((current) =>
        current
          ? {
              ...current,
              point:
                (current.point ?? 0) +
                totalPoint,
              visitCount:
                (current.visitCount ?? 0) +
                1,
              lastVisitAt:
                new Date().toISOString(),
            }
          : current,
      );

      alert(
        `${totalPoint}ptを付与しました。`,
      );
    } catch (error) {
      console.error(error);

      alert(
        "来店・会計ポイントの登録に失敗しました。",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[160] overflow-y-auto bg-black/90 p-3 sm:p-5">
      <div className="mx-auto w-full max-w-4xl rounded-3xl bg-slate-900 p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black">
              会員管理
            </h2>

            <p className="mt-1 text-slate-400">
              Moira会員アプリ連携
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              await stopScanner();
              onClose();
            }}
            className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
          >
            閉じる
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={startScanner}
            disabled={
              scannerActive || imageScanBusy
            }
            className="min-h-16 rounded-2xl bg-blue-700 p-4 text-xl font-black disabled:bg-slate-700"
          >
            📷 会員QRを読み取る
          </button>

          {scannerActive ? (
            <button
              type="button"
              onClick={stopScanner}
              className="min-h-16 rounded-2xl bg-red-800 p-4 text-xl font-black"
            >
              カメラ停止
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                qrImageInputRef.current?.click()
              }
              disabled={imageScanBusy}
              className="min-h-16 rounded-2xl bg-violet-700 p-4 text-xl font-black disabled:bg-slate-700"
            >
              🖼️ QR画像から読み取る
            </button>
          )}

          <input
            ref={qrImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file =
                event.target.files?.[0];

              if (file) {
                void scanQrImage(file);
              }
            }}
          />
        </div>

        <div
          id="member-qr-reader"
          className={
            scannerActive || imageScanBusy
              ? "mt-4 min-h-[280px] overflow-hidden rounded-2xl bg-black"
              : "hidden"
          }
        />

        {scannerMessage && (
          <div className="mt-3 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-slate-200">
            {scannerMessage}
          </div>
        )}



        {loading && (
          <div className="mt-5 rounded-2xl bg-slate-800 p-5 text-center font-bold">
            処理中...
          </div>
        )}

        {member && (
          <>
            <section className="mt-5 rounded-3xl border border-violet-500/40 bg-gradient-to-br from-violet-950 to-slate-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-violet-300">
                    会員番号
                  </p>

                  <p className="text-xl font-black">
                    {member.memberNo ??
                      "未設定"}
                  </p>

                  <h3 className="mt-3 text-3xl font-black">
                    {member.name ??
                      "名前未設定"}
                    様
                  </h3>
                </div>

                <div className="rounded-2xl bg-violet-700 px-5 py-3 text-center">
                  <p className="text-sm">
                    RANK
                  </p>

                  <p className="text-xl font-black">
                    {member.rank ??
                      "Bronze"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-900/80 p-3">
                  <p className="text-xs text-slate-400">
                    ポイント
                  </p>

                  <p className="mt-1 text-2xl font-black text-yellow-300">
                    {(member.point ??
                      0).toLocaleString()}
                    pt
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900/80 p-3">
                  <p className="text-xs text-slate-400">
                    来店回数
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {member.visitCount ?? 0}
                    回
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900/80 p-3">
                  <p className="text-xs text-slate-400">
                    最終来店
                  </p>

                  <p className="mt-1 font-bold">
                    {formatDate(
                      member.lastVisitAt,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900/80 p-3">
                  <p className="text-xs text-slate-400">
                    誕生日
                  </p>

                  <p className="mt-1 font-bold">
                    {member.birthday ??
                      "未登録"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl bg-slate-950 p-4">
              <h3 className="text-xl font-black">
                ポイント付与
              </h3>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[100, 500, 1000].map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        addPoint(
                          value,
                          "POS手動付与",
                        )
                      }
                      className="min-h-14 rounded-xl bg-emerald-700 font-black"
                    >
                      +{value}pt
                    </button>
                  ),
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={customPoint}
                  onChange={(event) =>
                    setCustomPoint(
                      Math.max(
                        0,
                        Number(
                          event.target
                            .value,
                        ),
                      ),
                    )
                  }
                  className="min-w-0 flex-1 rounded-xl bg-slate-800 p-3"
                />

                <button
                  type="button"
                  onClick={() =>
                    addPoint(
                      customPoint,
                      "POS手動付与",
                    )
                  }
                  className="rounded-xl bg-emerald-700 px-5 font-bold"
                >
                  付与
                </button>
              </div>
            </section>

            <section className="mt-5 rounded-2xl bg-blue-950 p-4">
              <h3 className="text-xl font-black">
                来店＋会計ポイント
              </h3>

              <p className="mt-2 text-sm text-blue-200">
                来店30pt ＋
                会計100円につき1pt
              </p>

              <label className="mt-4 block font-bold">
                会計金額
              </label>

              <input
                type="number"
                min={0}
                value={checkoutAmount}
                onChange={(event) =>
                  setCheckoutAmount(
                    Math.max(
                      0,
                      Number(
                        event.target.value,
                      ),
                    ),
                  )
                }
                className="mt-2 w-full rounded-xl bg-slate-900 p-4 text-2xl font-black"
              />

              <div className="mt-3 rounded-xl bg-slate-900 p-4">
                <div className="flex justify-between">
                  <span>
                    来店ポイント
                  </span>
                  <strong>30pt</strong>
                </div>

                <div className="mt-2 flex justify-between">
                  <span>
                    会計ポイント
                  </span>
                  <strong>
                    {Math.floor(
                      checkoutAmount /
                        100,
                    )}
                    pt
                  </strong>
                </div>

                <div className="mt-3 flex justify-between border-t border-slate-700 pt-3 text-xl">
                  <span>合計</span>

                  <strong className="text-yellow-300">
                    {30 +
                      Math.floor(
                        checkoutAmount /
                          100,
                      )}
                    pt
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  addVisitAndCheckoutPoint
                }
                className="mt-4 min-h-14 w-full rounded-xl bg-blue-600 text-lg font-black"
              >
                来店・会計ポイントを登録
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}