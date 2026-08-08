"use client";

import { useEffect, useMemo, useState } from "react";
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
type DistributionType = "all" | "birthdayMonth" | "specific";

type MemberOption = {
  uid: string;
  name: string;
  memberNo: string;
  birthday: string;
  birthMonth: number | null;
  enabled: boolean;
};

function splitIntoChunks<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function firebaseErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const value = error as { code?: unknown; message?: unknown };
    return `${String(value.code ?? "unknown")}\n${String(value.message ?? "")}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function normalizeBirthday(value: unknown) {
  if (!value) return "";

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  return String(value);
}

function getBirthMonth(birthday: string, explicitBirthMonth?: unknown) {
  if (
    typeof explicitBirthMonth === "number" &&
    explicitBirthMonth >= 1 &&
    explicitBirthMonth <= 12
  ) {
    return explicitBirthMonth;
  }

  if (!birthday) return null;

  const parts = birthday.trim().split(/[-/.]/);
  if (parts.length >= 2) {
    const month = Number(parts[1]);
    if (Number.isInteger(month) && month >= 1 && month <= 12) {
      return month;
    }
  }

  const date = new Date(birthday);
  return Number.isNaN(date.getTime()) ? null : date.getMonth() + 1;
}

export default function MemberCampaignModal({ onClose }: Props) {
  const [tab, setTab] = useState<"coupon" | "event">("coupon");
  const [busy, setBusy] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);

  const [couponTitle, setCouponTitle] = useState("");
  const [couponDescription, setCouponDescription] = useState("");
  const [couponExpireDate, setCouponExpireDate] = useState("");
  const [discountType, setDiscountType] =
    useState<CouponDiscountType>("amount");
  const [discountValue, setDiscountValue] = useState(1000);

  const [distributionType, setDistributionType] =
    useState<DistributionType>("all");
  const [birthdayMonth, setBirthdayMonth] = useState(
    new Date().getMonth() + 1,
  );
  const [selectedMemberUid, setSelectedMemberUid] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");

  useEffect(() => {
    void loadMembers();
  }, []);

  async function loadMembers() {
    setMemberLoading(true);

    try {
      const snapshot = await getDocs(collection(memberDb, "users"));

      const nextMembers = snapshot.docs
        .map((memberDoc) => {
          const data = memberDoc.data();
          const birthday = normalizeBirthday(data.birthday);

          return {
            uid: memberDoc.id,
            name: typeof data.name === "string" ? data.name : "名前未設定",
            memberNo:
              typeof data.memberNo === "string" ? data.memberNo : "",
            birthday,
            birthMonth: getBirthMonth(birthday, data.birthMonth),
            enabled: data.enabled !== false,
          } satisfies MemberOption;
        })
        .filter((member) => member.enabled)
        .sort((a, b) =>
          (a.memberNo || a.name).localeCompare(
            b.memberNo || b.name,
            "ja",
          ),
        );

      setMembers(nextMembers);
    } catch (error) {
      console.error("会員一覧の取得に失敗しました。", error);
      alert(
        "会員一覧を取得できませんでした。\n\n" +
          firebaseErrorMessage(error),
      );
    } finally {
      setMemberLoading(false);
    }
  }

  const filteredMembers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    if (!keyword) return members;

    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(keyword) ||
        member.memberNo.toLowerCase().includes(keyword),
    );
  }, [members, memberSearch]);

  const targetMembers = useMemo(() => {
    if (distributionType === "all") return members;

    if (distributionType === "birthdayMonth") {
      return members.filter((member) => member.birthMonth === birthdayMonth);
    }

    return members.filter((member) => member.uid === selectedMemberUid);
  }, [members, distributionType, birthdayMonth, selectedMemberUid]);

  function setBirthdayCouponPreset() {
    const month = new Date().getMonth() + 1;

    setDistributionType("birthdayMonth");
    setBirthdayMonth(month);
    setDiscountType("amount");
    setDiscountValue(1000);
    setCouponTitle(`${month}月 お誕生日クーポン`);
    setCouponDescription("お誕生月のお会計から1,000円OFF");
  }

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

    if (distributionType === "specific" && !selectedMemberUid) {
      alert("配布する会員を選択してください。");
      return;
    }

    if (targetMembers.length === 0) {
      alert("配布対象の会員がいません。");
      return;
    }

    const targetLabel =
      distributionType === "all"
        ? "全会員"
        : distributionType === "birthdayMonth"
          ? `${birthdayMonth}月生まれの会員`
          : `${targetMembers[0]?.name ?? "選択会員"} 様`;

    const confirmed = window.confirm(
      `「${title}」を作成しますか？\n\n` +
        `配布先：${targetLabel}\n` +
        `配布人数：${targetMembers.length}名\n` +
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
        distributionType,
        recipientCount: targetMembers.length,
        ...(distributionType === "birthdayMonth"
          ? { targetBirthMonth: birthdayMonth }
          : {}),
        ...(distributionType === "specific"
          ? { targetMemberUid: selectedMemberUid }
          : {}),
        ...(discountType === "amount"
          ? { discountAmount: Math.floor(discountValue) }
          : { discountPercent: discountValue }),
        createdAt: serverTimestamp(),
      };

      const couponRef = await addDoc(
        collection(memberDb, "coupons"),
        couponData,
      );

      for (const chunk of splitIntoChunks(targetMembers, 400)) {
        const batch = writeBatch(memberDb);

        for (const member of chunk) {
          const userCouponRef = doc(
            collection(memberDb, "userCoupons"),
          );

          batch.set(userCouponRef, {
            uid: member.uid,
            couponId: couponRef.id,
            title,
            description,
            expireDate: couponExpireDate,
            imageUrl: "",
            used: false,
            usedAt: null,
            distributionType,
            ...(discountType === "amount"
              ? { discountAmount: Math.floor(discountValue) }
              : { discountPercent: discountValue }),
            createdAt: serverTimestamp(),
          });
        }

        await batch.commit();
      }

      alert(
        `クーポンを作成しました。\n\n「${title}」\n配布：${targetMembers.length}名`,
      );

      setCouponTitle("");
      setCouponDescription("");
      setCouponExpireDate("");
      setDiscountType("amount");
      setDiscountValue(1000);
      setDistributionType("all");
      setSelectedMemberUid("");
      setMemberSearch("");
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black">会員クーポンを作成</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  全会員・誕生月・特定の会員を選んで配布できます。
                </p>
              </div>

              <button
                type="button"
                onClick={setBirthdayCouponPreset}
                disabled={busy}
                className="rounded-xl bg-amber-600 px-4 py-3 font-black"
              >
                🎂 誕生日クーポン
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <p className="font-black">配布先</p>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setDistributionType("all")}
                  className={`min-h-12 rounded-xl font-bold ${
                    distributionType === "all"
                      ? "bg-fuchsia-700"
                      : "bg-slate-800"
                  }`}
                >
                  全会員
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionType("birthdayMonth")}
                  className={`min-h-12 rounded-xl font-bold ${
                    distributionType === "birthdayMonth"
                      ? "bg-amber-600"
                      : "bg-slate-800"
                  }`}
                >
                  🎂 誕生月
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionType("specific")}
                  className={`min-h-12 rounded-xl font-bold ${
                    distributionType === "specific"
                      ? "bg-blue-700"
                      : "bg-slate-800"
                  }`}
                >
                  👤 特定会員
                </button>
              </div>

              {distributionType === "birthdayMonth" && (
                <div className="mt-4">
                  <label className="block font-bold">誕生月</label>
                  <select
                    value={birthdayMonth}
                    onChange={(event) =>
                      setBirthdayMonth(Number(event.target.value))
                    }
                    className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(
                      (month) => (
                        <option key={month} value={month}>
                          {month}月
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}

              {distributionType === "specific" && (
                <div className="mt-4">
                  <label className="block font-bold">会員検索</label>
                  <input
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="名前または会員番号"
                    className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                  />

                  <label className="mt-3 block font-bold">配布する会員</label>
                  <select
                    value={selectedMemberUid}
                    onChange={(event) => setSelectedMemberUid(event.target.value)}
                    className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                  >
                    <option value="">会員を選択</option>
                    {filteredMembers.map((member) => (
                      <option key={member.uid} value={member.uid}>
                        {member.memberNo ? `${member.memberNo} / ` : ""}
                        {member.name}
                        {member.birthMonth ? ` / ${member.birthMonth}月生` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950 p-3">
                <div>
                  <p className="text-xs text-slate-400">配布予定</p>
                  <p className="text-xl font-black text-yellow-300">
                    {memberLoading ? "会員読込中..." : `${targetMembers.length}名`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadMembers()}
                  disabled={busy || memberLoading}
                  className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold"
                >
                  会員一覧を更新
                </button>
              </div>
            </div>

            <label className="mt-5 block font-bold">クーポン名</label>
            <input
              value={couponTitle}
              onChange={(event) => setCouponTitle(event.target.value)}
              placeholder="例：テスト 1,000円OFF"
              className="mt-2 w-full rounded-xl bg-slate-800 p-3"
            />

            <label className="mt-4 block font-bold">説明</label>
            <textarea
              value={couponDescription}
              onChange={(event) => setCouponDescription(event.target.value)}
              placeholder="例：お会計から1,000円値引き"
              className="mt-2 min-h-24 w-full rounded-xl bg-slate-800 p-3"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-bold">値引き種類</label>
                <select
                  value={discountType}
                  onChange={(event) =>
                    setDiscountType(event.target.value as CouponDiscountType)
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                >
                  <option value="amount">金額OFF</option>
                  <option value="percent">％OFF</option>
                </select>
              </div>

              <div>
                <label className="block font-bold">
                  {discountType === "amount" ? "値引き金額" : "値引き率"}
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={discountType === "percent" ? 100 : undefined}
                    value={discountValue}
                    onChange={(event) =>
                      setDiscountValue(Math.max(0, Number(event.target.value)))
                    }
                    className="min-w-0 flex-1 rounded-xl bg-slate-800 p-3"
                  />
                  <span className="font-black">
                    {discountType === "amount" ? "円" : "%"}
                  </span>
                </div>
              </div>
            </div>

            <label className="mt-4 block font-bold">有効期限</label>
            <input
              type="date"
              value={couponExpireDate}
              onChange={(event) => setCouponExpireDate(event.target.value)}
              className="mt-2 w-full rounded-xl bg-slate-800 p-3"
            />

            <div className="mt-4 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/40 p-4">
              <p className="font-black text-fuchsia-200">作成内容</p>
              <p className="mt-2 text-lg font-black">
                {couponTitle || "クーポン名未入力"}
              </p>
              <p className="mt-1 text-yellow-300">
                {discountType === "amount"
                  ? `${discountValue.toLocaleString("ja-JP")}円OFF`
                  : `${discountValue}%OFF`}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                配布予定：{targetMembers.length}名
              </p>
            </div>

            <button
              type="button"
              onClick={() => void createCoupon()}
              disabled={busy || memberLoading}
              className="mt-5 min-h-14 w-full rounded-xl bg-fuchsia-700 text-lg font-black disabled:bg-slate-700"
            >
              {busy
                ? "作成中..."
                : `クーポンを作成して${targetMembers.length}名へ配布`}
            </button>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl bg-slate-950 p-4 sm:p-5">
            <h3 className="text-xl font-black">イベントを作成</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Moira会員アプリのイベント情報用Firestoreへ公開します。
            </p>

            <label className="mt-5 block font-bold">イベント名</label>
            <input
              value={eventTitle}
              onChange={(event) => setEventTitle(event.target.value)}
              placeholder="例：ななみバースデー"
              className="mt-2 w-full rounded-xl bg-slate-800 p-3"
            />

            <label className="mt-4 block font-bold">内容</label>
            <textarea
              value={eventDescription}
              onChange={(event) => setEventDescription(event.target.value)}
              placeholder="イベント内容・お知らせなど"
              className="mt-2 min-h-28 w-full rounded-xl bg-slate-800 p-3"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-bold">開始日</label>
                <input
                  type="date"
                  value={eventStartDate}
                  onChange={(event) => setEventStartDate(event.target.value)}
                  className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                />
              </div>

              <div>
                <label className="block font-bold">終了日</label>
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={(event) => setEventEndDate(event.target.value)}
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