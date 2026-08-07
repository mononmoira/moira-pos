"use client";

import { useRef, useState } from "react";
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

export default function MemberManagementModal({
  onClose,
}: Props) {
  const [member, setMember] =
    useState<Member | null>(null);

  const [loading, setLoading] = useState(false);

  const [scannerActive, setScannerActive] =
    useState(false);

  const [manualUid, setManualUid] =
    useState("");

  const [customPoint, setCustomPoint] =
    useState(100);

  const [checkoutAmount, setCheckoutAmount] =
    useState(0);

  const scannerRef = useRef<any>(null);

  async function loadMember(uid: string) {
    const trimmedUid = uid.trim();

    if (!trimmedUid) {
      alert("会員UIDを確認してください。");
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
        alert(
          "会員情報が見つかりませんでした。",
        );
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
    } catch (error) {
      console.error(error);

      alert(
        "会員情報の取得に失敗しました。",
      );
    } finally {
      setLoading(false);
    }
  }

  async function startScanner() {
    if (scannerActive) return;

    setScannerActive(true);

    try {
      const { Html5Qrcode } =
        await import("html5-qrcode");

      const scanner =
        new Html5Qrcode(
          "member-qr-reader",
        );

      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 260,
            height: 260,
          },
        },
        async (decodedText) => {
          try {
            await scanner.stop();
          } catch {}

          scannerRef.current = null;
          setScannerActive(false);

          let uid = decodedText;

          // 将来JSON形式のQRにも対応
          try {
            const parsed =
              JSON.parse(decodedText);

            if (
              parsed &&
              typeof parsed.uid === "string"
            ) {
              uid = parsed.uid;
            }
          } catch {
            // 会員証QRはUIDそのものなので
            // JSONでなくても問題なし
          }

          await loadMember(uid);
        },
        () => {},
      );
    } catch (error) {
      console.error(error);

      setScannerActive(false);

      alert(
        "カメラを起動できませんでした。",
      );
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }
    } catch {}

    scannerRef.current = null;
    setScannerActive(false);
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
            disabled={scannerActive}
            className="min-h-16 rounded-2xl bg-blue-700 p-4 text-xl font-black disabled:bg-slate-700"
          >
            📷 会員QRを読み取る
          </button>

          {scannerActive && (
            <button
              type="button"
              onClick={stopScanner}
              className="min-h-16 rounded-2xl bg-red-800 p-4 text-xl font-black"
            >
              カメラ停止
            </button>
          )}
        </div>

        <div
          id="member-qr-reader"
          className={
            scannerActive
              ? "mt-4 overflow-hidden rounded-2xl bg-black"
              : "hidden"
          }
        />

        <div className="mt-5 rounded-2xl bg-slate-950 p-4">
          <p className="font-bold">
            UID手動入力（テスト用）
          </p>

          <div className="mt-2 flex gap-2">
            <input
              value={manualUid}
              onChange={(event) =>
                setManualUid(
                  event.target.value,
                )
              }
              placeholder="会員UID"
              className="min-w-0 flex-1 rounded-xl bg-slate-800 p-3"
            />

            <button
              type="button"
              onClick={() =>
                loadMember(manualUid)
              }
              className="rounded-xl bg-violet-700 px-5 font-bold"
            >
              検索
            </button>
          </div>
        </div>

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