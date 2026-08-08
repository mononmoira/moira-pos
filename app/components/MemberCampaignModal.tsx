"use client";

import { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { memberDb } from "../lib/memberFirebase";

type Props = {
  onClose: () => void;
};

type CouponDiscountType = "amount" | "percent";

function splitIntoChunks<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function firebaseErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const value = error as {
      code?: unknown;
      message?: unknown;
    };

    return `${String(value.code ?? "unknown")}\n${String(
      value.message ?? "",
    )}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export default function MemberCampaignModal({
  onClose,
}: Props) {
  const [tab, setTab] = useState<"coupon" | "event">("coupon");
  const [busy, setBusy] = useState(false);

  const [couponTitle, setCouponTitle] = useState("");
  const [couponDescription, setCouponDescription] = useState("");
  const [couponExpireDate, setCouponExpireDate] = useState("");
  const [discountType, setDiscountType] =
    useState<CouponDiscountType>("amount");
  const [discountValue, setDiscountValue] = useState(1000);

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");

  async function createCoupon() {
    const title = couponTitle.trim();
    const description = couponDescription.trim();

    if (!title) {
      alert("クーポン名を入力してください。");
      return;
    }

    if (!couponExpireDate) {
      alert("有効期限を入力してください。");
      return;
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      alert(
        discountType === "amount"
          ? "値引き金額を入力してください。"
          : "値引き率を入力してください。",
      );
      return;
    }

    if (discountType === "percent" && discountValue > 100) {
      alert("％OFFは100％以下にしてください。");
      return;
    }

    const confirmed = window.confirm(
      `「${title}」を作成し、現在の全会員へ1枚ずつ配布しますか？\n\n` +
        `${
          discountType === "amount"
            ? `${discountValue.toLocaleString("ja-JP")}円OFF`
            : `${discountValue}%OFF`
        }\n` +
        `有効期限：${couponExpireDate}`,
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const couponData = {
        title,
        description,
        type: "manual",
        active: true,
        expireDate: couponExpireDate,
        pointNeed: 0,
        used: false,
        imageUrl: "",
        discountType,
        discountValue,
        ...(discountType === "amount"
          ? { discountAmount: Math.floor(discountValue) }
          : { discountPercent: discountValue }),
        createdAt: serverTimestamp(),
      };

      const couponRef = await addDoc(
        collection(memberDb, "coupons"),
        couponData,
      );

      const usersSnapshot = await getDocs(
        collection(memberDb, "users"),
      );

      const users = usersSnapshot.docs.filter((userDoc) => {
        const data = userDoc.data();
        return data.enabled !== false;
      });

      // Firestore batch は上限があるため、余裕を持って400件ずつ配布。
      for (const chunk of splitIntoChunks(users, 400)) {
        const batch = writeBatch(memberDb);

        for (const userDoc of chunk) {
          const userCouponRef = doc(
            collection(memberDb, "userCoupons"),
          );

          batch.set(userCouponRef, {
            uid: userDoc.id,
            couponId: couponRef.id,
            title,
            description,
            expireDate: couponExpireDate,
            imageUrl: "",
            used: false,
            usedAt: null,
            ...(discountType === "amount"
              ? { discountAmount: Math.floor(discountValue) }
              : { discountPercent: discountValue }),
            createdAt: serverTimestamp(),
          });
        }

        await batch.commit();
      }

      alert(
        `クーポンを作成しました。\n\n「${title}」\n配布：${users.length}名`,
      );

      setCouponTitle("");
      setCouponDescription("");
      setCouponExpireDate("");
      setDiscountType("amount");
      setDiscountValue(1000);
    } catch (error) {
      console.error("クーポン作成に失敗しました。", error);

      alert(
        "クーポン作成に失敗しました。\n\n" +
          firebaseErrorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  }

  async function createEvent() {
    const title = eventTitle.trim();
    const description = eventDescription.trim();

    if (!title) {
      alert("イベント名を入力してください。");
      return;
    }

    if (!eventStartDate) {
      alert("開始日を入力してください。");
      return;
    }

    const endDate = eventEndDate || eventStartDate;

    if (endDate < eventStartDate) {
      alert("終了日は開始日以降にしてください。");
      return;
    }

    const confirmed = window.confirm(
      `イベントを公開しますか？\n\n${title}\n${eventStartDate}${
        endDate !== eventStartDate ? ` ～ ${endDate}` : ""
      }`,
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      await addDoc(collection(memberDb, "events"), {
        title,
        description,
        type: "event",
        active: true,
        // 会員アプリ側の既存実装との互換性を持たせるため
        // date / eventDate / startDate を同じ開始日で保存します。
        date: eventStartDate,
        eventDate: eventStartDate,
        startDate: eventStartDate,
        endDate,
        imageUrl: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert(`イベントを作成しました。\n\n「${title}」`);

      setEventTitle("");
      setEventDescription("");
      setEventStartDate("");
      setEventEndDate("");
    } catch (error) {
      console.error("イベント作成に失敗しました。", error);

      alert(
        "イベント作成に失敗しました。\n\n" +
          firebaseErrorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[170] overflow-y-auto bg-black/90 p-3 sm:p-5">
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-slate-900 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">
              クーポン・イベント作成
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Moira会員アプリへ公開・配布
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl bg-slate-700 px-5 py-3 font-bold disabled:opacity-50"
          >
            閉じる
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-950 p-2">
          <button
            type="button"
            onClick={() => setTab("coupon")}
            disabled={busy}
            className={`min-h-12 rounded-xl font-black ${
              tab === "coupon"
                ? "bg-fuchsia-700"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            🎟 クーポン
          </button>

          <button
            type="button"
            onClick={() => setTab("event")}
            disabled={busy}
            className={`min-h-12 rounded-xl font-black ${
              tab === "event"
                ? "bg-indigo-700"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            📅 イベント
          </button>
        </div>

        {tab === "coupon" ? (
          <section className="mt-5 rounded-2xl bg-slate-950 p-4 sm:p-5">
            <h3 className="text-xl font-black">
              会員クーポンを作成
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              作成すると現在登録済みの全会員へ1枚ずつ配布します。
              POSの会員QR画面にもすぐ表示され、会計値引きに使えます。
            </p>

            <label className="mt-5 block font-bold">
              クーポン名
            </label>
            <input
              value={couponTitle}
              onChange={(event) =>
                setCouponTitle(event.target.value)
              }
              placeholder="例：テスト 1,000円OFF"
              className="mt-2 w-full rounded-xl bg-slate-800 p-3"
            />

            <label className="mt-4 block font-bold">
              説明
            </label>
            <textarea
              value={couponDescription}
              onChange={(event) =>
                setCouponDescription(event.target.value)
              }
              placeholder="例：お会計から1,000円値引き"
              className="mt-2 min-h-24 w-full rounded-xl bg-slate-800 p-3"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-bold">
                  値引き種類
                </label>
                <select
                  value={discountType}
                  onChange={(event) =>
                    setDiscountType(
                      event.target.value as CouponDiscountType,
                    )
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                >
                  <option value="amount">
                    金額OFF
                  </option>
                  <option value="percent">
                    ％OFF
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold">
                  {discountType === "amount"
                    ? "値引き金額"
                    : "値引き率"}
                </label>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={
                      discountType === "percent"
                        ? 100
                        : undefined
                    }
                    value={discountValue}
                    onChange={(event) =>
                      setDiscountValue(
                        Math.max(
                          0,
                          Number(event.target.value),
                        ),
                      )
                    }
                    className="min-w-0 flex-1 rounded-xl bg-slate-800 p-3"
                  />
                  <span className="font-black">
                    {discountType === "amount"
                      ? "円"
                      : "%"}
                  </span>
                </div>
              </div>
            </div>

            <label className="mt-4 block font-bold">
              有効期限
            </label>
            <input
              type="date"
              value={couponExpireDate}
              onChange={(event) =>
                setCouponExpireDate(event.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-800 p-3"
            />

            <div className="mt-4 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/40 p-4">
              <p className="font-black text-fuchsia-200">
                作成内容
              </p>
              <p className="mt-2 text-lg font-black">
                {couponTitle || "クーポン名未入力"}
              </p>
              <p className="mt-1 text-yellow-300">
                {discountType === "amount"
                  ? `${discountValue.toLocaleString("ja-JP")}円OFF`
                  : `${discountValue}%OFF`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void createCoupon()}
              disabled={busy}
              className="mt-5 min-h-14 w-full rounded-xl bg-fuchsia-700 text-lg font-black disabled:bg-slate-700"
            >
              {busy
                ? "作成中..."
                : "クーポンを作成して全会員へ配布"}
            </button>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl bg-slate-950 p-4 sm:p-5">
            <h3 className="text-xl font-black">
              イベントを作成
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Moira会員アプリのイベント情報用Firestoreへ公開します。
            </p>

            <label className="mt-5 block font-bold">
              イベント名
            </label>
            <input
              value={eventTitle}
              onChange={(event) =>
                setEventTitle(event.target.value)
              }
              placeholder="例：ななみバースデー"
              className="mt-2 w-full rounded-xl bg-slate-800 p-3"
            />

            <label className="mt-4 block font-bold">
              内容
            </label>
            <textarea
              value={eventDescription}
              onChange={(event) =>
                setEventDescription(event.target.value)
              }
              placeholder="イベント内容・お知らせなど"
              className="mt-2 min-h-28 w-full rounded-xl bg-slate-800 p-3"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-bold">
                  開始日
                </label>
                <input
                  type="date"
                  value={eventStartDate}
                  onChange={(event) =>
                    setEventStartDate(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                />
              </div>

              <div>
                <label className="block font-bold">
                  終了日
                </label>
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={(event) =>
                    setEventEndDate(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                />
                <p className="mt-1 text-xs text-slate-500">
                  1日だけなら空欄でOK
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void createEvent()}
              disabled={busy}
              className="mt-5 min-h-14 w-full rounded-xl bg-indigo-700 text-lg font-black disabled:bg-slate-700"
            >
              {busy ? "作成中..." : "イベントを公開"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}