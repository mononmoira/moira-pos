"use client";

import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
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

export type MemberCouponApplication = {
  userCouponId: string;
  couponId?: string;
  title: string;
  discountAmount: number;
};

export type MemberTicketLink = {
  uid: string;
  memberNo?: string;
  name?: string;
};

export type MemberTicketOption = {
  id: string;
  label: string;
  total: number;
  balance: number;
  hasPayments: boolean;
  hasCoupon: boolean;
  memberUid?: string;
  memberName?: string;
  pointEligibleAmount: number;
};

type UserCoupon = {
  id: string;
  couponId?: string;
  title: string;
  description: string;
  expireDate?: unknown;
  used: boolean;
  discountType: "amount" | "percent" | "unsupported";
  discountValue: number;
};

type Props = {
  tickets: MemberTicketOption[];
  selectedTicketId: string | null;
  canApplyCoupon: boolean;
  onLinkMember: (
    ticketId: string,
    member: MemberTicketLink,
  ) => boolean;
  onApplyCoupon: (
    ticketId: string,
    coupon: MemberCouponApplication,
  ) => boolean;
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


function couponDateToDate(value: unknown) {
  if (!value) return null;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // YYYY-MM-DD はその日の23:59:59まで有効として扱う。
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      23,
      59,
      59,
      999,
    );
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCouponExpiry(value: unknown) {
  const date = couponDateToDate(value);
  return date ? date.toLocaleDateString("ja-JP") : "期限なし";
}

function resolveCouponDiscount(data: Record<string, unknown>) {
  const amountCandidates = [
    data.discountAmount,
    data.amount,
    data.discount,
  ];

  for (const candidate of amountCandidates) {
    if (typeof candidate === "number" && candidate > 0) {
      return {
        discountType: "amount" as const,
        discountValue: Math.floor(candidate),
      };
    }
  }

  const percentCandidates = [
    data.discountPercent,
    data.percent,
  ];

  for (const candidate of percentCandidates) {
    if (typeof candidate === "number" && candidate > 0) {
      return {
        discountType: "percent" as const,
        discountValue: candidate,
      };
    }
  }

  const text = `${String(data.title ?? "")} ${String(
    data.description ?? "",
  )}`;

  const percentMatch = text.match(
    /(\d{1,3}(?:\.\d+)?)\s*%\s*(?:OFF|オフ|引き|値引き)?/i,
  );

  if (percentMatch) {
    return {
      discountType: "percent" as const,
      discountValue: Number(percentMatch[1]),
    };
  }

  const yenOffMatch = text.match(
    /(?:[¥￥]\s*)?([0-9][0-9,]*)\s*(?:円)?\s*(?:OFF|オフ|引き|値引き)/i,
  );

  if (yenOffMatch) {
    return {
      discountType: "amount" as const,
      discountValue: Number(yenOffMatch[1].replace(/,/g, "")),
    };
  }

  const yenSymbolMatch = text.match(/[¥￥]\s*([0-9][0-9,]*)/);

  if (yenSymbolMatch) {
    return {
      discountType: "amount" as const,
      discountValue: Number(yenSymbolMatch[1].replace(/,/g, "")),
    };
  }

  return {
    discountType: "unsupported" as const,
    discountValue: 0,
  };
}

function calculateCouponDiscount(
  coupon: UserCoupon,
  ticket: MemberTicketOption,
) {
  if (coupon.discountType === "amount") {
    return Math.min(coupon.discountValue, ticket.balance);
  }

  if (coupon.discountType === "percent") {
    return Math.min(
      Math.ceil(ticket.balance * (coupon.discountValue / 100)),
      ticket.balance,
    );
  }

  return 0;
}

function couponDiscountLabel(coupon: UserCoupon) {
  if (coupon.discountType === "amount") {
    return `${coupon.discountValue.toLocaleString("ja-JP")}円OFF`;
  }

  if (coupon.discountType === "percent") {
    return `${coupon.discountValue}%OFF`;
  }

  return "会計値引き対象外";
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
  tickets,
  selectedTicketId,
  canApplyCoupon,
  onLinkMember,
  onApplyCoupon,
  onClose,
}: Props) {
  const [member, setMember] =
    useState<Member | null>(null);

  const [loading, setLoading] = useState(false);

  const [scannerActive, setScannerActive] =
    useState(false);


  const [customPoint, setCustomPoint] =
    useState(100);

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

  const [memberCoupons, setMemberCoupons] =
    useState<UserCoupon[]>([]);
  const [couponLoading, setCouponLoading] =
    useState(false);
  const [couponTicketId, setCouponTicketId] =
    useState("");
  const [couponUseBusyId, setCouponUseBusyId] =
    useState<string | null>(null);


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

  useEffect(() => {
    const preferred =
      (selectedTicketId &&
        tickets.some((ticket) => ticket.id === selectedTicketId)
        ? selectedTicketId
        : "") ||
      tickets.find(
        (ticket) => !ticket.hasPayments && !ticket.hasCoupon,
      )?.id ||
      tickets[0]?.id ||
      "";

    setCouponTicketId((current) =>
      current && tickets.some((ticket) => ticket.id === current)
        ? current
        : preferred,
    );
  }, [tickets, selectedTicketId]);

  async function loadMemberCoupons(uid: string) {
    setCouponLoading(true);

    try {
      // uidだけで取得し、used/期限は端末側で絞ることで
      // Firestoreの複合インデックスを不要にする。
      const snapshot = await getDocs(
        query(
          collection(memberDb, "userCoupons"),
          where("uid", "==", uid),
        ),
      );

      const now = new Date();

      const nextCoupons = snapshot.docs
        .map((couponDocument) => {
          const data = couponDocument.data() as Record<string, unknown>;
          const discount = resolveCouponDiscount(data);

          return {
            id: couponDocument.id,
            couponId:
              typeof data.couponId === "string"
                ? data.couponId
                : undefined,
            title:
              typeof data.title === "string" && data.title.trim()
                ? data.title
                : "会員クーポン",
            description:
              typeof data.description === "string"
                ? data.description
                : "",
            expireDate: data.expireDate,
            used: data.used === true,
            ...discount,
          } satisfies UserCoupon;
        })
        .filter((coupon) => {
          if (coupon.used) return false;

          const expireDate = couponDateToDate(coupon.expireDate);
          return !expireDate || expireDate.getTime() >= now.getTime();
        });

      setMemberCoupons(nextCoupons);
    } catch (error) {
      console.error("会員クーポンの取得に失敗しました。", error);
      setMemberCoupons([]);
      alert(
        "会員情報は取得できましたが、クーポン一覧の取得に失敗しました。",
      );
    } finally {
      setCouponLoading(false);
    }
  }

  function linkMemberToCurrentTicket() {
    if (!member) return false;

    if (!canApplyCoupon) {
      alert(
        "会員と伝票の連携は店舗iPadのPOSから行ってください。",
      );
      return false;
    }

    const ticket = tickets.find(
      (item) => item.id === couponTicketId,
    );

    if (!ticket) {
      alert("連携する伝票を選択してください。");
      return false;
    }

    return onLinkMember(ticket.id, {
      uid: member.uid,
      memberNo: member.memberNo,
      name: member.name,
    });
  }

  async function useCoupon(coupon: UserCoupon) {
    if (!member) return;

    if (!canApplyCoupon) {
      alert(
        "会計値引きクーポンは店舗iPadのPOSから使用してください。",
      );
      return;
    }

    const ticket = tickets.find(
      (item) => item.id === couponTicketId,
    );

    if (!ticket) {
      alert("値引きを入れる伝票を選択してください。");
      return;
    }

    if (ticket.hasPayments) {
      alert(
        "支払い登録後の伝票にはクーポンを適用できません。支払いを取り消してからクーポンを使用してください。",
      );
      return;
    }

    if (ticket.hasCoupon) {
      alert("この伝票にはすでに会員クーポンが適用されています。");
      return;
    }

    const discountAmount = calculateCouponDiscount(coupon, ticket);

    if (discountAmount <= 0) {
      alert(
        "このクーポンは金額OFF・％OFFとして判定できないため、自動値引きできません。",
      );
      return;
    }

    const confirmed = window.confirm(
      `${coupon.title}を使用します。\n\n` +
        `${ticket.label}\n` +
        `値引き：${discountAmount.toLocaleString("ja-JP")}円\n\n` +
        "伝票へ値引きを入れて、クーポンを使用済みにしますか？",
    );

    if (!confirmed) return;

    const linked = onLinkMember(ticket.id, {
      uid: member.uid,
      memberNo: member.memberNo,
      name: member.name,
    });

    if (!linked) {
      return;
    }

    setCouponUseBusyId(coupon.id);

    const couponRef = doc(
      memberDb,
      "userCoupons",
      coupon.id,
    );

    try {
      // 同じクーポンを2端末で同時に使用しないよう、
      // 使用済みへの変更はトランザクションで確定する。
      await runTransaction(memberDb, async (transaction) => {
        const current = await transaction.get(couponRef);

        if (!current.exists()) {
          throw new Error("coupon-not-found");
        }

        if (current.data().used === true) {
          throw new Error("coupon-already-used");
        }

        transaction.update(couponRef, {
          used: true,
          usedAt: serverTimestamp(),
          usedTicketId: ticket.id,
          usedAmount: discountAmount,
          usedStore: "moira",
        });
      });

      const applied = onApplyCoupon(ticket.id, {
        userCouponId: coupon.id,
        couponId: coupon.couponId,
        title: coupon.title,
        discountAmount,
      });

      if (!applied) {
        // POS側で適用できなかった場合は、クーポンだけ消費されないよう戻す。
        await updateDoc(couponRef, {
          used: false,
          usedAt: null,
          usedTicketId: null,
          usedAmount: 0,
          usedStore: null,
        });

        throw new Error("pos-coupon-apply-failed");
      }

      setMemberCoupons((current) =>
        current.filter((item) => item.id !== coupon.id),
      );

      alert(
        `${coupon.title}を使用しました。\n${discountAmount.toLocaleString(
          "ja-JP",
        )}円を伝票から値引きしました。`,
      );
    } catch (error) {
      console.error("クーポン使用に失敗しました。", error);

      const message =
        error instanceof Error ? error.message : "";

      if (message === "coupon-already-used") {
        alert("このクーポンはすでに使用済みです。");
        await loadMemberCoupons(member.uid);
      } else if (message !== "pos-coupon-apply-failed") {
        alert(
          "クーポン使用に失敗しました。通信状況を確認して、もう一度お試しください。",
        );
      }
    } finally {
      setCouponUseBusyId(null);
    }
  }

  async function loadMember(uid: string) {
    const trimmedUid = uid.trim();

    if (!trimmedUid) {
      alert("QRコードから会員情報を読み取れませんでした。もう一度お試しください。");
      return;
    }

    setLoading(true);
    setMemberCoupons([]);

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
      await loadMemberCoupons(trimmedUid);
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

            <section className="mt-5 rounded-2xl border border-blue-500/30 bg-blue-950/40 p-4">
              <h3 className="text-xl font-black">
                💳 お会計連携
              </h3>

              <p className="mt-2 text-sm text-blue-200">
                会員を伝票に連携すると、会計終了時に来店30pt＋会計100円につき1ptを自動付与します。
              </p>

              {tickets.length === 0 ? (
                <div className="mt-4 rounded-xl bg-slate-900 p-4 text-center text-slate-400">
                  使用中の伝票がありません。
                </div>
              ) : (
                <>
                  <label className="mt-4 block text-sm font-bold text-blue-100">
                    連携する伝票
                  </label>

                  <select
                    value={couponTicketId}
                    onChange={(event) =>
                      setCouponTicketId(event.target.value)
                    }
                    disabled={!canApplyCoupon}
                    className="mt-2 w-full rounded-xl bg-slate-900 p-3 font-bold disabled:opacity-60"
                  >
                    {tickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.label}
                        {ticket.memberUid
                          ? `（${ticket.memberName ?? "会員"}様 連携済み）`
                          : ""}
                      </option>
                    ))}
                  </select>

                  {(() => {
                    const targetTicket = tickets.find(
                      (ticket) => ticket.id === couponTicketId,
                    );

                    if (!targetTicket) return null;

                    const salesPoint = Math.floor(
                      targetTicket.pointEligibleAmount / 100,
                    );
                    const totalPoint = 30 + salesPoint;
                    const linkedToCurrentMember =
                      targetTicket.memberUid === member.uid;

                    return (
                      <div className="mt-3 rounded-xl bg-slate-900 p-4">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-300">
                            クーポン・割引後のポイント対象額
                          </span>
                          <strong>
                            {targetTicket.pointEligibleAmount.toLocaleString("ja-JP")}円
                          </strong>
                        </div>

                        <div className="mt-2 flex justify-between gap-3">
                          <span className="text-slate-300">
                            会計時の自動付与予定
                          </span>
                          <strong className="text-yellow-300">
                            {totalPoint.toLocaleString("ja-JP")}pt
                          </strong>
                        </div>

                        <p className="mt-2 text-xs text-slate-400">
                          来店30pt＋会計{salesPoint.toLocaleString("ja-JP")}pt。キャッシュレス手数料はポイント対象外です。
                        </p>

                        <button
                          type="button"
                          onClick={linkMemberToCurrentTicket}
                          disabled={!canApplyCoupon || linkedToCurrentMember}
                          className="mt-3 min-h-12 w-full rounded-xl bg-blue-600 px-4 font-black disabled:bg-emerald-800 disabled:text-emerald-100"
                        >
                          {linkedToCurrentMember
                            ? "✓ この会員と伝票は連携済み"
                            : "この会員を伝票に連携"}
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}

              {!canApplyCoupon && (
                <div className="mt-3 rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
                  PC管理モードでは会員情報の確認のみできます。伝票連携・会計ポイント付与は店舗iPadから行います。
                </div>
              )}
            </section>

            <section className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">
                    🎟 利用可能クーポン
                  </h3>
                  <p className="mt-1 text-sm text-amber-100/70">
                    金額OFF・％OFFクーポンは伝票へ自動で値引きします。
                  </p>
                </div>

                <span className="rounded-full bg-amber-900 px-3 py-1 text-sm font-black text-amber-100">
                  {memberCoupons.length}枚
                </span>
              </div>

              {!canApplyCoupon && (
                <div className="mt-3 rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-300">
                  PC管理モードではクーポン確認のみできます。会計値引きは店舗iPadから使用してください。
                </div>
              )}

              {tickets.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-bold text-amber-100">
                    値引きを入れる伝票
                  </label>
                  <select
                    value={couponTicketId}
                    onChange={(event) =>
                      setCouponTicketId(event.target.value)
                    }
                    disabled={!canApplyCoupon}
                    className="mt-2 w-full rounded-xl bg-slate-900 p-3 font-bold disabled:opacity-60"
                  >
                    {tickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.label}・残り{ticket.balance.toLocaleString("ja-JP")}円
                        {ticket.hasPayments ? "（支払登録あり）" : ""}
                        {ticket.hasCoupon ? "（クーポン適用済）" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tickets.length === 0 && (
                <div className="mt-4 rounded-xl bg-slate-900 p-4 text-center text-slate-400">
                  使用中の伝票がありません。
                </div>
              )}

              {couponLoading ? (
                <div className="mt-4 rounded-xl bg-slate-900 p-4 text-center font-bold">
                  クーポンを確認中...
                </div>
              ) : memberCoupons.length === 0 ? (
                <div className="mt-4 rounded-xl bg-slate-900 p-4 text-center text-slate-400">
                  現在利用できるクーポンはありません。
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {memberCoupons.map((coupon) => {
                    const targetTicket = tickets.find(
                      (ticket) => ticket.id === couponTicketId,
                    );
                    const discountAmount = targetTicket
                      ? calculateCouponDiscount(coupon, targetTicket)
                      : 0;
                    const disabled =
                      !canApplyCoupon ||
                      !targetTicket ||
                      targetTicket.hasPayments ||
                      targetTicket.hasCoupon ||
                      coupon.discountType === "unsupported" ||
                      discountAmount <= 0 ||
                      couponUseBusyId !== null;

                    return (
                      <div
                        key={coupon.id}
                        className="rounded-2xl bg-slate-900 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-black text-amber-200">
                              {coupon.title}
                            </p>
                            {coupon.description && (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                                {coupon.description}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-slate-400">
                              有効期限：{formatCouponExpiry(coupon.expireDate)}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-sm font-black ${
                              coupon.discountType === "unsupported"
                                ? "bg-slate-700 text-slate-300"
                                : "bg-emerald-900 text-emerald-200"
                            }`}
                          >
                            {couponDiscountLabel(coupon)}
                          </span>
                        </div>

                        {targetTicket &&
                          coupon.discountType !== "unsupported" && (
                            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-950 p-3">
                              <span className="text-sm text-slate-400">
                                この伝票の値引き額
                              </span>
                              <strong className="text-xl text-emerald-300">
                                -{discountAmount.toLocaleString("ja-JP")}円
                              </strong>
                            </div>
                          )}

                        <button
                          type="button"
                          onClick={() => void useCoupon(coupon)}
                          disabled={disabled}
                          className="mt-3 min-h-12 w-full rounded-xl bg-amber-600 px-4 font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
                        >
                          {couponUseBusyId === coupon.id
                            ? "使用処理中..."
                            : coupon.discountType === "unsupported"
                              ? "この特典は自動値引き対象外"
                              : "このクーポンを伝票に適用"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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


          </>
        )}
      </div>
    </div>
  );
}