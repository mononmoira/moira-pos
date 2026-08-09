"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";

import { createId } from "./lib/createId";
import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./lib/firebase";
import { memberDb } from "./lib/memberFirebase";

import TodayTicketsPanel from "./components/TodayTicketsPanel";

import type {
  Seat,
  TableTicket,
} from "./components/TableGrid";

import OrderModal, {
  type Product,
} from "./components/OrderModal";

import PaymentModal from "./components/PaymentModal";

import StaffModal, {
  type PaymentCycle,
  type Staff,
  type StaffRole,
} from "./components/StaffModal";

import TicketEditModal from "./components/TicketEditModal";
import { AdjustmentModal } from "./components/AdjustmentModal";

import StaffSelectModal from "./components/StaffSelectModal";
import EventStaffModal from "./components/EventStaffModal";
import PayrollModal from "./components/PayrollModal";
import ReservationModal from "./components/ReservationModal";
import CustomerModal from "./components/CustomerModal";
import ReservationCalendarModal from "./components/ReservationCalendarModal";
import SeatMoveModal from "./components/SeatMoveModal";
import ReceivablesModal from "./components/ReceivablesModal";
import ExtensionModal from "./components/ExtensionModal";
import HistoryHubModal from "./components/HistoryHubModal";
import DrawerModal from "./components/DrawerModal";
import MemberManagementModal, {
  type MemberCouponApplication,
  type MemberTicketLink,
} from "./components/MemberManagementModal";
import MemberCampaignModal from "./components/MemberCampaignModal";
import MemberListModal from "./components/MemberListModal";
import {
  clearOfflineSnapshot,
  getOnlineStatus,
  loadOfflineSnapshot,
  saveOfflineSnapshot,
} from "./lib/offlineStorage";

type Course = {
  id: string;
  name: string;
  minutes: number;
  price: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  assignedStaffIds?: string[];
  eventCups?: Record<string, number>;
  representativeStaffId?: string;
};

type PaymentMethod =
  | "現金"
  | "Squareカード"
  | "QR"
  | "売掛";

type Payment = {
  id: string;
  method: PaymentMethod;
  amount: number;
  appliedAmount?: number;
  surchargeAmount?: number;

  receivedAmount?: number;   // お預かり
  changeAmount?: number;     // おつり
  discountAmount?: number;   // サービス割引

  // Square POS連動
  squareRequestId?: string;
  squareTransactionId?: string;
  squareClientTransactionId?: string;

  paidAt: string;
};

type PendingSquarePayment = {
  requestId: string;
  ticketId: string;
  method: "Squareカード" | "QR";
  baseAmount: number;
  discountAmount: number;
  surchargeAmount: number;
  chargedAmount: number;
  createdAt: string;
};

type SquareCallbackResult = {
  status?: string;
  error_code?: string;
  transaction_id?: string;
  client_transaction_id?: string;
  state?: string;
};

const SQUARE_PENDING_STORAGE_KEY =
  "moira-pos-square-pending-payment-v1";

const SQUARE_PENDING_COLLECTION =
  "squarePayments";

const SQUARE_CALLBACK_URL =
  "https://moira-pos.vercel.app/square-callback";

export type ReservationEntry = {
  staffId: string;
  quantity: number;
};

export type PayrollAdjustmentType = "予約" | "送迎" | "駐車場";

export type PayrollAdjustment = {
  id: string;
  staffId: string;
  type: PayrollAdjustmentType;
  quantity: number;
  unitAmount: number;
  createdAt: string;
};

export type PayrollPayment = {
  id: string;
  staffId: string;
  amount: number;
  paidAt: string;
  note: string;
};

export type CustomerVisit = {
  id: string;
  visitedAt: string;
  ticketTotal: number;
  guestCount: number;
  courseName: string;
};

export type CustomerGender =
  | "未設定"
  | "男性"
  | "女性"
  | "その他";

export type CustomerAgeGroup =
  | "不明"
  | "20代以下"
  | "30代"
  | "40代"
  | "50代"
  | "60代以上";

export type SmokingStatus =
  | "不明"
  | "喫煙"
  | "禁煙";

export type Customer = {
  id: string;
  name: string;
  ageGroup: CustomerAgeGroup;
  birthMonth: number | null;
  birthDay: number | null;
  smokingStatus: SmokingStatus;
  gender: CustomerGender;
  assignedStaffIds: string[];
  bottleName: string;
  memo: string;
  createdAt: string;
  lastVisitAt: string | null;
  visitCount: number;
  visits: CustomerVisit[];
};

export type UserRole =
  | "ママ"
  | "店長"
  | "チーママ"
  | "MG"
  | "キャスト"
  | "ボーイ";

export type AppUser = {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  staffId?: string;
  enabled: boolean;
};

export type AuditLog = {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
};

export type ReservationStatus =
  | "予約"
  | "来店済み"
  | "キャンセル";

export type CalendarReservation = {
  id: string;
  date: string;
  time: string;
  customerId?: string;
  customerName: string;
  guestCount: number;
  assignedStaffIds: string[];
  memo: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReceivableCollection = {
  id: string;
  amount: number;
  chargedAmount: number;
  method: "現金" | "Squareカード" | "QR";
  collectedAt: string;
};

export type Receivable = {
  id: string;
  customerId: string;
  customerName: string;
  ticketId: string;
  originalAmount: number;
  createdAt: string;
  collections: ReceivableCollection[];
};

export type DrawerEntry = {
  id: string;
  type: "入金" | "出金";
  amount: number;
  note: string;
  createdAt: string;
};

export type BusinessSession = {
  businessDate: string;
  openedAt: string;
  openingAmount: number;
  entries: DrawerEntry[];
};

export type Ticket = TableTicket & {
  courseId: string;
  extensionCourseId?: string;
  courseTotal: number;

  // 追加
  customerCount: number; // お客様人数
  setPrice: number;      // 1名あたりのセット料金

  orders: OrderItem[];
  payments: Payment[];
  reservationEntries?: ReservationEntry[];
  customerId?: string;
  customerName?: string;
  memberUid?: string;
  memberName?: string;
  memberNo?: string;
};

export type ClosedTicket = Ticket & {
  closedAt: string;
};

export type BusinessReport = {
  id: string;
  businessDate: string;
  finalizedAt: string;
  totalSales: number;
  groupCount: number;
  guestCount: number;
  paymentTotals: {
    現金: number;
    Squareカード: number;
    QR: number;
    売掛: number;
  };
  categoryTotals: {
    セット: number;
    同伴: number;
    キャストドリンク: number;
    ショット: number;
    シャンパン: number;
    ボトル: number;
    イベント: number;
    単品: number;
  };
  ticketIds: string[];
  drawerOpeningAmount?: number;
  drawerCashSales?: number;
  drawerReceivableCollections?: number;
  drawerPayrollPayments?: number;
  drawerManualIn?: number;
  drawerManualOut?: number;
  drawerExpectedAmount?: number;
  drawerClosingAmount?: number;
  drawerDifference?: number;
  drawerEntries?: DrawerEntry[];
};

type PendingStaffSelection =
  | {
      mode: "single";
      purpose: "castDrink";
      product: Product;
    }
  | {
      mode: "multiple";
      purpose: "companion" | "castAdd" | "champagne";
      product: Product;
    }
  | null;

const seats: Seat[] = [
  { id: 1, name: "BOX1" },
  { id: 2, name: "BOX2" },
  { id: 3, name: "BOX3" },
  { id: 4, name: "カウンター1" },
  { id: 5, name: "カウンター2" },
  { id: 6, name: "カウンター3" },
  { id: 7, name: "カウンター4" },
];

const courses: Course[] = [
  { id: "normal", name: "通常セット", minutes: 60, price: 3000 },
  { id: "cocktail", name: "カクテルセット", minutes: 60, price: 3500 },
  { id: "single", name: "シングル", minutes: 60, price: 3500 },
  { id: "oneToOne", name: "マンツーマン", minutes: 60, price: 4000 },
  { id: "bottleKeep", name: "ボトルキープ", minutes: 90, price: 3500 },
  { id: "normal30", name: "30分セット", minutes: 30, price: 1500 },
  { id: "cocktail30", name: "30分セット", minutes: 30, price: 1750 },
  { id: "oneToOne30", name: "30分セット", minutes: 30, price: 2000 },

  { id: "set45", name: "45分セット", minutes: 45, price: 1750 },
];

const products: Product[] = [
  { id: "companion", name: "同伴", category: "同伴", price: 1000 },
  { id: "castAdd", name: "キャスト追加", category: "同伴", price: 1000 },
  { id: "castAdd30", name: "キャスト追加 ハーフ", category: "同伴", price: 500 },

  { id: "castDrink", name: "通常ドリンク", category: "キャストドリンク", price: 1000 },
  { id: "castJug", name: "ジョッキ", category: "キャストドリンク", price: 1500 },
  { id: "castMega", name: "メガ", category: "キャストドリンク", price: 4000 },
  { id: "castShot", name: "ショット", category: "キャストドリンク", price: 1500 },
  { id: "castAnejo", name: "アネホ", category: "キャストドリンク", price: 2500 },

  { id: "kleiner", name: "クライナー", category: "ショット", price: 800 },
  { id: "tequila", name: "テキーラ", category: "ショット", price: 1000 },
  { id: "tequilaRose", name: "テキーラローズ", category: "ショット", price: 1000 },
  { id: "zubrowka", name: "ズブロッカ", category: "ショット", price: 1000 },
  { id: "cocalero", name: "コカレロ", category: "ショット", price: 1200 },
  { id: "anejo", name: "アネホ", category: "ショット", price: 1800 },

  { id: "pompa", name: "ポンパ", category: "シャンパン", price: 8000 },
  { id: "mavam", name: "マバム", category: "シャンパン", price: 15000 },
  { id: "veuve", name: "ヴーヴ", category: "シャンパン", price: 30000 },
  { id: "moetNir", name: "モエニル", category: "シャンパン", price: 35000 },
  { id: "soumei", name: "ソウメイ", category: "シャンパン", price: 80000 },
  { id: "angel", name: "エンジェル", category: "シャンパン", price: 120000 },
  { id: "armand", name: "アルマンド", category: "シャンパン", price: 150000 },

  { id: "bottle3000", name: "ボトル 3,000円", category: "ボトル", price: 3000 },
  { id: "bottle3500", name: "ボトル 3,500円", category: "ボトル", price: 3500 },
  { id: "bottle4000", name: "ボトル 4,000円", category: "ボトル", price: 4000 },
  { id: "bottle5000", name: "ボトル 5,000円", category: "ボトル", price: 5000 },
  { id: "bottle6000", name: "ボトル 6,000円", category: "ボトル", price: 6000 },
  { id: "bottle7000", name: "ボトル 7,000円", category: "ボトル", price: 7000 },
  { id: "bottle10000", name: "ボトル 10,000円", category: "ボトル", price: 10000 },
  { id: "bottle12000", name: "ボトル 12,000円", category: "ボトル", price: 12000 },
  { id: "bottle25000", name: "ボトル 25,000円", category: "ボトル", price: 25000 },

  { id: "ferrisTequila", name: "テキーラ観覧車", category: "イベント", price: 25000 },
  { id: "ferrisKleiner", name: "クライナー観覧車", category: "イベント", price: 20000 },
  { id: "ferrisMix", name: "テキ×クライナー観覧車", category: "イベント", price: 23000 },
  { id: "ferrisSoft", name: "ソフトドリンク観覧車", category: "イベント", price: 10000 },
  { id: "heartTequila", name: "テキーラハート", category: "イベント", price: 50000 },
  { id: "heartKleiner", name: "クライナーハート", category: "イベント", price: 40000 },
  { id: "rouletteTequila", name: "テキーラルーレット", category: "イベント", price: 24000 },
  { id: "rouletteKleiner", name: "クライナールーレット", category: "イベント", price: 19000 },
  { id: "cocabombCola3", name: "コカボム コーラ 3段", category: "イベント", price: 9000 },
  { id: "cocabombCola4", name: "コカボム コーラ 4段", category: "イベント", price: 15000 },
  { id: "cocabombRedbull3", name: "コカボム レッドブル 3段", category: "イベント", price: 10000 },
  { id: "cocabombRedbull4", name: "コカボム レッドブル 4段", category: "イベント", price: 17000 },

  { id: "beer", name: "瓶ビール", category: "単品", price: 600 },
  { id: "nonAlcoholBeer", name: "ノンアルビール", category: "単品", price: 500 },
  { id: "cocktail600", name: "カクテル600", category: "単品", price: 600 },
  { id: "cocktail800", name: "カクテル800", category: "単品", price: 800 },
  { id: "softDrink", name: "ソフトドリンク", category: "単品", price: 400 },
  { id: "sake", name: "日本酒", category: "単品", price: 1500 },
  { id: "single150", name: "単品 150円", category: "単品", price: 150 },
  { id: "single200", name: "単品 200円", category: "単品", price: 200 },
  { id: "single250", name: "単品 250円", category: "単品", price: 250 },
  { id: "single300", name: "単品 300円", category: "単品", price: 300 },
  { id: "single350", name: "単品 350円", category: "単品", price: 350 },
  { id: "single400", name: "単品 400円", category: "単品", price: 400 },
  { id: "single450", name: "単品 450円", category: "単品", price: 450 },
  { id: "single500", name: "単品 500円", category: "単品", price: 500 },
  { id: "single550", name: "単品 550円", category: "単品", price: 550 },
  { id: "single600", name: "単品 600円", category: "単品", price: 600 },
  { id: "single650", name: "単品 650円", category: "単品", price: 650 },
  { id: "single700", name: "単品 700円", category: "単品", price: 700 },
  { id: "single750", name: "単品 750円", category: "単品", price: 750 },
  { id: "single800", name: "単品 800円", category: "単品", price: 800 },
];

const initialStaff: Staff[] = [
 { id: "masaki", name: "まさき", role: "ボーイ", hourlyWage: 1900, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "yuu", name: "ゆう", role: "キャスト", hourlyWage: 2600, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  
  { id: "azusa", name: "あずさ", role: "ママ", hourlyWage: 0, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "owner", name: "オーナー", role: "オーナー", hourlyWage: 0, paymentCycle: "当日日払い", clockIn: null, clockOut: null },

  { id: "meira", name: "めいら", role: "キャスト", hourlyWage: 2500, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "fumika", name: "ふみか", role: "キャスト", hourlyWage: 2400, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "nanami", name: "ななみ", role: "キャスト", hourlyWage: 2400, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "fuuka", name: "ふうか", role: "キャスト", hourlyWage: 2100, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "airi", name: "あいり", role: "キャスト", hourlyWage: 1900, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "rika", name: "りか", role: "キャスト", hourlyWage: 2000, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "soushi", name: "そうし", role: "ボーイ", hourlyWage: 1400, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "momo", name: "もも", role: "キャスト", hourlyWage: 1800, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "panchi", name: "ぱんち", role: "ボーイ", hourlyWage: 1400, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "takumi", name: "たくみ", role: "ボーイ", hourlyWage: 1400, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function getRoundedCurrentTime() {
  const now = new Date();
  const roundedMinutes = Math.ceil(now.getMinutes() / 5) * 5;

  if (roundedMinutes === 60) {
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
  } else {
    now.setMinutes(roundedMinutes, 0, 0);
  }

  return formatTime(now);
}

function timeStringToDate(time: string) {
  const date = new Date();
  const [hours, minutes] = time.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}


function getBusinessDate(value: Date) {
  const date = new Date(value);

  if (date.getHours() < 8) {
    date.setDate(date.getDate() - 1);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function createBusinessReport(
  businessDate: string,
  closedTickets: ClosedTicket[],
): BusinessReport {
  const targetTickets = closedTickets.filter(
    (ticket) =>
      getBusinessDate(new Date(ticket.closedAt)) ===
      businessDate,
  );

  const paymentTotals: Record<
  PaymentMethod,
  number
> = {
  現金: 0,
  Squareカード: 0,
  QR: 0,
  売掛: 0,
};

  const categoryTotals = {
    セット: 0,
    同伴: 0,
    キャストドリンク: 0,
    ショット: 0,
    シャンパン: 0,
    ボトル: 0,
    イベント: 0,
    単品: 0,
  };

  let totalSales = 0;
  let guestCount = 0;

  for (const ticket of targetTickets) {
    totalSales += ticket.total;
    guestCount += ticket.guests;
    categoryTotals.セット += ticket.courseTotal;

    for (const payment of ticket.payments) {
      paymentTotals[payment.method] += payment.amount;
    }

    for (const order of ticket.orders) {
      const amount = order.price * order.quantity;
      const id = order.productId;

      if (id === "companion") {
        categoryTotals.同伴 += amount;
      } else if (id.startsWith("cast")) {
        categoryTotals.キャストドリンク += amount;
      } else if (
        [
          "kleiner",
          "tequila",
          "tequilaRose",
          "zubrowka",
          "cocalero",
          "anejo",
        ].includes(id)
      ) {
        categoryTotals.ショット += amount;
      } else if (
        [
          "pompa",
          "mavam",
          "veuve",
          "moetNir",
          "soumei",
          "angel",
          "armand",
        ].includes(id)
      ) {
        categoryTotals.シャンパン += amount;
      } else if (id.startsWith("bottle")) {
        categoryTotals.ボトル += amount;
      } else if (
        id.startsWith("ferris") ||
        id.startsWith("heart") ||
        id.startsWith("roulette") ||
        id.startsWith("cocabomb")
      ) {
        categoryTotals.イベント += amount;
      } else {
        categoryTotals.単品 += amount;
      }
    }
  }

  return {
    id: createId(),
    businessDate,
    finalizedAt: new Date().toISOString(),
    totalSales,
    groupCount: targetTickets.length,
    guestCount,
    paymentTotals,
    categoryTotals,
    ticketIds: targetTickets.map((ticket) => ticket.id),
  };
}


const initialUsers: AppUser[] = [
  {
    id: "owner",
    name: "ママ",
    role: "ママ",
    pin: "0000",
    enabled: true,
  },
];

const storeMode: "moira" | "days" =
  process.env.NEXT_PUBLIC_STORE_MODE === "days" ? "days" : "moira";

type DeviceMode = "unknown" | "pos" | "management" | "readonly";

function detectDeviceMode(): DeviceMode {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const userAgent = navigator.userAgent ?? "";
  const platform = navigator.platform ?? "";

  const isIPad =
    /iPad/i.test(userAgent) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIPad) {
    return "pos";
  }

  if (/Windows/i.test(userAgent)) {
    return "management";
  }

  return "readonly";
}

function getOfflineStorageKey(isTestMode: boolean) {
  return `moira-pos-offline-state-v2-${storeMode}-${isTestMode ? "test" : "live"}`;
}

function makeFirestoreSafe<T>(value: T): T {
  // Firestore は undefined を含むオブジェクトを保存できないため、
  // JSON 化できる POS データから undefined のプロパティを除去します。
  return JSON.parse(JSON.stringify(value)) as T;
}

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [closedTickets, setClosedTickets] =
    useState<ClosedTicket[]>([]);
  const [businessReports, setBusinessReports] =
    useState<BusinessReport[]>([]);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const cloudStaffReadyRef = useRef(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [calendarReservations, setCalendarReservations] =
    useState<CalendarReservation[]>([]);
  const [paymentMode, setPaymentMode] =
  useState<"prepaid" | "checkout">("checkout");
    const [currentUserId, setCurrentUserId] = useState("owner");
  const [receivables, setReceivables] =
    useState<Receivable[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] =
    useState<PayrollAdjustment[]>([]);
  const [payrollPayments, setPayrollPayments] =
    useState<PayrollPayment[]>([]);
  const [businessSession, setBusinessSession] =
    useState<BusinessSession | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [hasMounted, setHasMounted] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [cloudSyncReady, setCloudSyncReady] = useState(false);
  const syncingRef = useRef(false);
  const lastCloudPayloadHashRef = useRef("");
  const squareCallbackHandledRef = useRef(false);
const [showInitialSync, setShowInitialSync] = useState(false);
const [initialSyncBusy, setInitialSyncBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [runtimeErrors, setRuntimeErrors] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<
    "読込中" | "保存済み" | "保存中" | "保存失敗"
  >("読込中");
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] =
    useState(false);
  const [modeReady, setModeReady] = useState(false);
  const [deviceMode, setDeviceMode] =
    useState<DeviceMode>("unknown");

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [showDailyReport, setShowDailyReport] =
    useState(false);
  const [showBusinessHistory, setShowBusinessHistory] =
    useState(false);
  const [showSalesAnalysis, setShowSalesAnalysis] =
    useState(false);
  const [showPayroll, setShowPayroll] = useState(false);
  const [showReservation, setShowReservation] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  const [showMemberManagement, setShowMemberManagement] =
  useState(false);
  const [showMemberList, setShowMemberList] =
    useState(false);
  const [showMemberCampaign, setShowMemberCampaign] =
    useState(false);
  const [showReservationCalendar, setShowReservationCalendar] =
    useState(false);
  const [showExtension, setShowExtension] = useState(false);
  const [showTicketEdit, setShowTicketEdit] =
  useState(false);
  const [showAdjustment, setShowAdjustment] =
  useState(false);
  const [showSeatMove, setShowSeatMove] = useState(false);
  const [showReceivables, setShowReceivables] =
    useState(false);
  const [showBackup, setShowBackup] =
    useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerCloseMode, setDrawerCloseMode] =
    useState(false);
  const [pendingEventProduct, setPendingEventProduct] =
    useState<Product | null>(null);
  const [pendingStaffSelection, setPendingStaffSelection] =
    useState<PendingStaffSelection>(null);

  const [selectedTicketId, setSelectedTicketId] =
    useState<string | null>(null);

  const [selectedSeatId, setSelectedSeatId] = useState(1);
  const [guestCount, setGuestCount] = useState(1);
  const [selectedCourseIndex, setSelectedCourseIndex] = useState(0);
  const [startTime, setStartTime] = useState(getRoundedCurrentTime());
  const [selectedCustomerId, setSelectedCustomerId] =
    useState("");

  const isPosTerminal = deviceMode === "pos";
  const isPcManagement = deviceMode === "management";

  useEffect(() => {
    setHasMounted(true);
    setDeviceMode(detectDeviceMode());
  }, []);

  useEffect(() => {
    if (
      !hasMounted ||
      !dataLoaded ||
      squareCallbackHandledRef.current
    ) {
      return;
    }

    const params = new URLSearchParams(
      window.location.search,
    );

    const squareData = params.get("square_data");
    const squareError = params.get("square_error");

    if (!squareData && !squareError) {
      return;
    }

    squareCallbackHandledRef.current = true;

    // URLに決済結果を残さない。
    window.history.replaceState(
      {},
      "",
      window.location.pathname,
    );

    if (squareError) {
      sessionStorage.removeItem(
        SQUARE_PENDING_STORAGE_KEY,
      );

      alert(
        `Squareから決済結果を受け取れませんでした。\n${squareError}`,
      );
      return;
    }

    try {
      const result = JSON.parse(
        squareData ?? "{}",
      ) as SquareCallbackResult;

      void handleSquarePaymentCallback(
        result,
      );
    } catch (error) {
      console.error(
        "Square決済結果の解析に失敗しました。",
        error,
      );

      sessionStorage.removeItem(
        SQUARE_PENDING_STORAGE_KEY,
      );

      alert(
        "Squareの決済結果を読み取れませんでした。",
      );
    }
  }, [hasMounted, dataLoaded]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineNotice("ネットワークに接続しました。同期を再開します。" );
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineNotice("オフラインです。ローカルに保存された内容を継続して使用できます。" );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  async function setupServiceWorker() {
    try {
      if (process.env.NODE_ENV === "development") {
        const registrations =
          await navigator.serviceWorker.getRegistrations();

        await Promise.all(
          registrations.map((registration) =>
            registration.unregister(),
          ),
        );

        return;
      }

      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.warn(
        "Service Worker setup failed",
        error,
      );
    }
  }

  void setupServiceWorker();
}, []);


  useEffect(() => {
    const storageKey = "moira-pos-mode";

    try {
      const storedValue = window.localStorage.getItem(storageKey);
      let restoredMode: unknown = storedValue;

      if (storedValue?.startsWith("{") || storedValue?.startsWith("[") || storedValue?.startsWith('"')) {
        try {
          const parsed = JSON.parse(storedValue) as unknown;
          restoredMode =
            parsed && typeof parsed === "object" && "mode" in parsed
              ? (parsed as { mode?: unknown }).mode
              : parsed;
        } catch (error) {
          console.warn("壊れた保存モードを削除しました。", error);
          window.localStorage.removeItem(storageKey);
          restoredMode = "live";
        }
      }

      if (restoredMode !== "test" && restoredMode !== "live" && restoredMode !== null) {
        window.localStorage.removeItem(storageKey);
        restoredMode = "live";
      }

      setIsTestMode(restoredMode === "test");
    } catch (error) {
      console.warn("保存モードを読み取れませんでした。通常モードで続行します。", error);
      setIsTestMode(false);
    } finally {
      setModeReady(true);
    }
  }, []);

  useEffect(() => {
    const describeError = (value: unknown) => {
      if (value instanceof Error) {
        return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
      }

      if (typeof value === "string") return value;

      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    };

    const handleError = (event: ErrorEvent) => {
      const location = event.filename
        ? `\n${event.filename}:${event.lineno}:${event.colno}`
        : "";
      setRuntimeErrors((current) => [
        ...current,
        `${describeError(event.error ?? event.message)}${location}`,
      ]);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      setRuntimeErrors((current) => [
        ...current,
        `Unhandled Promise Rejection:\n${describeError(event.reason)}`,
      ]);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  useEffect(() => {
    if (!modeReady) return;

    function normalizeSnapshot(saved: {
      tickets?: Ticket[];
      closedTickets?: ClosedTicket[];
      businessReports?: BusinessReport[];
      staff?: Staff[];
      payrollAdjustments?: PayrollAdjustment[];
      payrollPayments?: PayrollPayment[];
      customers?: Customer[];
      appUsers?: AppUser[];
      auditLogs?: AuditLog[];
      calendarReservations?: CalendarReservation[];
      currentUserId?: string;
      receivables?: Receivable[];
      businessSession?: BusinessSession | null;
    } | null) {
      return {
        tickets: Array.isArray(saved?.tickets) ? saved.tickets : [],
        closedTickets: Array.isArray(saved?.closedTickets) ? saved.closedTickets : [],
        businessReports: Array.isArray(saved?.businessReports) ? saved.businessReports : [],
       staff: (() => {
  
        const current: Staff[] =
  Array.isArray(saved?.staff) && saved.staff.length > 0
    ? (saved.staff as Staff[])
    : initialStaff;

  const extra: Staff[] = [
  {
    id: "azusa",
    name: "あずさ",
    role: "ママ",
    hourlyWage: 0,
    paymentCycle: "当日日払い",
    clockIn: null,
    clockOut: null,
  },
  {
    id: "owner",
    name: "オーナー",
    role: "オーナー",
    hourlyWage: 0,
    paymentCycle: "当日日払い",
    clockIn: null,
    clockOut: null,
  },
];

 const mergedStaff: Staff[] = [
  ...current,
  ...extra.filter(
    (s) => !current.some((c) => c.id === s.id),
  ),
];

return mergedStaff;
})(),
        payrollAdjustments: Array.isArray(saved?.payrollAdjustments) ? saved.payrollAdjustments : [],
        payrollPayments: Array.isArray(saved?.payrollPayments) ? saved.payrollPayments : [],
        customers: Array.isArray(saved?.customers)
          ? saved.customers.map((customer) => ({
              ...customer,
              ageGroup: customer.ageGroup ?? "不明",
              birthMonth: customer.birthMonth ?? null,
              birthDay: customer.birthDay ?? null,
              smokingStatus: customer.smokingStatus ?? "不明",
              gender: customer.gender ?? "未設定",
              assignedStaffIds: customer.assignedStaffIds ?? [],
            }))
          : [],
        appUsers: Array.isArray(saved?.appUsers) && saved.appUsers.length > 0 ? saved.appUsers : initialUsers,
        auditLogs: Array.isArray(saved?.auditLogs) ? saved.auditLogs : [],
        calendarReservations: Array.isArray(saved?.calendarReservations) ? saved.calendarReservations : [],
        currentUserId: typeof saved?.currentUserId === "string" && saved.currentUserId ? saved.currentUserId : "owner",
        receivables: Array.isArray(saved?.receivables) ? saved.receivables : [],
        businessSession: saved?.businessSession ?? null,
      };
    }

    setDataLoaded(false);
    setCanPersist(false);
    setLoadError(null);
    setSaveStatus("読込中");

    try {
      const storageKey = getOfflineStorageKey(isTestMode);
      let saved = loadOfflineSnapshot<Parameters<typeof normalizeSnapshot>[0]>(storageKey);

      // 旧版の保存データがあれば、初回だけ新しい店舗・モード別キーへ移行します。
      if (!saved) {
        saved = loadOfflineSnapshot<Parameters<typeof normalizeSnapshot>[0]>();
      }

      const nextSnapshot = normalizeSnapshot(saved);

      setTickets(nextSnapshot.tickets);
      setClosedTickets(nextSnapshot.closedTickets);
      setBusinessReports(nextSnapshot.businessReports);
      setStaff(nextSnapshot.staff);
      setPayrollAdjustments(nextSnapshot.payrollAdjustments);
      setPayrollPayments(nextSnapshot.payrollPayments);
      setCustomers(nextSnapshot.customers);
      setAppUsers(nextSnapshot.appUsers);
      setAuditLogs(nextSnapshot.auditLogs);
      setCalendarReservations(nextSnapshot.calendarReservations);
      setCurrentUserId(nextSnapshot.currentUserId);
      setReceivables(nextSnapshot.receivables);
      setBusinessSession(nextSnapshot.businessSession);
      setSelectedTicketId(null);

      saveOfflineSnapshot(
        { ...nextSnapshot, updatedAt: new Date().toISOString() },
        storageKey,
      );
      setCanPersist(true);
      setSaveStatus("保存済み");
    } catch (error) {
      console.error(error);
      setLoadError("iPad内の保存データを読み込めませんでした。再読み込みしてください。");
      setSaveStatus("保存失敗");
      setCanPersist(true);
    } finally {
      setDataLoaded(true);
    }
  }, [modeReady, isTestMode, loadAttempt]);

 useEffect(() => {
  if (
    !dataLoaded ||
    !canPersist ||
    isTestMode
  ) {
    return;
  }

  const staffDocument = doc(
    db,
    "stores",
    "moira",
    "shared",
    "staff",
  );

  const unsubscribe = onSnapshot(
    staffDocument,
    async (snapshot) => {
      if (!snapshot.exists()) {
        try {
          await setDoc(staffDocument, {
            staff,
            updatedAt:
              new Date().toISOString(),
          });

          cloudStaffReadyRef.current = true;
        } catch (error) {
          console.error(
            "初回のスタッフ保存に失敗しました。",
            error,
          );
        }

        return;
      }

      const data = snapshot.data();

      const cloudStaff = Array.isArray(
        data.staff,
      )
        ? (data.staff as Staff[])
        : [];

      if (cloudStaff.length > 0) {
        setStaff((current) => {
          const same =
            JSON.stringify(current) ===
            JSON.stringify(cloudStaff);

          return same ? current : cloudStaff;
        });
      }

      cloudStaffReadyRef.current = true;
    },
    (error) => {
      console.error(
        "スタッフの受信に失敗しました。",
        error,
      );
    },
  );

  return unsubscribe;
}, [
  dataLoaded,
  canPersist,
  isTestMode,
]);

useEffect(() => {
  if (
    !dataLoaded ||
    !canPersist ||
    isTestMode ||
    !cloudStaffReadyRef.current
  ) {
    return;
  }

  const timer = window.setTimeout(
    async () => {
      try {
        const staffDocument = doc(
          db,
          "stores",
          "moira",
          "shared",
          "staff",
        );

        await setDoc(
          staffDocument,
          {
            staff,
            updatedAt:
              new Date().toISOString(),
          },
          { merge: true },
        );
      } catch (error) {
        console.error(
          "スタッフのクラウド保存に失敗しました。",
          error,
        );
      }
    },
    500,
  );

  return () =>
    window.clearTimeout(timer);
}, [
  staff,
  dataLoaded,
  canPersist,
  isTestMode,
]);

useEffect(() => {
  if (!dataLoaded || !canPersist || isTestMode) {
    return;
  }

  const sharedDocument = doc(db, "shared", "main");

  const unsubscribe = onSnapshot(
    sharedDocument,
    
      (documentSnapshot) => {

  syncingRef.current = true;

  if (!documentSnapshot.exists()) {

  setCloudSyncReady(true);
  syncingRef.current = false;
  return;
}  

      const cloudData = documentSnapshot.data();

      if (Array.isArray(cloudData.tickets)) {
  setTickets(prev =>
    JSON.stringify(prev) === JSON.stringify(cloudData.tickets)
      ? prev
      : (cloudData.tickets as Ticket[])
  );
}

if (Array.isArray(cloudData.closedTickets)) {
  setClosedTickets(prev =>
    JSON.stringify(prev) === JSON.stringify(cloudData.closedTickets)
      ? prev
      : (cloudData.closedTickets as ClosedTicket[])
  );
}

if (Array.isArray(cloudData.businessReports)) {
  setBusinessReports(prev =>
    JSON.stringify(prev) === JSON.stringify(cloudData.businessReports)
      ? prev
      : (cloudData.businessReports as BusinessReport[])
  );
}

      if (Array.isArray(cloudData.payrollAdjustments)) {
        setPayrollAdjustments(
          cloudData.payrollAdjustments as PayrollAdjustment[],
        );
      }

      if (Array.isArray(cloudData.payrollPayments)) {
        setPayrollPayments(
          cloudData.payrollPayments as PayrollPayment[],
        );
      }

      if (Array.isArray(cloudData.customers)) {
        setCustomers(cloudData.customers as Customer[]);
      }

      if (Array.isArray(cloudData.appUsers)) {
        setAppUsers(cloudData.appUsers as AppUser[]);
      }

      if (Array.isArray(cloudData.auditLogs)) {
        setAuditLogs(cloudData.auditLogs as AuditLog[]);
      }

      if (Array.isArray(cloudData.calendarReservations)) {
        setCalendarReservations(
          cloudData.calendarReservations as CalendarReservation[],
        );
      }

      if (typeof cloudData.currentUserId === "string") {
        setCurrentUserId(cloudData.currentUserId);
      }

      if (Array.isArray(cloudData.receivables)) {
        setReceivables(
          cloudData.receivables as Receivable[],
        );
      }

      if (
        cloudData.businessSession === null ||
        typeof cloudData.businessSession === "object"
      ) {
        setBusinessSession(
          cloudData.businessSession as BusinessSession | null,
        );
      }

      if (
  cloudData.businessSession === null ||
  typeof cloudData.businessSession === "object"
) {
  setBusinessSession(
    cloudData.businessSession as BusinessSession | null,
  );
}

setCloudSyncReady(true);

setTimeout(() => {
  syncingRef.current = false;
}, 500);
    },
    (error) => {
      console.error(
        "Firestoreからの受信に失敗しました。",
        error,
      );
    },
  );

  return unsubscribe;
}, [
  dataLoaded,
  canPersist,
  isTestMode,
]);
useEffect(() => {
  if (
    syncingRef.current ||
    !dataLoaded ||
    !canPersist ||
    isTestMode ||
    !cloudSyncReady ||
    deviceMode === "unknown"
  ) {
    return;
  }

  const timer = window.setTimeout(async () => {
    const localSnapshot = {
      tickets,
      closedTickets,
      businessReports,
      staff,
      payrollAdjustments,
      payrollPayments,
      customers,
      appUsers,
      auditLogs,
      calendarReservations,
      currentUserId,
      receivables,
      businessSession,
      updatedAt: new Date().toISOString(),
    };

    const persisted = saveOfflineSnapshot(
      localSnapshot,
      getOfflineStorageKey(isTestMode),
    );

    if (!persisted) {
      console.warn("端末内バックアップの保存に失敗しました。");
    }

    // shared/main は店舗 iPad POS だけが書き込みます。
    // PC は Firestore を受信するだけなので、iPad の伝票を上書きしません。
    if (deviceMode !== "pos") {
      setSaveStatus("保存済み");
      return;
    }

    const cloudPayload = makeFirestoreSafe({
      tickets,
      closedTickets,
      businessReports,
      payrollAdjustments,
      payrollPayments,
      customers,
      appUsers,
      auditLogs,
      calendarReservations,
      currentUserId,
      receivables,
      businessSession,
    });

    const nextHash = JSON.stringify(cloudPayload);

    // 内容が前回の保存と同じなら Firestore に再書き込みしません。
    // updatedAt だけで保存表示が繰り返されるのを防ぎます。
    if (nextHash === lastCloudPayloadHashRef.current) {
      setSaveStatus("保存済み");
      return;
    }

    setSaveStatus("保存中");

    try {
      await setDoc(
        doc(db, "shared", "main"),
        {
          ...cloudPayload,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      lastCloudPayloadHashRef.current = nextHash;
      setSaveStatus("保存済み");

      if (!persisted) {
        setOfflineNotice(
          "クラウド保存は完了しました。端末内バックアップだけ保存できませんでした。",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      console.error("Firestoreへの保存に失敗しました。", error);
      setSaveStatus("保存失敗");
      setOfflineNotice(`Firestore保存エラー: ${message}`);
      setRuntimeErrors((current) => [
        ...current,
        `Firestore保存エラー: ${message}`,
      ]);
    }
  }, 300);

  return () => window.clearTimeout(timer);
}, [
  tickets,
  closedTickets,
  businessReports,
  staff,
  payrollAdjustments,
  payrollPayments,
  customers,
  appUsers,
  auditLogs,
  calendarReservations,
  currentUserId,
  receivables,
  businessSession,
  dataLoaded,
  canPersist,
  isTestMode,
  cloudSyncReady,
  deviceMode,
]);

  const occupiedSeatIds = useMemo(
    () => new Set(tickets.map((ticket) => ticket.seatId)),
    [tickets],
  );

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;

  const selectedCourse = courses[selectedCourseIndex];

  function calculateOrderTotal(ticket: Ticket) {
    return ticket.orders.reduce(
      (total, order) => total + order.price * order.quantity,
      0,
    );
  }

  function calculatePaidTotal(ticket: Ticket) {
    return ticket.payments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );
  }

  function calculateTicketTotal(ticket: Ticket) {
    return ticket.courseTotal + calculateOrderTotal(ticket);
  }

  function calculateMemberPointEligibleAmount(ticket: Ticket) {
    const orderTotalWithoutCashlessFees = ticket.orders.reduce(
      (total, order) =>
        order.productId.startsWith("cashless-fee-")
          ? total
          : total + order.price * order.quantity,
      0,
    );

    return Math.max(
      0,
      ticket.courseTotal + orderTotalWithoutCashlessFees,
    );
  }

  function calculateBalance(ticket: Ticket) {
    return Math.max(
      0,
      calculateTicketTotal(ticket) - calculatePaidTotal(ticket),
    );
  }
  function roundUp100(value: number) {
  return Math.ceil(value / 100) * 100;
}

function calculateAdditionalGuestPrice(
  courseMinutes: number,
  setPrice: number,
  remainingMinutes: number,
) {
  if (remainingMinutes < 5) return 0;

  if (courseMinutes >= 90) {
    if (remainingMinutes >= 61) return 3500;
    if (remainingMinutes >= 46) return 2400;
    if (remainingMinutes >= 31) return 1800;
    if (remainingMinutes >= 16) return 1200;
    return 600;
  }

  if (remainingMinutes >= 41) return setPrice;
  if (remainingMinutes >= 31) return roundUp100(setPrice * (2 / 3));
  if (remainingMinutes >= 21) return roundUp100(setPrice * (1 / 2));
  if (remainingMinutes >= 11) return roundUp100(setPrice * (1 / 3));

  return roundUp100(setPrice * (1 / 6));
}

  function refreshTicketAmounts(ticket: Ticket): Ticket {
    return {
      ...ticket,
      total: calculateTicketTotal(ticket),
      balance: calculateBalance(ticket),
    };
  }

  function createCurrentSnapshot() {
  return {
    tickets,
    closedTickets,
    businessReports,
    staff,
    payrollAdjustments,
    payrollPayments,
    customers,
    appUsers,
    auditLogs,
    calendarReservations,
    currentUserId,
    receivables,
    businessSession,
    updatedAt: new Date().toISOString(),
  };
}

  function requireIpadPos(action: string) {
    if (deviceMode === "pos") {
      return true;
    }

    const modeLabel =
      deviceMode === "management"
        ? "PC管理モード"
        : "閲覧モード";

    alert(
      `${modeLabel}では「${action}」は操作できません。\n店舗iPadのPOSから操作してください。`,
    );
    return false;
  }

  function openNewTicket() {

    if (!requireIpadPos("新規伝票")) return;

    const emptySeat = seats.find(
      (seat) => !occupiedSeatIds.has(seat.id),
    );

    if (!emptySeat) {
      alert("現在、すべての席が使用中です。");
      return;
    }

    setSelectedSeatId(emptySeat.id);
    setGuestCount(1);
    setSelectedCourseIndex(0);
    setStartTime(getRoundedCurrentTime());
    setSelectedCustomerId("");
    setShowNewTicket(true);
  }

  function createTicket() {

    if (!requireIpadPos("伝票開始")) return;

    if (occupiedSeatIds.has(selectedSeatId)) {
      alert("選択した席はすでに使用中です。");
      return;
    }

    const startDate = timeStringToDate(startTime);
    const endDate = addMinutes(startDate, selectedCourse.minutes);
    const courseTotal = selectedCourse.price * guestCount;

    const selectedCustomer = customers.find(
      (customer) => customer.id === selectedCustomerId,
    );

    const newTicket: Ticket = {
      id: createId(),
      seatId: selectedSeatId,
      guests: guestCount,
      courseId: selectedCourse.id,
      courseName: selectedCourse.name,
      startedAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      courseTotal,
      orders: [],
      payments: [],
      reservationEntries: [],
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      total: courseTotal,
      balance: courseTotal,
     customerCount: guestCount,
setPrice:
  guestCount > 0
    ? courseTotal / guestCount
    : courseTotal,
    };

    setTickets((current) => [...current, newTicket]);
    setShowNewTicket(false);
    setSelectedTicketId(newTicket.id);
  }

  function addPlainProduct(product: Product) {

    if (!requireIpadPos("注文追加")) return;

    if (!selectedTicket) return;

    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== selectedTicket.id) return ticket;

        const existingOrder = ticket.orders.find(
          (order) =>
            order.productId === product.id &&
            !order.assignedStaffIds?.length,
        );

        const orders = existingOrder
          ? ticket.orders.map((order) =>
              order.id === existingOrder.id
                ? { ...order, quantity: order.quantity + 1 }
                : order,
            )
          : [
              ...ticket.orders,
              {
                id: createId(),
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
              },
            ];

        return refreshTicketAmounts({ ...ticket, orders });
      }),
    );
  }

  function requestProduct(product: Product) {

    if (!requireIpadPos("注文追加")) return;

    if (product.id === "companion") {
  setShowOrder(false);
  setPendingStaffSelection({
    mode: "multiple",
    purpose: "companion",
    product,
  });
  return;
}

if (product.id.startsWith("castAdd")) {
  addPlainProduct(product);
  return;
}

    if (product.category === "キャストドリンク") {
      setShowOrder(false);
      setPendingStaffSelection({
        mode: "single",
        purpose: "castDrink",
        product,
      });
      return;
    }

    if (product.category === "シャンパン") {
      setShowOrder(false);
      setPendingStaffSelection({
        mode: "multiple",
        purpose: "champagne",
        product,
      });
      return;
    }

    if (product.category === "イベント") {
      setShowOrder(false);
      setPendingEventProduct(product);
      return;
    }

    addPlainProduct(product);
  }

  function registerAssignedProduct(staffIds: string[]) {

    if (!requireIpadPos("注文追加")) return;

    if (!selectedTicket || !pendingStaffSelection || staffIds.length === 0) {
      return;
    }

    const names = staff
      .filter((person) => staffIds.includes(person.id))
      .map((person) => person.name);

    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== selectedTicket.id) return ticket;

        if (pendingStaffSelection.purpose === "companion") {
          const otherOrders = ticket.orders.filter(
            (order) => order.productId !== "companion",
          );

          const companionOrder: OrderItem = {
            id: createId(),
            productId: "companion",
            name: `同伴（${names.join("・")}）`,
            price: 1000,
            quantity: staffIds.length,
            assignedStaffIds: staffIds,
          };

          return refreshTicketAmounts({
            ...ticket,
            orders: [...otherOrders, companionOrder],
          });
        }

        if (pendingStaffSelection.purpose === "champagne") {
          const order: OrderItem = {
            id: createId(),
            productId: pendingStaffSelection.product.id,
            name: `${pendingStaffSelection.product.name}（${names.join("・")}）`,
            price: pendingStaffSelection.product.price,
            quantity: 1,
            assignedStaffIds: staffIds,
          };

          return refreshTicketAmounts({
            ...ticket,
            orders: [...ticket.orders, order],
          });
        }

        const existingOrder = ticket.orders.find(
          (order) =>
            order.productId === pendingStaffSelection.product.id &&
            order.assignedStaffIds?.[0] === staffIds[0],
        );

        const orders = existingOrder
          ? ticket.orders.map((order) =>
              order.id === existingOrder.id
                ? { ...order, quantity: order.quantity + 1 }
                : order,
            )
          : [
              ...ticket.orders,
              {
                id: createId(),
                productId: pendingStaffSelection.product.id,
                name: `${pendingStaffSelection.product.name}（${names[0]}）`,
                price: pendingStaffSelection.product.price,
                quantity: 1,
                assignedStaffIds: [staffIds[0]],
              },
            ];

        return refreshTicketAmounts({ ...ticket, orders });
      }),
    );

    setPendingStaffSelection(null);
  }

  function registerEventOrder(
    eventCups: Record<string, number>,
    representativeStaffId: string | null,
  ) {

    if (!requireIpadPos("イベント注文")) return;

    if (!selectedTicket || !pendingEventProduct) return;

    const staffIds = Object.entries(eventCups)
      .filter(([, cups]) => cups > 0)
      .map(([staffId]) => staffId);

    if (staffIds.length === 0) {
      alert("飲んだスタッフと杯数を入力してください。");
      return;
    }

    const names = staff
      .filter((person) => staffIds.includes(person.id))
      .map((person) => person.name);

    const order: OrderItem = {
      id: createId(),
      productId: pendingEventProduct.id,
      name: `${pendingEventProduct.name}（${names.join("・")}）`,
      price: pendingEventProduct.price,
      quantity: 1,
      assignedStaffIds: staffIds,
      eventCups,
      representativeStaffId: representativeStaffId ?? undefined,
    };

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? refreshTicketAmounts({
              ...ticket,
              orders: [...ticket.orders, order],
            })
          : ticket,
      ),
    );

    setPendingEventProduct(null);
  }
function addGuestToSelectedTicket(addCount = 1) {
  if (!requireIpadPos("お客様追加")) return;

  if (!selectedTicket || addCount <= 0) {
    return;
  }

  const now = Date.now();
  const endTime = new Date(selectedTicket.endAt).getTime();

  const remainingMinutes = Math.max(
    Math.ceil((endTime - now) / 60000),
    0,
  );

  const courseMinutes = Math.round(
    (new Date(selectedTicket.endAt).getTime() -
      new Date(selectedTicket.startedAt).getTime()) /
      60000,
  );

  const additionalPricePerPerson =
    calculateAdditionalGuestPrice(
      courseMinutes,
      selectedTicket.setPrice,
      remainingMinutes,
    );

  if (additionalPricePerPerson <= 0) {
    const shouldAdd = window.confirm(
      "残り時間が5分未満のため、追加セット料金は0円です。\nお客様数だけ追加しますか？",
    );

    if (!shouldAdd) {
      return;
    }
  }

  const additionalOrder: OrderItem = {
    id: createId(),
    productId: "additional-guest-set",
    name: `途中追加セット（${addCount}名・残り${remainingMinutes}分）`,
    price: additionalPricePerPerson,
    quantity: addCount,
    assignedStaffIds: [],
  };

  setTickets((current) =>
    current.map((ticket) =>
      ticket.id === selectedTicket.id
        ? refreshTicketAmounts({
            ...ticket,
            guests: ticket.guests + addCount,
            customerCount:
              (ticket.customerCount ?? ticket.guests) +
              addCount,
            orders:
              additionalPricePerPerson > 0
                ? [...ticket.orders, additionalOrder]
                : ticket.orders,
          })
        : ticket,
    ),
  );
}

  function saveReservationEntries(
    entries: ReservationEntry[],
  ) {

    if (!requireIpadPos("伝票の予約登録")) return;

    if (!selectedTicket) {
      return;
    }

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? {
              ...ticket,
              reservationEntries: entries,
            }
          : ticket,
      ),
    );

    setShowReservation(false);
  }

  function changeOrderQuantity(orderId: string, amount: number) {

    if (!requireIpadPos("注文数変更")) return;

    if (!selectedTicket) return;

    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== selectedTicket.id) return ticket;

        const orders = ticket.orders
          .map((order) =>
            order.id === orderId
              ? { ...order, quantity: order.quantity + amount }
              : order,
          )
          .filter((order) => order.quantity > 0);

        return refreshTicketAmounts({ ...ticket, orders });
      }),
    );
  }

  function addPayrollAdjustment(
    staffId: string,
    type: PayrollAdjustmentType,
    quantity: number,
  ) {

    if (!requireIpadPos("給与調整")) return;

    if (quantity <= 0) {
      return;
    }

    const unitAmount =
      type === "予約" ? 300 : 500;

    const adjustment: PayrollAdjustment = {
      id: createId(),
      staffId,
      type,
      quantity,
      unitAmount,
      createdAt: new Date().toISOString(),
    };

    setPayrollAdjustments((current) => [
      ...current,
      adjustment,
    ]);
  }

  function deletePayrollAdjustment(adjustmentId: string) {

    if (!requireIpadPos("給与調整の削除")) return;

    setPayrollAdjustments((current) =>
      current.filter((item) => item.id !== adjustmentId),
    );
  }

  function registerPayrollPayment(
    staffId: string,
    amount: number,
    note: string,
  ) {

    if (!requireIpadPos("給与支払い")) return;

    if (amount <= 0) {
      alert("支払額を入力してください。");
      return;
    }

    const payment: PayrollPayment = {
      id: createId(),
      staffId,
      amount,
      paidAt: new Date().toISOString(),
      note,
    };

    setPayrollPayments((current) => [
      ...current,
      payment,
    ]);
  }

  function deletePayrollPayment(paymentId: string) {

    if (!requireIpadPos("給与支払いの取消")) return;

    if (!window.confirm("この給与支払いを取り消しますか？")) {
      return;
    }

    setPayrollPayments((current) =>
      current.filter((item) => item.id !== paymentId),
    );
  }

  async function handleSquarePaymentCallback(
    result: SquareCallbackResult,
  ) {
    const requestId =
      result.state?.trim();

    if (!requestId) {
      alert(
        "Square決済の照合IDを受け取れませんでした。伝票は変更していません。",
      );
      return;
    }

    const pendingRef = doc(
      db,
      SQUARE_PENDING_COLLECTION,
      requestId,
    );

    try {
      const pendingSnapshot =
        await getDoc(pendingRef);

      if (!pendingSnapshot.exists()) {
        alert(
          "Square決済の待機データが見つかりませんでした。決済自体はSquare履歴で確認してください。",
        );
        return;
      }

      const pending =
        pendingSnapshot.data() as
          PendingSquarePayment & {
            status?: string;
          };

      if (
        result.status !== "ok" ||
        result.error_code
      ) {
        await setDoc(
          pendingRef,
          {
            status: "canceled",
            errorCode:
              result.error_code ??
              "payment_canceled",
            callbackAt:
              new Date().toISOString(),
          },
          { merge: true },
        );

        sessionStorage.removeItem(
          SQUARE_PENDING_STORAGE_KEY,
        );

        alert(
          `Square決済は完了していません。\\n${
            result.error_code ??
            "キャンセル"
          }`,
        );
        return;
      }

      type SquareFinalizeResult = {
        alreadyProcessed: boolean;
        autoClosed: boolean;
        paidTicket: Ticket | ClosedTicket | null;
        closedTicket: ClosedTicket | null;
        nextTickets: Ticket[];
        nextClosedTickets: ClosedTicket[];
        nextCustomers: Customer[];
      };

      const finalizeResult =
        await runTransaction(
          db,
          async (
            transaction,
          ): Promise<SquareFinalizeResult> => {
            const latestPending =
              await transaction.get(
                pendingRef,
              );

            const sharedRef = doc(
              db,
              "shared",
              "main",
            );

            const sharedSnapshot =
              await transaction.get(
                sharedRef,
              );

            if (
              !latestPending.exists()
            ) {
              throw new Error(
                "square-pending-not-found",
              );
            }

            if (
              !sharedSnapshot.exists()
            ) {
              throw new Error(
                "shared-main-not-found",
              );
            }

            const pendingData =
              latestPending.data() as
                PendingSquarePayment & {
                  status?: string;
                };

            const sharedData =
              sharedSnapshot.data();

            const currentTickets =
              Array.isArray(
                sharedData.tickets,
              )
                ? (sharedData.tickets as Ticket[])
                : [];

            const currentClosedTickets =
              Array.isArray(
                sharedData.closedTickets,
              )
                ? (sharedData.closedTickets as ClosedTicket[])
                : [];

            const currentCustomers =
              Array.isArray(
                sharedData.customers,
              )
                ? (sharedData.customers as Customer[])
                : [];

            const alreadyClosed =
              currentClosedTickets.find(
                (ticket) =>
                  ticket.id ===
                  pendingData.ticketId,
              ) ?? null;

            if (
              pendingData.status ===
                "processed" ||
              alreadyClosed
            ) {
              transaction.set(
                pendingRef,
                {
                  status: "processed",
                  transactionId:
                    result.transaction_id ??
                    null,
                  clientTransactionId:
                    result.client_transaction_id ??
                    null,
                  processedAt:
                    new Date().toISOString(),
                  autoClosed:
                    Boolean(
                      alreadyClosed,
                    ),
                },
                { merge: true },
              );

              return {
                alreadyProcessed: true,
                autoClosed:
                  Boolean(alreadyClosed),
                paidTicket:
                  alreadyClosed,
                closedTicket:
                  alreadyClosed,
                nextTickets:
                  currentTickets,
                nextClosedTickets:
                  currentClosedTickets,
                nextCustomers:
                  currentCustomers,
              };
            }

            const targetTicket =
              currentTickets.find(
                (ticket) =>
                  ticket.id ===
                  pendingData.ticketId,
              );

            if (!targetTicket) {
              throw new Error(
                "square-ticket-not-found",
              );
            }

            const duplicatePayment =
              targetTicket.payments.some(
                (payment) =>
                  payment.squareRequestId ===
                    requestId ||
                  Boolean(
                    result.transaction_id &&
                      payment.squareTransactionId ===
                        result.transaction_id,
                  ),
              );

            let paidTicket =
              targetTicket;

            if (!duplicatePayment) {
              const payment: Payment = {
                id: requestId,
                method:
                  pendingData.method,
                amount:
                  pendingData.chargedAmount,
                appliedAmount:
                  pendingData.baseAmount,
                surchargeAmount:
                  pendingData.surchargeAmount,
                discountAmount:
                  pendingData.discountAmount,
                squareRequestId:
                  requestId,
                squareTransactionId:
                  result.transaction_id,
                squareClientTransactionId:
                  result.client_transaction_id,
                paidAt:
                  new Date().toISOString(),
              };

              const discountOrder =
                pendingData.discountAmount >
                0
                  ? {
                      id: createId(),
                      productId:
                        `service-discount-${payment.id}`,
                      name:
                        "サービス割引",
                      price:
                        -pendingData.discountAmount,
                      quantity: 1,
                    }
                  : null;

              const surchargeOrder =
                pendingData.surchargeAmount >
                0
                  ? {
                      id: createId(),
                      productId:
                        `cashless-fee-${payment.id}`,
                      name:
                        "キャッシュレス手数料10％",
                      price:
                        pendingData.surchargeAmount,
                      quantity: 1,
                    }
                  : null;

              paidTicket =
                refreshTicketAmounts({
                  ...targetTicket,
                  orders: [
                    ...targetTicket.orders,
                    ...(discountOrder
                      ? [discountOrder]
                      : []),
                    ...(surchargeOrder
                      ? [surchargeOrder]
                      : []),
                  ],
                  payments: [
                    ...targetTicket.payments,
                    payment,
                  ],
                });
            }

            const remainingBalance =
              calculateBalance(
                paidTicket,
              );

            const autoClosed =
              remainingBalance <= 0;

            let closedTicket:
              | ClosedTicket
              | null = null;

            let nextTickets =
              currentTickets.map(
                (ticket) =>
                  ticket.id ===
                  paidTicket.id
                    ? paidTicket
                    : ticket,
              );

            let nextClosedTickets =
              currentClosedTickets;

            let nextCustomers =
              currentCustomers;

            if (autoClosed) {
              const closedAt =
                new Date().toISOString();

              closedTicket = {
                ...paidTicket,
                closedAt,
              };

              nextTickets =
                currentTickets.filter(
                  (ticket) =>
                    ticket.id !==
                    paidTicket.id,
                );

              nextClosedTickets = [
                ...currentClosedTickets,
                closedTicket,
              ];

              if (
                paidTicket.customerId
              ) {
                nextCustomers =
                  currentCustomers.map(
                    (customer) => {
                      if (
                        customer.id !==
                        paidTicket.customerId
                      ) {
                        return customer;
                      }

                      const alreadyVisited =
                        customer.visits?.some(
                          (visit) =>
                            visit.id ===
                            paidTicket.id,
                        );

                      if (
                        alreadyVisited
                      ) {
                        return customer;
                      }

                      const visit: CustomerVisit =
                        {
                          id:
                            paidTicket.id,
                          visitedAt:
                            closedAt,
                          ticketTotal:
                            paidTicket.total,
                          guestCount:
                            paidTicket.guests,
                          courseName:
                            paidTicket.courseName,
                        };

                      return {
                        ...customer,
                        lastVisitAt:
                          closedAt,
                        visitCount:
                          customer.visitCount +
                          1,
                        visits: [
                          ...customer.visits,
                          visit,
                        ],
                      };
                    },
                  );
              }
            }

            transaction.set(
              sharedRef,
              makeFirestoreSafe({
                tickets:
                  nextTickets,
                closedTickets:
                  nextClosedTickets,
                customers:
                  nextCustomers,
                updatedAt:
                  new Date().toISOString(),
              }),
              { merge: true },
            );

            transaction.set(
              pendingRef,
              {
                status:
                  "processed",
                transactionId:
                  result.transaction_id ??
                  null,
                clientTransactionId:
                  result.client_transaction_id ??
                  null,
                processedAt:
                  new Date().toISOString(),
                autoClosed,
              },
              { merge: true },
            );

            return {
              alreadyProcessed: false,
              autoClosed,
              paidTicket,
              closedTicket,
              nextTickets,
              nextClosedTickets,
              nextCustomers,
            };
          },
        );

      setTickets(
        finalizeResult.nextTickets,
      );
      setClosedTickets(
        finalizeResult.nextClosedTickets,
      );
      setCustomers(
        finalizeResult.nextCustomers,
      );

      sessionStorage.removeItem(
        SQUARE_PENDING_STORAGE_KEY,
      );

      if (
        finalizeResult.autoClosed &&
        finalizeResult.closedTicket
      ) {
        setSelectedTicketId(null);

        if (
          finalizeResult.closedTicket
            .memberUid
        ) {
          try {
            const pointResult =
              await creditMemberCheckoutPoints(
                finalizeResult.closedTicket,
              );

            await setDoc(
              pendingRef,
              {
                memberPointStatus:
                  "credited",
                memberPoint:
                  pointResult.totalPoint,
                memberPointUpdatedAt:
                  new Date().toISOString(),
              },
              { merge: true },
            );
          } catch (error) {
            console.error(
              "Square会計後の会員ポイント付与に失敗しました。",
              error,
            );

            await setDoc(
              pendingRef,
              {
                memberPointStatus:
                  "pending",
                memberPointError:
                  error instanceof Error
                    ? error.message
                    : String(error),
                memberPointUpdatedAt:
                  new Date().toISOString(),
              },
              { merge: true },
            );

            alert(
              "Square決済と会計済み保存は完了しました。会員ポイントだけ付与できなかったため、あとで再確認してください。",
            );
            return;
          }
        }

        alert(
          `Square決済が完了しました。\\n${formatYen(
            pending.chargedAmount,
          )}\\n\\n伝票を会計済みにして履歴へ保存しました。`,
        );
        return;
      }

      setSelectedTicketId(
        pending.ticketId,
      );

      alert(
        `Square決済が完了しました。\\n${formatYen(
          pending.chargedAmount,
        )}\\n\\n残額があるため伝票は営業中のままです。`,
      );
    } catch (error) {
      console.error(
        "Square決済結果のPOS反映に失敗しました。",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      alert(
        "Square決済結果をPOSへ反映できませんでした。\\n" +
          "Square側の決済履歴は消えません。\\n\\n" +
          `エラー: ${message}`,
      );
    }
  }

  async function startSquarePayment(
    ticket: Ticket,
    baseAmount: number,
    discountAmount: number,
    method: "Squareカード" | "QR",
  ) {
    const applicationId =
      process.env
        .NEXT_PUBLIC_SQUARE_APPLICATION_ID;

    if (!applicationId) {
      alert(
        "Square Application IDが設定されていません。Vercelの環境変数を確認してください。",
      );
      return;
    }

    const surchargeAmount =
      Math.ceil(baseAmount * 0.1);

    const chargedAmount =
      baseAmount +
      surchargeAmount;

    const requestId = createId();

    const pending: PendingSquarePayment = {
      requestId,
      ticketId: ticket.id,
      method,
      baseAmount,
      discountAmount,
      surchargeAmount,
      chargedAmount,
      createdAt:
        new Date().toISOString(),
    };

    try {
      // ブラウザ/PWA間でsessionStorageが共有されなくても
      // Square決済結果を確実に照合できるよう、開始前にFirestoreへ保存。
      await setDoc(
        doc(
          db,
          SQUARE_PENDING_COLLECTION,
          requestId,
        ),
        makeFirestoreSafe({
          ...pending,
          status: "pending",
          seatId: ticket.seatId,
          memberUid:
            ticket.memberUid,
          memberName:
            ticket.memberName,
          createdAt:
            new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.error(
        "Square決済待機データの保存に失敗しました。",
        error,
      );

      alert(
        "Square決済の準備を保存できませんでした。通信状況を確認してもう一度お試しください。",
      );
      return;
    }

    // 同じブラウザへ戻った場合の予備保存。
    sessionStorage.setItem(
      SQUARE_PENDING_STORAGE_KEY,
      JSON.stringify(pending),
    );

    const seatName =
      seats.find(
        (seat) =>
          seat.id === ticket.seatId,
      )?.name ??
      `席${ticket.seatId}`;

    const data = {
      amount_money: {
        amount: String(
          Math.round(chargedAmount),
        ),
        currency_code: "JPY",
      },
      callback_url:
        SQUARE_CALLBACK_URL,
      client_id: applicationId,
      version: "1.3",
      state: requestId,
      notes: `Moira POS / ${seatName} / ${
        method === "QR"
          ? "QRコード決済"
          : "カード・電子マネー"
      }`,
      options: {
        supported_tender_types:
          method === "QR"
            ? ["PAYPAY"]
            : ["CREDIT_CARD"],
        clear_default_fees: true,
        auto_return: true,
        skip_receipt: false,
      },
    };

    const squareUrl =
      "square-commerce-v1://payment/create?data=" +
      encodeURIComponent(
        JSON.stringify(data),
      );

    setShowPayment(false);

    window.location.href =
      squareUrl;
  }

  function registerPayment(
    method: PaymentMethod,
    baseAmount: number,
    discountAmount: number,
    receivedAmount?: number,
    changeAmount?: number,
  ) {
    if (!requireIpadPos("会計")) {
      return;
    }

    if (!selectedTicket) {
      return;
    }

    const currentBalance =
      calculateBalance(
        selectedTicket,
      );

    if (
      baseAmount <= 0 ||
      baseAmount > currentBalance
    ) {
      alert(
        "支払額を確認してください。",
      );
      return;
    }

    if (
      method === "売掛" &&
      (!selectedTicket.customerId ||
        !selectedTicket.customerName)
    ) {
      alert(
        "売掛を登録するには、伝票にお客様を設定してください。",
      );
      return;
    }

    // カード・電子マネー・QRはすべてSquare POSで処理。
    // Squareで成功するまではMoira POS側を支払い済みにしない。
    if (
      method === "Squareカード" ||
      method === "QR"
    ) {
      void startSquarePayment(
        selectedTicket,
        baseAmount,
        discountAmount,
        method,
      );
      return;
    }

    const isCashless = false;

    const surchargeAmount =
      isCashless
        ? Math.ceil(
            baseAmount * 0.1,
          )
        : 0;

    const chargedAmount =
      baseAmount +
      surchargeAmount;

    const payment: Payment = {
      id: createId(),
      method,
      amount: chargedAmount,
      appliedAmount: baseAmount,
      surchargeAmount,
      receivedAmount:
        method === "現金"
          ? receivedAmount
          : undefined,
      changeAmount:
        method === "現金"
          ? changeAmount
          : undefined,
      discountAmount,
      paidAt:
        new Date().toISOString(),
    };

    const discountOrder =
      discountAmount > 0
        ? {
            id: createId(),
            productId:
              `service-discount-${payment.id}`,
            name:
              "サービス割引",
            price:
              -discountAmount,
            quantity: 1,
          }
        : null;

    setTickets((current) =>
      current.map((ticket) => {
        if (
          ticket.id !==
          selectedTicket.id
        ) {
          return ticket;
        }

        const surchargeOrder =
          surchargeAmount > 0
            ? {
                id: createId(),
                productId:
                  `cashless-fee-${payment.id}`,
                name:
                  "キャッシュレス手数料10％",
                price:
                  surchargeAmount,
                quantity: 1,
              }
            : null;

        return refreshTicketAmounts({
          ...ticket,
          orders: [
            ...ticket.orders,
            ...(discountOrder
              ? [discountOrder]
              : []),
            ...(surchargeOrder
              ? [surchargeOrder]
              : []),
          ],
          payments: [
            ...ticket.payments,
            payment,
          ],
        });
      }),
    );

    if (
      method === "売掛" &&
      selectedTicket.customerId &&
      selectedTicket.customerName
    ) {
      const receivable: Receivable = {
        id: createId(),
        customerId:
          selectedTicket.customerId,
        customerName:
          selectedTicket.customerName,
        ticketId:
          selectedTicket.id,
        originalAmount: baseAmount,
        createdAt:
          new Date().toISOString(),
        collections: [],
      };

      setReceivables(
        (current) => [
          ...current,
          receivable,
        ],
      );
    }

    setShowPayment(false);
  }

  function deleteLastPayment() {

    if (!requireIpadPos("支払い取消")) return;

    if (!selectedTicket || selectedTicket.payments.length === 0) return;
    if (!window.confirm("直前の支払いを取り消しますか？")) return;

    const lastPayment =
      selectedTicket.payments[
        selectedTicket.payments.length - 1
      ];

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? refreshTicketAmounts({
              ...ticket,
              orders: ticket.orders.filter(
                (order) =>
                  order.productId !==
                    `cashless-fee-${lastPayment.id}` &&
                  order.productId !==
                    `service-discount-${lastPayment.id}`,
              ),
              payments: ticket.payments.slice(0, -1),
            })
          : ticket,
      ),
    );

    if (lastPayment.method === "売掛") {
      setReceivables((current) =>
        current.filter(
          (item) =>
            item.ticketId !== selectedTicket.id ||
            item.originalAmount !==
              (lastPayment.appliedAmount ??
                lastPayment.amount),
        ),
      );
    }
  }

  function moveSelectedTicket(newSeatId: number) {

    if (!requireIpadPos("席移動")) return;

    if (!selectedTicket) {
      return;
    }

    const occupied = tickets.some(
      (ticket) =>
        ticket.seatId === newSeatId &&
        ticket.id !== selectedTicket.id,
    );

    if (occupied) {
      alert("選択した席は使用中です。");
      return;
    }

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? {
              ...ticket,
              seatId: newSeatId,
            }
          : ticket,
      ),
    );

    setShowSeatMove(false);
  }

  function collectReceivable(
    receivableId: string,
    amount: number,
    method: "現金" | "Squareカード" | "QR",
  ) {

    if (!requireIpadPos("売掛入金")) return;

    if (amount <= 0) {
      alert("入金額を入力してください。");
      return;
    }

    setReceivables((current) =>
      current.map((item) => {
        if (item.id !== receivableId) {
          return item;
        }

        const collected = item.collections.reduce(
          (total, collection) =>
            total + collection.amount,
          0,
        );

        const remaining =
          item.originalAmount - collected;

        if (amount > remaining) {
          alert("売掛残高を超えています。");
          return item;
        }

        const isCashless =
          method === "Squareカード" ||
          method === "QR";

        const chargedAmount = isCashless
          ? amount + Math.ceil(amount * 0.1)
          : amount;

        const collection: ReceivableCollection = {
          id: createId(),
          amount,
          chargedAmount,
          method,
          collectedAt: new Date().toISOString(),
        };

        return {
          ...item,
          collections: [
            ...item.collections,
            collection,
          ],
        };
      }),
    );
  }

  function deleteReceivableCollection(
    receivableId: string,
    collectionId: string,
  ) {

    if (!requireIpadPos("売掛入金の取消")) return;

    if (!window.confirm("この入金を取り消しますか？")) {
      return;
    }

    setReceivables((current) =>
      current.map((item) =>
        item.id === receivableId
          ? {
              ...item,
              collections: item.collections.filter(
                (collection) =>
                  collection.id !== collectionId,
              ),
            }
          : item,
      ),
    );
  }

  function changeSelectedCourse(
  nextCourseId: string,
) {

    if (!requireIpadPos("セット変更")) return;

  if (!selectedTicket) {
    return;
  }

  const currentCourse = courses.find(
    (course) =>
      course.id === selectedTicket.courseId,
  );

  const nextCourse = courses.find(
    (course) => course.id === nextCourseId,
  );

  if (
    !currentCourse ||
    !nextCourse ||
    currentCourse.id === nextCourse.id
  ) {
    return;
  }

  const difference =
    nextCourse.price - currentCourse.price;

  setTickets((current) =>
    current.map((ticket) => {
      if (ticket.id !== selectedTicket.id) {
        return ticket;
      }

      const changeOrder: OrderItem = {
        id: createId(),
        productId: `course-change-${createId()}`,
        name: `セット変更 ${currentCourse.name}→${nextCourse.name}`,
        price: difference,
        quantity: 1,
      };

      return refreshTicketAmounts({
        ...ticket,
        courseId: nextCourse.id,
        orders:
          difference === 0
            ? ticket.orders
            : [...ticket.orders, changeOrder],
      });
    }),
  );

  setShowTicketEdit(false);
}

function changeExtensionCourse(
  nextCourseId: string,
) {

  if (!requireIpadPos("延長セット変更")) return;

  if (!selectedTicket) {
    return;
  }

  setTickets((current) =>
    current.map((ticket) =>
      ticket.id === selectedTicket.id
        ? {
            ...ticket,
            extensionCourseId:
              nextCourseId === ticket.courseId
                ? undefined
                : nextCourseId,
          }
        : ticket,
    ),
  );
}
function registerAdjustment(
  type:
    | "service"
    | "amountDiscount"
    | "percentDiscount",
  amount: number,
  reason: string,
  percent?: number,
) {
  if (!requireIpadPos("サービス・割引")) return;

  if (!selectedTicket) {
    return;
  }

  const adjustmentName =
    type === "service"
      ? `サービス（${reason}）`
      : type === "amountDiscount"
        ? `金額割引（${reason}）`
        : `${percent ?? 0}％割引（${reason}）`;

  const adjustmentOrder: OrderItem = {
    id: createId(),
    productId: `adjustment-${type}-${createId()}`,
    name: adjustmentName,
    price: -amount,
    quantity: 1,
  };

  setTickets((current) =>
    current.map((ticket) =>
      ticket.id === selectedTicket.id
        ? refreshTicketAmounts({
            ...ticket,
            orders: [
              ...ticket.orders,
              adjustmentOrder,
            ],
          })
        : ticket,
    ),
  );

  recordAudit(
    "追加",
    "サービス・割引",
    `${adjustmentName} -${formatYen(amount)}`,
  );

  setShowAdjustment(false);
  setShowTicketEdit(false);
}
  function linkMemberToTicket(
    ticketId: string,
    member: MemberTicketLink,
  ) {
    if (!requireIpadPos("会員連携")) {
      return false;
    }

    const targetTicket = tickets.find(
      (ticket) => ticket.id === ticketId,
    );

    if (!targetTicket) {
      alert("対象の伝票が見つかりません。");
      return false;
    }

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              memberUid: member.uid,
              memberName: member.name,
              memberNo: member.memberNo,
            }
          : ticket,
      ),
    );

    const seatName =
      seats.find((seat) => seat.id === targetTicket.seatId)?.name ??
      `席${targetTicket.seatId}`;

    recordAudit(
      "連携",
      "会員",
      `${member.name ?? member.memberNo ?? member.uid} / ${seatName}`,
    );

    return true;
  }

  function applyMemberCouponToTicket(
    ticketId: string,
    coupon: MemberCouponApplication,
  ) {
    if (!requireIpadPos("会員クーポン値引き")) {
      return false;
    }

    const targetTicket = tickets.find(
      (ticket) => ticket.id === ticketId,
    );

    if (!targetTicket) {
      alert("対象の伝票が見つかりません。");
      return false;
    }

    if (targetTicket.payments.length > 0) {
      alert(
        "支払い登録後の伝票にはクーポンを適用できません。支払いを取り消してから使用してください。",
      );
      return false;
    }

    if (
      targetTicket.orders.some((order) =>
        order.productId.startsWith("member-coupon-"),
      )
    ) {
      alert("この伝票にはすでに会員クーポンが適用されています。");
      return false;
    }

    const currentTotal = calculateTicketTotal(targetTicket);
    const discountAmount = Math.min(
      Math.max(0, Math.floor(coupon.discountAmount)),
      Math.max(0, currentTotal),
    );

    if (discountAmount <= 0) {
      alert("値引きできる金額がありません。");
      return false;
    }

    const couponOrder: OrderItem = {
      id: createId(),
      productId: `member-coupon-${coupon.userCouponId}`,
      name: `🎟 ${coupon.title}`,
      price: -discountAmount,
      quantity: 1,
    };

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? refreshTicketAmounts({
              ...ticket,
              orders: [...ticket.orders, couponOrder],
            })
          : ticket,
      ),
    );

    const seatName =
      seats.find((seat) => seat.id === targetTicket.seatId)?.name ??
      `席${targetTicket.seatId}`;

    recordAudit(
      "使用",
      "会員クーポン",
      `${coupon.title} -${formatYen(discountAmount)} / ${seatName}`,
    );

    return true;
  }

  function addExtension(minutes: number, price: number) {
    if (!requireIpadPos("延長")) return;

    if (!selectedTicket) {
      return;
    }

    const label = `${minutes}分延長`;
    const productId = `extension-${minutes}-${price}`;

    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== selectedTicket.id) {
          return ticket;
        }

        const existing = ticket.orders.find(
          (order) => order.productId === productId,
        );

        const orders = existing
          ? ticket.orders.map((order) =>
              order.id === existing.id
                ? {
                    ...order,
                    quantity: order.quantity + 1,
                  }
                : order,
            )
          : [
              ...ticket.orders,
              {
                id: createId(),
                productId,
                name: label,
                price,
                quantity: 1,
              },
            ];

        return refreshTicketAmounts({
          ...ticket,
          endAt: addMinutes(
            new Date(ticket.endAt),
            minutes,
          ).toISOString(),
          orders,
        });
      }),
    );
  }

  async function creditMemberCheckoutPoints(ticket: Ticket) {
    if (!ticket.memberUid) {
      return {
        credited: false,
        alreadyCredited: false,
        totalPoint: 0,
        salesPoint: 0,
        eligibleAmount: 0,
      };
    }

    const eligibleAmount =
      calculateMemberPointEligibleAmount(ticket);
    const salesPoint = Math.floor(eligibleAmount / 100);
    const visitPoint = 30;
    const totalPoint = visitPoint + salesPoint;

    const memberRef = doc(
      memberDb,
      "users",
      ticket.memberUid,
    );
    const visitRef = doc(
      memberDb,
      "visitHistory",
      ticket.id,
    );
    const visitPointLogRef = doc(
      memberDb,
      "pointLogs",
      `visit-${ticket.id}`,
    );
    const salesPointLogRef = doc(
      memberDb,
      "pointLogs",
      `sales-${ticket.id}`,
    );

    let alreadyCredited = false;

    await runTransaction(memberDb, async (transaction) => {
      const memberSnapshot =
        await transaction.get(memberRef);
      const visitSnapshot =
        await transaction.get(visitRef);

      if (!memberSnapshot.exists()) {
        throw new Error("member-not-found");
      }

      if (visitSnapshot.exists()) {
        alreadyCredited = true;
        return;
      }

      transaction.update(memberRef, {
        point: increment(totalPoint),
        visitCount: increment(1),
        lastVisitAt: serverTimestamp(),
      });

      transaction.set(visitPointLogRef, {
        uid: ticket.memberUid,
        point: visitPoint,
        detail: "来店ポイント",
        ticketId: ticket.id,
        createdAt: serverTimestamp(),
      });

      if (salesPoint > 0) {
        transaction.set(salesPointLogRef, {
          uid: ticket.memberUid,
          point: salesPoint,
          detail: `会計ポイント ${eligibleAmount.toLocaleString("ja-JP")}円`,
          ticketId: ticket.id,
          createdAt: serverTimestamp(),
        });
      }

      transaction.set(visitRef, {
        uid: ticket.memberUid,
        amount: eligibleAmount,
        point: totalPoint,
        ticketId: ticket.id,
        visitedAt: serverTimestamp(),
      });
    });

    return {
      credited: !alreadyCredited,
      alreadyCredited,
      totalPoint,
      salesPoint,
      eligibleAmount,
    };
  }

  async function finishTicket() {

    if (!requireIpadPos("伝票終了")) return;

    if (!selectedTicket) return;

    const balance = calculateBalance(selectedTicket);

    if (balance > 0) {
      alert(`未会計残高が${formatYen(balance)}あります。`);
      return;
    }

    const pointEligibleAmount =
      calculateMemberPointEligibleAmount(selectedTicket);
    const expectedSalesPoint =
      Math.floor(pointEligibleAmount / 100);
    const expectedTotalPoint =
      selectedTicket.memberUid
        ? 30 + expectedSalesPoint
        : 0;

    const confirmMessage = selectedTicket.memberUid
      ? `会計済みとして伝票を終了しますか？\n\n` +
        `${selectedTicket.memberName ?? "会員"}様へ ` +
        `来店30pt＋会計${expectedSalesPoint}pt（合計${expectedTotalPoint}pt）を自動付与します。`
      : "会計済みとして伝票を終了しますか？";

    if (!window.confirm(confirmMessage)) return;

    if (selectedTicket.memberUid) {
      try {
        const pointResult =
          await creditMemberCheckoutPoints(selectedTicket);

        if (pointResult.credited) {
          alert(
            `${selectedTicket.memberName ?? "会員"}様へ ` +
              `${pointResult.totalPoint}ptを自動付与しました。`,
          );
        }
      } catch (error) {
        console.error(
          "会員の来店・会計ポイント自動付与に失敗しました。",
          error,
        );

        const message =
          error instanceof Error ? error.message : "";

        alert(
          message === "member-not-found"
            ? "連携した会員情報が見つかりません。会員QRを読み直してください。"
            : "会員ポイントの自動付与に失敗したため、伝票終了を中止しました。通信状況を確認してもう一度お試しください。",
        );

        return;
      }
    }

    const closedAt = new Date().toISOString();

    const closedTicket: ClosedTicket = {
      ...selectedTicket,
      closedAt,
    };

    if (selectedTicket.customerId) {
      setCustomers((current) =>
        current.map((customer) => {
          if (
            customer.id !== selectedTicket.customerId
          ) {
            return customer;
          }

          const visit: CustomerVisit = {
            id: createId(),
            visitedAt: closedAt,
            ticketTotal: selectedTicket.total,
            guestCount: selectedTicket.guests,
            courseName: selectedTicket.courseName,
          };

          return {
            ...customer,
            lastVisitAt: closedAt,
            visitCount: customer.visitCount + 1,
            visits: [...customer.visits, visit],
          };
        }),
      );
    }

    setClosedTickets((current) => [
      ...current,
      closedTicket,
    ]);

    setTickets((current) =>
      current.filter((ticket) => ticket.id !== selectedTicket.id),
    );

    setSelectedTicketId(null);
  }

  function recordAudit(
    action: string,
    target: string,
    detail: string,
  ) {
    const user =
      appUsers.find(
        (item) => item.id === currentUserId,
      ) ?? initialUsers[0];

    const log: AuditLog = {
      id: createId(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      target,
      detail,
      createdAt: new Date().toISOString(),
    };

    setAuditLogs((current) => [
      log,
      ...current,
    ].slice(0, 5000));
  }

  function saveCustomer(
    customer: {
      name: string;
      ageGroup: CustomerAgeGroup;
      birthMonth: number | null;
      birthDay: number | null;
      smokingStatus: SmokingStatus;
      gender: CustomerGender;
      assignedStaffIds: string[];
      bottleName: string;
      memo: string;
    },
    customerId?: string,
  ) {

    if (!requireIpadPos("顧客の追加・編集")) return;

    if (customerId) {
      setCustomers((current) =>
        current.map((item) =>
          item.id === customerId
            ? {
                ...item,
                name: customer.name,
                ageGroup: customer.ageGroup,
                birthMonth: customer.birthMonth,
                birthDay: customer.birthDay,
                smokingStatus:
                  customer.smokingStatus,
                gender: customer.gender,
                assignedStaffIds:
                  customer.assignedStaffIds,
                bottleName: customer.bottleName,
                memo: customer.memo,
              }
            : item,
        ),
      );
      recordAudit(
        "更新",
        "顧客",
        `${customer.name}の顧客情報を更新`,
      );
      return;
    }

    const newCustomer: Customer = {
      id: createId(),
      name: customer.name,
      ageGroup: customer.ageGroup,
      birthMonth: customer.birthMonth,
      birthDay: customer.birthDay,
      smokingStatus:
        customer.smokingStatus,
      gender: customer.gender,
      assignedStaffIds:
        customer.assignedStaffIds,
      bottleName: customer.bottleName,
      memo: customer.memo,
      createdAt: new Date().toISOString(),
      lastVisitAt: null,
      visitCount: 0,
      visits: [],
    };

    setCustomers((current) => [
      ...current,
      newCustomer,
    ]);

    recordAudit(
      "追加",
      "顧客",
      `${customer.name}を顧客登録`,
    );
  }

  function deleteCustomer(customerId: string) {

    if (!requireIpadPos("顧客削除")) return;

    const isInUse = tickets.some(
      (ticket) => ticket.customerId === customerId,
    );

    if (isInUse) {
      alert(
        "使用中の伝票で選択されているため削除できません。",
      );
      return;
    }

    const target = customers.find(
      (customer) => customer.id === customerId,
    );

    setCustomers((current) =>
      current.filter(
        (customer) => customer.id !== customerId,
      ),
    );

    recordAudit(
      "削除",
      "顧客",
      `${target?.name ?? customerId}を削除`,
    );
  }

  function loginUser(userId: string) {
    const user = appUsers.find(
      (item) => item.id === userId && item.enabled,
    );

    if (!user) {
      alert("有効なユーザーが見つかりません。");
      return;
    }

    setCurrentUserId(userId);

    const log: AuditLog = {
      id: createId(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "ログイン",
      target: "ユーザー",
      detail: `${user.name}がログイン`,
      createdAt: new Date().toISOString(),
    };

    setAuditLogs((current) => [log, ...current].slice(0, 5000));
  }

  function saveAppUser(user: AppUser) {

    if (!requireIpadPos("POSユーザー管理")) return;

    const exists = appUsers.some(
      (item) => item.id === user.id,
    );

    setAppUsers((current) =>
      exists
        ? current.map((item) =>
            item.id === user.id ? user : item,
          )
        : [...current, user],
    );

    recordAudit(
      exists ? "更新" : "追加",
      "ユーザー",
      `${user.name}（${user.role}）`,
    );
  }

  function deleteAppUser(userId: string) {

    if (!requireIpadPos("POSユーザー削除")) return;

    if (userId === "owner") {
      alert("初期ママユーザーは削除できません。");
      return;
    }

    const target = appUsers.find(
      (user) => user.id === userId,
    );

    setAppUsers((current) =>
      current.filter((user) => user.id !== userId),
    );

    if (currentUserId === userId) {
      setCurrentUserId("owner");
    }

    recordAudit(
      "削除",
      "ユーザー",
      `${target?.name ?? userId}を削除`,
    );
  }

  function saveCalendarReservation(
    reservation: CalendarReservation,
  ) {

    if (!requireIpadPos("予約の追加・編集")) return;

    const exists = calendarReservations.some(
      (item) => item.id === reservation.id,
    );

    setCalendarReservations((current) =>
      exists
        ? current.map((item) =>
            item.id === reservation.id
              ? reservation
              : item,
          )
        : [...current, reservation],
    );

    recordAudit(
      exists ? "更新" : "追加",
      "予約",
      `${reservation.date} ${reservation.time} ${reservation.customerName} ${reservation.guestCount}名`,
    );
  }

  function deleteCalendarReservation(
    reservationId: string,
  ) {

    if (!requireIpadPos("予約削除")) return;

    const target = calendarReservations.find(
      (item) => item.id === reservationId,
    );

    setCalendarReservations((current) =>
      current.filter((item) => item.id !== reservationId),
    );

    recordAudit(
      "削除",
      "予約",
      target
        ? `${target.date} ${target.time} ${target.customerName}`
        : reservationId,
    );
  }

  function switchDataMode() {
    const nextMode = isTestMode ? "live" : "test";
    const label =
      nextMode === "test"
        ? "テストモード"
        : "本番モード";

    const confirmed = window.confirm(
      `${label}へ切り替えます。\n画面を再読み込みします。`,
    );

    if (!confirmed) {
      return;
    }

    try {
      window.localStorage.setItem("moira-pos-mode", nextMode);
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("ブラウザの保存領域を利用できないため、モードを切り替えられませんでした。");
    }
  }

  async function resetCurrentData() {

    if (!requireIpadPos("データ消去")) return;

    const modeLabel = isTestMode
      ? "テストデータ"
      : "本番データ";

    const firstConfirm = window.confirm(
      `${modeLabel}をすべて削除します。\n\n伝票・会計履歴・日報・顧客・売掛・給与・ドロア履歴が消えます。`,
    );

    if (!firstConfirm) {
      return;
    }

    const typed = window.prompt(
      `削除を実行するには「削除」と入力してください。`,
      "",
    );

    if (typed !== "削除") {
      alert("削除を中止しました。");
      return;
    }

    try {
      clearOfflineSnapshot(getOfflineStorageKey(isTestMode));

      setTickets([]);
      setClosedTickets([]);
      setBusinessReports([]);
      setStaff(initialStaff);
      setPayrollAdjustments([]);
      setPayrollPayments([]);
      setCustomers([]);
      setAppUsers(initialUsers);
      setAuditLogs([]);
      setCalendarReservations([]);
      setCurrentUserId("owner");
      setReceivables([]);
      setBusinessSession(null);
      setSelectedTicketId(null);
      clearOfflineSnapshot();
      saveOfflineSnapshot(
        {
          tickets: [],
          closedTickets: [],
          businessReports: [],
          staff: initialStaff,
          payrollAdjustments: [],
          payrollPayments: [],
          customers: [],
          appUsers: initialUsers,
          auditLogs: [],
          calendarReservations: [],
          currentUserId: "owner",
          receivables: [],
          businessSession: null,
          updatedAt: new Date().toISOString(),
        },
        getOfflineStorageKey(isTestMode),
      );
      setSaveStatus("保存済み");

      alert(
        `${modeLabel}を初期化しました。`,
      );
    } catch (error) {
      console.error(error);
      alert(
        "データの初期化に失敗しました。",
      );
    }
  }

  function createBackup() {
    const backupData = {
      format: "moira-pos-backup",
      version: 1,
      createdAt: new Date().toISOString(),
      data: {
        tickets,
        closedTickets,
        businessReports,
        staff,
        payrollAdjustments,
        payrollPayments,
        customers,
        appUsers,
        auditLogs,
        calendarReservations,
        currentUserId,
        receivables,
        businessSession,
      },
    };

    const blob = new Blob(
      [JSON.stringify(backupData, null, 2)],
      { type: "application/json" },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const now = new Date();
    const filename = `moira-pos-backup-${now
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function restoreBackup(rawBackup: unknown) {

    if (!requireIpadPos("バックアップ復元")) return;

    if (
      typeof rawBackup !== "object" ||
      rawBackup === null
    ) {
      throw new Error("バックアップ形式が正しくありません。");
    }

    const backup = rawBackup as {
      format?: string;
      version?: number;
      data?: {
        tickets?: Ticket[];
        closedTickets?: ClosedTicket[];
        businessReports?: BusinessReport[];
        staff?: Staff[];
        payrollAdjustments?: PayrollAdjustment[];
        payrollPayments?: PayrollPayment[];
        customers?: Customer[];
        appUsers?: AppUser[];
        auditLogs?: AuditLog[];
        calendarReservations?: CalendarReservation[];
        currentUserId?: string;
        receivables?: Receivable[];
        businessSession?: BusinessSession | null;
      };
    };

    if (
      backup.format !== "moira-pos-backup" ||
      !backup.data
    ) {
      throw new Error(
        "Moira POSのバックアップファイルではありません。",
      );
    }

    const data = backup.data;

    if (
      !Array.isArray(data.tickets) ||
      !Array.isArray(data.closedTickets) ||
      !Array.isArray(data.businessReports) ||
      !Array.isArray(data.staff) ||
      !Array.isArray(data.payrollAdjustments) ||
      !Array.isArray(data.payrollPayments) ||
      !Array.isArray(data.customers) ||
      !Array.isArray(data.receivables)
    ) {
      throw new Error(
        "バックアップ内のデータが不足しています。",
      );
    }

    setTickets(data.tickets);
    setClosedTickets(data.closedTickets);
    setBusinessReports(data.businessReports);
    setStaff(data.staff);
    setPayrollAdjustments(data.payrollAdjustments);
    setPayrollPayments(data.payrollPayments);
    setCustomers(
      data.customers.map((customer) => ({
        ...customer,
        ageGroup: customer.ageGroup ?? "不明",
        birthMonth: customer.birthMonth ?? null,
        birthDay: customer.birthDay ?? null,
        smokingStatus:
          customer.smokingStatus ?? "不明",
        assignedStaffIds:
          customer.assignedStaffIds ?? [],
      })),
    );
    setAppUsers(
      Array.isArray(data.appUsers) && data.appUsers.length > 0
        ? data.appUsers
        : initialUsers,
    );
    setAuditLogs(
      Array.isArray(data.auditLogs) ? data.auditLogs : [],
    );
    setCalendarReservations(
      Array.isArray(data.calendarReservations)
        ? data.calendarReservations
        : [],
    );
    setCurrentUserId(data.currentUserId ?? "owner");
    setReceivables(data.receivables);
    setBusinessSession(data.businessSession ?? null);
    setSelectedTicketId(null);
    setShowBackup(false);
    setSaveStatus("保存中");
  }

  function getBusinessCashFigures(session: BusinessSession) {
    const date = session.businessDate;

    const cashSales = closedTickets
      .filter(
        (ticket) =>
          getBusinessDate(new Date(ticket.closedAt)) === date,
      )
      .flatMap((ticket) => ticket.payments)
      .filter((payment) => payment.method === "現金")
      .reduce((total, payment) => total + payment.amount, 0);

    const receivableCollections = receivables
      .flatMap((item) => item.collections)
      .filter(
        (collection) =>
          collection.method === "現金" &&
          getBusinessDate(new Date(collection.collectedAt)) === date,
      )
      .reduce((total, collection) => total + collection.amount, 0);

    const payrollOut = payrollPayments
      .filter(
        (payment) =>
          getBusinessDate(new Date(payment.paidAt)) === date,
      )
      .reduce((total, payment) => total + payment.amount, 0);

    const manualIn = session.entries
      .filter((entry) => entry.type === "入金")
      .reduce((total, entry) => total + entry.amount, 0);

    const manualOut = session.entries
      .filter((entry) => entry.type === "出金")
      .reduce((total, entry) => total + entry.amount, 0);

    const expected =
      session.openingAmount +
      cashSales +
      receivableCollections +
      manualIn -
      payrollOut -
      manualOut;

    return {
      cashSales,
      receivableCollections,
      payrollOut,
      manualIn,
      manualOut,
      expected,
    };
  }

  function startBusinessDay(openingAmount: number) {

    if (!requireIpadPos("営業開始")) return;

    if (businessSession) {
      alert("すでに営業開始済みです。");
      return;
    }

    setBusinessSession({
      businessDate: getBusinessDate(new Date()),
      openedAt: new Date().toISOString(),
      openingAmount,
      entries: [],
    });
    setShowDrawer(false);
    recordAudit(
      "開始",
      "営業",
      `開始ドロア ${formatYen(openingAmount)}`,
    );
    alert("営業を開始しました。");
  }

  function addDrawerEntry(
    type: "入金" | "出金",
    amount: number,
    note: string,
  ) {

    if (!requireIpadPos("ドロア入出金")) return;

    if (!businessSession || amount <= 0) return;

    const entry: DrawerEntry = {
      id: createId(),
      type,
      amount,
      note: note.trim() || (type === "入金" ? "その他入金" : "買い物・その他出金"),
      createdAt: new Date().toISOString(),
    };

    setBusinessSession((current) =>
      current
        ? { ...current, entries: [...current.entries, entry] }
        : current,
    );
  }

  function deleteDrawerEntry(entryId: string) {

    if (!requireIpadPos("ドロア入出金の削除")) return;

    if (!window.confirm("このドロア記録を取り消しますか？")) return;
    setBusinessSession((current) =>
      current
        ? {
            ...current,
            entries: current.entries.filter((entry) => entry.id !== entryId),
          }
        : current,
    );
  }

  function closeBusinessDay(closingAmount: number) {

    if (!requireIpadPos("営業終了")) return;

    if (!businessSession) {
      alert("先に営業開始をしてください。");
      return;
    }

    if (tickets.length > 0) {
      alert(
        `使用中の伝票が${tickets.length}件あります。すべて会計終了してから営業終了してください。`,
      );
      return;
    }

    const businessDate = businessSession.businessDate;
    const alreadyFinalized = businessReports.some(
      (report) => report.businessDate === businessDate,
    );

    if (alreadyFinalized) {
      alert("本日の営業日報はすでに確定済みです。");
      return;
    }

    const baseReport = createBusinessReport(businessDate, closedTickets);
    const drawer = getBusinessCashFigures(businessSession);
    const difference = closingAmount - drawer.expected;

    const report: BusinessReport = {
      ...baseReport,
      drawerOpeningAmount: businessSession.openingAmount,
      drawerCashSales: drawer.cashSales,
      drawerReceivableCollections: drawer.receivableCollections,
      drawerPayrollPayments: drawer.payrollOut,
      drawerManualIn: drawer.manualIn,
      drawerManualOut: drawer.manualOut,
      drawerExpectedAmount: drawer.expected,
      drawerClosingAmount: closingAmount,
      drawerDifference: difference,
      drawerEntries: businessSession.entries,
    };

    const confirmed = window.confirm(
      `${businessDate}営業分を確定します。\
\
売上：${formatYen(
        report.totalSales,
      )}\
ドロア予定：${formatYen(drawer.expected)}\
実際：${formatYen(
        closingAmount,
      )}\
過不足：${difference >= 0 ? "+" : ""}${formatYen(
        difference,
      )}`,
    );

    if (!confirmed) return;

    setBusinessReports((current) => [...current, report]);
    recordAudit(
      "終了",
      "営業",
      `${businessDate} 売上${formatYen(report.totalSales)} 過不足${formatYen(difference)}`,
    );
    setBusinessSession(null);
    setShowDrawer(false);
    setDrawerCloseMode(false);
    alert("営業日報を確定しました。");
  }

  function businessTimeToIso(
    businessTime: string,
    anchorIso?: string | null,
  ) {
    const [businessHour, minute] =
      businessTime.split(":").map(Number);

    // 既存の出勤記録がある修正では、その記録の営業日を基準にする。
    // 例：8/8 21:00出勤を翌日にPCで25:00退勤へ修正しても、
    //     8/9 01:00として正しく保存される。
    const anchor =
      anchorIso && !Number.isNaN(new Date(anchorIso).getTime())
        ? new Date(anchorIso)
        : new Date();

    const baseDate = new Date(anchor);

    if (anchor.getHours() < 12) {
      baseDate.setDate(baseDate.getDate() - 1);
    }

    baseDate.setHours(0, 0, 0, 0);

    if (businessHour >= 24) {
      baseDate.setDate(baseDate.getDate() + 1);
      baseDate.setHours(
        businessHour - 24,
        minute,
        0,
        0,
      );
    } else {
      baseDate.setHours(
        businessHour,
        minute,
        0,
        0,
      );
    }

    return baseDate.toISOString();
  }

  function canEditAttendance(action: string) {
    if (
      deviceMode === "pos" ||
      deviceMode === "management"
    ) {
      return true;
    }

    alert(
      `閲覧モードでは「${action}」は操作できません。`,
    );
    return false;
  }

  function clockIn(
    staffId: string,
    businessTime: string,
  ) {
    if (!canEditAttendance("出勤時刻の登録・修正")) {
      return;
    }

    setStaff((current) =>
      current.map((person) => {
        if (person.id !== staffId) {
          return person;
        }

        const nextClockIn =
          businessTimeToIso(
            businessTime,
            person.clockIn,
          );

        if (deviceMode === "management") {
          recordAudit(
            "修正",
            "勤怠",
            `${person.name} 出勤 ${businessTime}`,
          );
        }

        return {
          ...person,
          clockIn: nextClockIn,
          // 出勤時刻を修正する時、すでに退勤記録があれば残す。
          // 新規出勤の場合だけ退勤を未登録へ戻す。
          clockOut:
            person.clockIn === null
              ? null
              : person.clockOut,
        };
      }),
    );
  }

  function clockOut(
    staffId: string,
    businessTime: string,
  ) {
    if (!canEditAttendance("退勤時刻の登録・修正")) {
      return;
    }

    setStaff((current) =>
      current.map((person) => {
        if (person.id !== staffId) {
          return person;
        }

        if (!person.clockIn) {
          alert(
            `${person.name}さんは出勤時刻が未登録です。先に出勤時刻を保存してください。`,
          );
          return person;
        }

        const nextClockOut =
          businessTimeToIso(
            businessTime,
            person.clockIn,
          );

        const clockInMs =
          new Date(person.clockIn).getTime();

        const clockOutMs =
          new Date(nextClockOut).getTime();

        if (clockOutMs < clockInMs) {
          alert(
            "退勤時刻が出勤時刻より前になっています。時刻を確認してください。",
          );
          return person;
        }

        if (deviceMode === "management") {
          recordAudit(
            "修正",
            "勤怠",
            `${person.name} 退勤 ${businessTime}`,
          );
        }

        return {
          ...person,
          clockOut: nextClockOut,
        };
      }),
    );
  }

  function updateStaff(
    staffId: string,
    hourlyWage: number,
    paymentCycle: PaymentCycle,
  ) {
    setStaff((current) =>
      current.map((person) =>
        person.id === staffId
          ? { ...person, hourlyWage, paymentCycle }
          : person,
      ),
    );

    alert("スタッフ設定を保存しました。");
  }

  function addTemporaryStaff(
    name: string,
    role: StaffRole,
    hourlyWage: number,
    paymentCycle: PaymentCycle,
  ) {
    const newStaff: Staff = {
      id: createId(),
      name,
      role,
      hourlyWage,
      paymentCycle,
      clockIn: null,
      clockOut: null,
    };

    setStaff((current) => [...current, newStaff]);
  }

  const canViewPayroll = true;

  const workingCount = staff.filter(
    (person) => person.clockIn !== null && person.clockOut === null,
  ).length;

  const salesAnalysis = useMemo(() => {
    const categoryTotals = {
      セット: 0,
      同伴: 0,
      キャストドリンク: 0,
      ショット: 0,
      シャンパン: 0,
      ボトル: 0,
      イベント: 0,
      単品: 0,
    };

    const paymentTotals: Record<
  PaymentMethod,
  number
> = {
  現金: 0,
  Squareカード: 0,
  QR: 0,
  売掛: 0,
};

    const staffRows = staff.map((person) => ({
      staffId: person.id,
      name: person.name,
      role: person.role,
      attributedSales: 0,
      drinkCount: 0,
      champagneCount: 0,
      companionCount: 0,
      reservationCount: 0,
      eventCount: 0,
    }));

    const staffMap = new Map(
      staffRows.map((row) => [row.staffId, row]),
    );

    const dailyMap = new Map<
      string,
      {
        businessDate: string;
        sales: number;
        groupCount: number;
        guestCount: number;
      }
    >();

    let totalSales = 0;
    let totalGuests = 0;

    for (const ticket of closedTickets) {
      totalSales += ticket.total;
      totalGuests += ticket.guests;
      categoryTotals.セット += ticket.courseTotal;

      const businessDate = getBusinessDate(
        new Date(ticket.closedAt),
      );

      const daily = dailyMap.get(businessDate) ?? {
        businessDate,
        sales: 0,
        groupCount: 0,
        guestCount: 0,
      };

      daily.sales += ticket.total;
      daily.groupCount += 1;
      daily.guestCount += ticket.guests;
      dailyMap.set(businessDate, daily);

      for (const payment of ticket.payments) {
        paymentTotals[payment.method] += payment.amount;
      }

      for (const entry of ticket.reservationEntries ?? []) {
        const row = staffMap.get(entry.staffId);

        if (row) {
          row.reservationCount += entry.quantity;
        }
      }

      for (const order of ticket.orders) {
        const amount = order.price * order.quantity;
        const productId = order.productId;
        const assignedIds = order.assignedStaffIds ?? [];

        if (productId === "companion") {
          categoryTotals.同伴 += amount;

          for (const staffId of assignedIds) {
            const row = staffMap.get(staffId);

            if (row) {
              row.companionCount += 1;
            }
          }
        } else if (productId.startsWith("cast")) {
          categoryTotals.キャストドリンク += amount;

          for (const staffId of assignedIds) {
            const row = staffMap.get(staffId);

            if (row) {
              row.drinkCount += order.quantity;
            }
          }
        } else if (
          [
            "kleiner",
            "tequila",
            "tequilaRose",
            "zubrowka",
            "cocalero",
            "anejo",
          ].includes(productId)
        ) {
          categoryTotals.ショット += amount;
        } else if (
          [
            "pompa",
            "mavam",
            "veuve",
            "moetNir",
            "soumei",
            "angel",
            "armand",
          ].includes(productId)
        ) {
          categoryTotals.シャンパン += amount;

          for (const staffId of assignedIds) {
            const row = staffMap.get(staffId);

            if (row) {
              row.champagneCount += order.quantity;
            }
          }
        } else if (productId.startsWith("bottle")) {
          categoryTotals.ボトル += amount;
        } else if (
          productId.startsWith("ferris") ||
          productId.startsWith("heart") ||
          productId.startsWith("roulette") ||
          productId.startsWith("cocabomb")
        ) {
          categoryTotals.イベント += amount;

          for (const staffId of assignedIds) {
            const row = staffMap.get(staffId);

            if (row) {
              row.eventCount += order.quantity;
            }
          }
        } else if (!productId.startsWith("cashless-fee-")) {
          categoryTotals.単品 += amount;
        }

        if (assignedIds.length > 0) {
          const dividedSales = Math.round(
            amount / assignedIds.length,
          );

          for (const staffId of assignedIds) {
            const row = staffMap.get(staffId);

            if (row) {
              row.attributedSales += dividedSales;
            }
          }
        }
      }
    }

    const ranking = staffRows
      .filter(
        (row) =>
          row.attributedSales > 0 ||
          row.drinkCount > 0 ||
          row.champagneCount > 0 ||
          row.companionCount > 0 ||
          row.reservationCount > 0 ||
          row.eventCount > 0,
      )
      .sort(
        (a, b) =>
          b.attributedSales - a.attributedSales ||
          b.champagneCount - a.champagneCount ||
          b.drinkCount - a.drinkCount,
      );

    const dailySales = Array.from(dailyMap.values()).sort(
      (a, b) =>
        b.businessDate.localeCompare(a.businessDate),
    );

    return {
      totalSales,
      totalGroups: closedTickets.length,
      totalGuests,
      averageGroupSales:
        closedTickets.length > 0
          ? Math.round(totalSales / closedTickets.length)
          : 0,
      averageGuestSales:
        totalGuests > 0
          ? Math.round(totalSales / totalGuests)
          : 0,
      categoryTotals,
      paymentTotals,
      ranking,
      dailySales,
    };
  }, [closedTickets, staff]);

  return (
    <main className="min-h-screen min-h-[100dvh] bg-slate-950 p-3 text-base text-white sm:p-4 md:text-lg">
      <div className="mx-auto max-w-[1400px]">
        {runtimeErrors.length > 0 && (
          <section className="relative z-[200] mb-3 rounded-2xl border-2 border-yellow-400 bg-yellow-950 p-4 text-yellow-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">iPad実行時エラー（デバッグ表示）</h2>
              <button
                type="button"
                onClick={() => setRuntimeErrors([])}
                className="rounded-xl bg-yellow-700 px-4 py-2 font-bold"
              >
                表示を消す
              </button>
            </div>
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/60 p-3 text-sm">
              {runtimeErrors.join("\n\n---\n\n")}
            </pre>
          </section>
        )}
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 p-3">
  <div>
    <h1 className="text-2xl font-black sm:text-3xl">
      Moira POS Ver3
    </h1>
    <p className="hidden text-sm text-slate-400 sm:block">
      {isPcManagement
        ? "PC管理モード｜閲覧＋スタッフ設定・会員一覧"
        : isPosTerminal
          ? "iPad POSモード｜店舗操作端末"
          : "閲覧モード"}
    </p>
  </div>

  <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
    {!businessSession ? (
      <button
        type="button"
        onClick={() => {
          setDrawerCloseMode(false);
          setShowDrawer(true);
        }}
        className="min-h-12 rounded-xl bg-emerald-700 px-4 py-2 font-bold"
      >
        営業開始
      </button>
    ) : (
      <>
        <button
          type="button"
          onClick={() => {
            setDrawerCloseMode(false);
            setShowDrawer(true);
          }}
          className="min-h-12 rounded-xl bg-orange-700 px-4 py-2 font-bold"
        >
          ドロア
        </button>

        <button
          type="button"
          onClick={() => {
            setDrawerCloseMode(true);
            setShowDrawer(true);
          }}
          className="min-h-12 rounded-xl bg-red-700 px-4 py-2 font-bold"
        >
          営業終了
        </button>
      </>
    )}

    <button
      type="button"
      onClick={() => setShowBusinessHistory(true)}
      className="min-h-12 rounded-xl bg-slate-700 px-4 py-2 font-bold"
    >
      履歴
    </button>

    <button
      type="button"
      onClick={() => setShowSalesAnalysis(true)}
      className="min-h-12 rounded-xl bg-indigo-700 px-4 py-2 font-bold"
    >
      売上分析
    </button>

    <button
      type="button"
      onClick={() => setShowReceivables(true)}
      className="min-h-12 rounded-xl bg-amber-700 px-4 py-2 font-bold"
    >
      売掛
    </button>

    <button
      type="button"
      onClick={() => setShowCustomers(true)}
      className="min-h-12 rounded-xl bg-violet-700 px-4 py-2 font-bold"
    >
      顧客
    </button>

    <button
      type="button"
      onClick={() => setShowMemberList(true)}
      className="min-h-12 rounded-xl bg-fuchsia-700 px-4 py-2 font-bold"
    >
      会員一覧
    </button>

    <button
      type="button"
      onClick={() => setShowMemberCampaign(true)}
      className="min-h-12 rounded-xl bg-pink-700 px-4 py-2 font-bold"
    >
      クーポン・イベント作成
    </button>

    <button
      type="button"
      onClick={() => {
        setShowPayroll(false);
        setShowStaff(true);
      }}
      className="min-h-12 rounded-xl bg-emerald-700 px-4 py-2 font-bold"
    >
      スタッフ・給与 {workingCount}名
    </button>

<button
  type="button"
  onClick={createBackup}
  className="min-h-12 rounded-xl bg-cyan-700 px-4 py-2 font-bold"
>
  バックアップ
</button>

<label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-indigo-700 px-4 py-2 font-bold">
  復元
  <input
    type="file"
    accept=".json,application/json"
    className="hidden"
    disabled={!isPosTerminal}
    onChange={async (event) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const confirmed = window.confirm(
        "現在のデータをバックアップ内容で置き換えますか？",
      );

      if (!confirmed) {
        event.target.value = "";
        return;
      }

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        restoreBackup(parsed);

        alert(
          "バックアップを復元しました。保存が完了するまで数秒お待ちください。",
        );
      } catch (error) {
        console.error(error);
        alert(
          error instanceof Error
            ? error.message
            : "バックアップの復元に失敗しました。",
        );
      } finally {
        event.target.value = "";
      }
    }}
  />
</label>

    <button
      type="button"
      onClick={resetCurrentData}
      disabled={!isPosTerminal}
      className={`min-h-12 rounded-xl px-3 py-2 text-sm font-bold ${
        isPosTerminal
          ? "bg-red-950 text-red-200"
          : "cursor-not-allowed bg-slate-800 text-slate-500"
      }`}
    >
      データ消去
    </button>

    <div className="flex min-w-28 flex-col gap-1">
      <div
        className={`rounded-lg px-3 py-1 text-center text-xs font-bold ${
          saveStatus === "保存済み"
            ? "bg-emerald-900 text-emerald-200"
            : saveStatus === "保存失敗"
              ? "bg-red-900 text-red-200"
              : "bg-slate-800 text-slate-300"
        }`}
      >
        {saveStatus}
      </div>

      <div className="rounded-lg bg-slate-800 px-3 py-2 text-center text-xl font-bold">
        {hasMounted
          ? new Date(currentTime).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--"}
      </div>
    </div>

    <button
      type="button"
      onClick={switchDataMode}
      className={`min-h-12 rounded-xl px-4 py-2 font-bold ${
        isTestMode
          ? "bg-fuchsia-700"
          : "bg-blue-700"
      }`}
    >
      {isTestMode ? "テスト" : "本番"}
    </button>
  </div>
</header>

        {offlineNotice && (
          <div className={`mb-3 rounded-2xl border-2 p-3 text-sm font-bold ${isOnline ? "border-emerald-500 bg-emerald-950 text-emerald-100" : "border-amber-500 bg-amber-950 text-amber-100"}`}>
            {offlineNotice}
          </div>
        )}

        {loadError && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-red-500 bg-red-950 p-4 text-red-100">
            <div>
              <p className="text-lg font-black">保存データを読み込めませんでした</p>
              <p className="mt-1">{loadError}</p>
            </div>
            <button
              type="button"
              onClick={() => setLoadAttempt((current) => current + 1)}
              className="rounded-xl bg-red-600 px-5 py-3 text-lg font-bold"
            >
              再読込
            </button>
          </div>
        )}

        {isTestMode && (
          <div className="mb-3 rounded-2xl border-4 border-fuchsia-500 bg-fuchsia-950 p-3 text-center text-xl font-black text-fuchsia-100">
            テストモード：ここで入力した内容は本番データに入りません
          </div>
        )}

        {isPcManagement && !isTestMode && (
          <div className="mb-3 rounded-2xl border-2 border-cyan-500 bg-cyan-950 p-3 text-sm font-bold text-cyan-100">
            PC管理モード：履歴・売上・売掛・顧客・給与はリアルタイム閲覧できます。
            スタッフの追加・設定・出退勤時間の修正、会員一覧、クーポン・イベント作成はPCから操作できます。
            伝票・注文・会計・営業・売掛入金・給与支払い・データ消去/復元は店舗iPadのみです。
          </div>
        )}

        {deviceMode === "readonly" && (
          <div className="mb-3 rounded-2xl border-2 border-slate-500 bg-slate-900 p-3 text-sm font-bold text-slate-200">
            閲覧モード：この端末からのPOSデータ変更はできません。
          </div>
        )}

        <div className="grid gap-3 lg:h-[calc(100dvh-112px)] lg:grid-cols-[3fr_2fr]">
          <section className="flex min-h-0 flex-col rounded-2xl bg-slate-900 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">テーブル一覧</h2>
                <p className="text-sm text-slate-400">
                  使用中の席を押すと右側に伝票を表示
                </p>
              </div>

              <button
                type="button"
                onClick={openNewTicket}
                disabled={!isPosTerminal}
                className={`min-h-12 rounded-xl px-4 py-2 font-bold ${
                  isPosTerminal
                    ? "bg-white text-slate-950"
                    : "cursor-not-allowed bg-slate-700 text-slate-400"
                }`}
              >
                ＋ 新規伝票
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <TodayTicketsPanel
  seats={seats}
  tickets={tickets}
  closedTickets={closedTickets}
  currentTime={currentTime}
  onSelectActiveTicket={setSelectedTicketId}
/>
            </div>
          </section>

          <aside className="min-h-0 rounded-2xl bg-slate-900 p-3 lg:overflow-y-auto">
            {!selectedTicket && (
              <div className="flex min-h-72 items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 p-6 text-center lg:h-full">
                <div>
                  <p className="text-2xl font-bold">伝票を選択</p>
                  <p className="mt-3 text-slate-400">
                    左側の使用中テーブルを押してください
                  </p>
                </div>
              </div>
            )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">
                      {seats.find((seat) => seat.id === selectedTicket?.seatId)?.name}
                    </h2>
                    <p className="mt-1 text-slate-300">
                      {selectedTicket?.guests}名・{selectedTicket?.courseName}
                    </p>

                    {selectedTicket?.customerName && (
                      <p className="mt-1 font-bold text-violet-300">
                        お客様：{selectedTicket.customerName}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTicketId(null)}
                    className="rounded-xl bg-slate-700 px-4 py-2 font-bold"
                  >
                    閉じる
                  </button>
                </div>
 {selectedTicket && (
  <div>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <button
        type="button"
        onClick={() => setShowOrder(true)}
        className="min-h-14 rounded-xl bg-purple-600 p-3 text-lg font-bold"
      >
        ＋ 注文追加
      </button>

<button
  type="button"
  onClick={() => addGuestToSelectedTicket(1)}
  className="min-h-14 rounded-xl bg-emerald-600 p-3 text-lg font-bold"
>
  ＋ お客様追加
</button>

      <button
        type="button"
        onClick={() => {
          setPaymentMode("prepaid");
          setShowPayment(true);
        }}
        className="min-h-14 rounded-xl bg-blue-600 p-3 text-lg font-bold"
      >
        先払い
      </button>

      <button
        type="button"
        onClick={() => {
          setPaymentMode("checkout");
          setShowPayment(true);
        }}
        className="min-h-14 rounded-xl bg-pink-600 p-3 text-lg font-bold"
      >
        会計
      </button>
    </div>

    <button
      type="button"
      onClick={() => setShowMemberManagement(true)}
      className="mt-2 min-h-12 w-full rounded-xl bg-fuchsia-700 p-3 text-lg font-bold"
    >
      {selectedTicket.memberUid
        ? `👤 ${selectedTicket.memberName ?? "会員"}様・会員QR／クーポン`
        : "👤 会員QR・クーポン"}
    </button>

    <div className="mt-2 grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => setShowReservation(true)}
        className="min-h-12 rounded-xl bg-cyan-700 p-3 text-lg font-bold"
      >
        予約設定
        {selectedTicket.reservationEntries?.length
          ? `（${selectedTicket.reservationEntries.reduce(
              (total, entry) => total + entry.quantity,
              0,
            )}人）`
          : ""}
      </button>

      <button
        type="button"
        onClick={() => setShowSeatMove(true)}
        className="min-h-12 rounded-xl bg-teal-700 p-3 text-lg font-bold"
      >
        席移動
      </button>
    </div>

    <button
      type="button"
      onClick={() => setShowExtension(true)}
      className="mt-2 min-h-12 w-full rounded-xl bg-orange-700 p-3 text-lg font-bold"
    >
      延長
    </button>

    <button
      type="button"
      onClick={() => setShowTicketEdit(true)}
      className="mt-2 min-h-12 w-full rounded-xl bg-blue-700 p-3 text-lg font-bold"
    >
      ⚙️ 伝票修正
    </button>

<div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-xs text-slate-400">伝票合計</p>
                    <p className="mt-1 text-lg font-bold">
                      {formatYen(calculateTicketTotal(selectedTicket))}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-xs text-slate-400">支払済み</p>
                    <p className="mt-1 text-lg font-bold">
                      {formatYen(calculatePaidTotal(selectedTicket))}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-950 p-3">
                    <p className="text-xs text-red-200">未会計</p>
                    <p className="mt-1 text-xl font-black">
                      {formatYen(calculateBalance(selectedTicket))}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-xl font-bold">注文明細</h3>

                  {selectedTicket.orders.length === 0 && (
                    <p className="mt-2 rounded-xl bg-slate-800 p-4 text-center text-slate-400">
                      まだ追加注文はありません
                    </p>
                  )}

                  <div className="mt-2 space-y-2">
                    {selectedTicket.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-slate-800 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold">{order.name}</p>
                          <p className="text-sm text-slate-400">
                            {formatYen(order.price)} × {order.quantity}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => changeOrderQuantity(order.id, -1)}
                            className="min-h-11 min-w-11 rounded-lg bg-slate-700 text-xl font-bold"
                          >
                            −
                          </button>

                          <span className="min-w-7 text-center text-lg font-bold">
                            {order.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => changeOrderQuantity(order.id, 1)}
                            className="min-h-11 min-w-11 rounded-lg bg-slate-700 text-xl font-bold"
                          >
                            ＋
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedTicket.payments.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">支払履歴</h3>
                      <button
                        type="button"
                        onClick={deleteLastPayment}
                        className="rounded-lg bg-red-900 px-3 py-2 text-sm font-bold"
                      >
                        直前取消
                      </button>
                    </div>

                    <div className="mt-2 space-y-2">
                      {selectedTicket.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-xl bg-slate-800 p-3"
                        >
                          <span>{payment.method}</span>
                          <strong>{formatYen(payment.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={finishTicket}
                  className="mt-4 min-h-14 w-full rounded-xl bg-red-700 p-3 text-lg font-bold"
                >
                  会計済み・伝票終了
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      {showNewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 p-5">
            <h2 className="text-2xl font-bold">新規伝票</h2>

            <label className="mt-4 block font-bold">
              お客様
            </label>

            <select
              value={selectedCustomerId}
              onChange={(event) =>
                setSelectedCustomerId(
                  event.target.value,
                )
              }
              className="mt-2 w-full rounded-xl bg-slate-800 p-3 text-lg"
            >
              <option value="">
                未登録・フリー
              </option>

              {customers
                .slice()
                .sort((a, b) =>
                  a.name.localeCompare(
                    b.name,
                    "ja",
                  ),
                )
                .map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name}
                    {customer.bottleName
                      ? `｜${customer.bottleName}`
                      : ""}
                  </option>
                ))}
            </select>

            {selectedCustomerId && (
              <div className="mt-2 rounded-xl bg-violet-950 p-3 text-sm">
                {(() => {
                  const customer =
                    customers.find(
                      (item) =>
                        item.id ===
                        selectedCustomerId,
                    );

                  if (!customer) {
                    return null;
                  }

                  return (
                    <>
                      <p>
                        ボトル：
                        {customer.bottleName ||
                          "登録なし"}
                      </p>
                      <p className="mt-1">
                        来店回数：
                        {customer.visitCount}回
                      </p>
                    </>
                  );
                })()}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setShowCustomers(true)
              }
              className="mt-2 w-full rounded-xl bg-violet-700 p-3 font-bold"
            >
              顧客を登録・編集
            </button>

            <label className="mt-4 block font-bold">席</label>
            <select
              value={selectedSeatId}
              onChange={(event) => setSelectedSeatId(Number(event.target.value))}
              className="mt-2 w-full rounded-xl bg-slate-800 p-3 text-lg"
            >
              {seats
                .filter(
                  (seat) =>
                    !occupiedSeatIds.has(seat.id) ||
                    seat.id === selectedSeatId,
                )
                .map((seat) => (
                  <option key={seat.id} value={seat.id}>
                    {seat.name}
                  </option>
                ))}
            </select>

            <label className="mt-4 block font-bold">人数</label>
            <input
              type="number"
              min={1}
              value={guestCount}
              onChange={(event) =>
                setGuestCount(Math.max(1, Number(event.target.value)))
              }
              className="mt-2 w-full rounded-xl bg-slate-800 p-3 text-lg"
            />

            <label className="mt-4 block font-bold">セット</label>
            <select
              value={selectedCourseIndex}
              onChange={(event) =>
                setSelectedCourseIndex(Number(event.target.value))
              }
              className="mt-2 w-full rounded-xl bg-slate-800 p-3 text-lg"
            >
              {courses.map((course, index) => (
                <option key={course.id} value={index}>
                  {course.name}・{course.minutes}分・
                  {course.price.toLocaleString()}円
                </option>
              ))}
            </select>

            <label className="mt-4 block font-bold">開始時刻</label>
            <input
              type="time"
              step={300}
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="mt-2 w-full rounded-xl bg-slate-800 p-3 text-lg"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowNewTicket(false)}
                className="min-h-12 rounded-xl bg-slate-700 p-3 font-bold"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={createTicket}
                className="min-h-12 rounded-xl bg-purple-600 p-3 font-bold"
              >
                伝票を開始
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrder && selectedTicket && (
        <OrderModal
          products={products}
          storeMode={storeMode}
          onSelectProduct={requestProduct}
          onClose={() => setShowOrder(false)}
        />
      )}

      {pendingStaffSelection && (
        <StaffSelectModal
          title={
            pendingStaffSelection.purpose === "companion"
              ? "同伴キャストを選択"
              : pendingStaffSelection.purpose === "champagne"
                ? `${pendingStaffSelection.product.name}を飲んだスタッフ`
                : `${pendingStaffSelection.product.name}を飲んだスタッフ`
          }
          description={
            pendingStaffSelection.purpose === "companion"
              ? "選択人数 × 1,000円で登録します"
              : pendingStaffSelection.purpose === "champagne"
                ? "飲んだスタッフを複数選択してください"
                : "スタッフを1名選択してください"
          }
          staff={staff}
          multiple={pendingStaffSelection.mode === "multiple"}
          castOnly={pendingStaffSelection.purpose === "companion"}
          onRegister={registerAssignedProduct}
          onClose={() => setPendingStaffSelection(null)}
        />
      )}

      {pendingEventProduct && (
        <EventStaffModal
          product={pendingEventProduct}
          staff={staff}
          onRegister={registerEventOrder}
          onClose={() => setPendingEventProduct(null)}
        />
      )}
{showAdjustment && selectedTicket && (
  <AdjustmentModal
    currentTotal={calculateTicketTotal(
      selectedTicket,
    )}
    onRegister={registerAdjustment}
    onClose={() =>
      setShowAdjustment(false)
    }
  />
)}

{showTicketEdit && selectedTicket && (
  <TicketEditModal
    courses={courses}
    currentCourseId={selectedTicket.courseId}
    extensionCourseId={
      selectedTicket.extensionCourseId
    }
    onChangeCourse={changeSelectedCourse}
    onChangeExtensionCourse={
      changeExtensionCourse
    }
    onClose={() => setShowTicketEdit(false)}
  />
)}
      {showExtension && selectedTicket && (
        <ExtensionModal
  courseId={
    selectedTicket.extensionCourseId ??
    selectedTicket.courseId
  }
  onSelect={(minutes, price) => {
    addExtension(minutes, price);
    setShowExtension(false);
  }}
  onClose={() => setShowExtension(false)}
/>
      )}

      {showReservation && selectedTicket && (
        <ReservationModal
          staff={staff}
          initialEntries={
            selectedTicket.reservationEntries ?? []
          }
          onSave={saveReservationEntries}
          onClose={() => setShowReservation(false)}
        />
      )}

      {(showStaff || showPayroll) && (
        <div className="fixed left-1/2 top-3 z-[100] flex -translate-x-1/2 gap-2 rounded-2xl border border-slate-600 bg-slate-950/95 p-2 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setShowPayroll(false);
              setShowStaff(true);
            }}
            className={`min-h-11 rounded-xl px-5 py-2 font-bold ${
              showStaff
                ? "bg-emerald-600 text-white"
                : "bg-slate-700 text-slate-200"
            }`}
          >
            スタッフ管理・出勤
          </button>

          <button
            type="button"
            onClick={() => {
              setShowStaff(false);
              setShowPayroll(true);
            }}
            className={`min-h-11 rounded-xl px-5 py-2 font-bold ${
              showPayroll
                ? "bg-amber-600 text-white"
                : "bg-slate-700 text-slate-200"
            }`}
          >
            給与
          </button>
        </div>
      )}
      {showPayroll && (
        <PayrollModal
          staff={staff}
          closedTickets={closedTickets}
          activeTickets={tickets}
          currentTime={currentTime}
          adjustments={payrollAdjustments}
          payments={payrollPayments}
          onAddAdjustment={addPayrollAdjustment}
          onDeleteAdjustment={deletePayrollAdjustment}
          onRegisterPayment={registerPayrollPayment}
          onDeletePayment={deletePayrollPayment}
          onClose={() => {
            setShowPayroll(false);
            setShowStaff(false);
          }}
        />
       )}

      {showPayment && selectedTicket && (
       <PaymentModal
  balance={calculateBalance(selectedTicket)}
  customerName={selectedTicket.customerName}
  paymentMode={paymentMode}
  onRegisterPayment={registerPayment}
  onClose={() => setShowPayment(false)}
/>
      )}

      {showSalesAnalysis && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/85 p-3 sm:p-6">
          <div className="mx-auto min-h-full max-w-7xl rounded-3xl bg-slate-950 p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-3xl font-black">
                  売上分析・キャストランキング
                </h2>
                <p className="mt-1 text-slate-400">
                  会計済み伝票を集計しています
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSalesAnalysis(false)}
                className="min-h-12 rounded-xl bg-slate-700 px-5 py-2 font-bold"
              >
                閉じる
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl bg-emerald-950 p-4">
                <p className="text-sm text-emerald-200">総売上</p>
                <p className="mt-2 text-2xl font-black">
                  {formatYen(salesAnalysis.totalSales)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4">
                <p className="text-sm text-slate-400">組数</p>
                <p className="mt-2 text-2xl font-black">
                  {salesAnalysis.totalGroups}組
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4">
                <p className="text-sm text-slate-400">来店人数</p>
                <p className="mt-2 text-2xl font-black">
                  {salesAnalysis.totalGuests}名
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4">
                <p className="text-sm text-slate-400">平均客単価</p>
                <p className="mt-2 text-2xl font-black">
                  {formatYen(salesAnalysis.averageGuestSales)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4">
                <p className="text-sm text-slate-400">平均組単価</p>
                <p className="mt-2 text-2xl font-black">
                  {formatYen(salesAnalysis.averageGroupSales)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <section className="rounded-2xl bg-slate-900 p-4">
                <h3 className="text-xl font-black">
                  キャストランキング
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  担当が登録された商品売上を人数で分割して集計
                </p>

                {salesAnalysis.ranking.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-slate-800 p-6 text-center text-slate-400">
                    ランキング対象の会計データがありません
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                      <thead>
                        <tr className="border-b border-slate-700 text-sm text-slate-400">
                          <th className="p-3">順位</th>
                          <th className="p-3">スタッフ</th>
                          <th className="p-3 text-right">担当売上</th>
                          <th className="p-3 text-right">ドリンク</th>
                          <th className="p-3 text-right">シャンパン</th>
                          <th className="p-3 text-right">同伴</th>
                          <th className="p-3 text-right">予約</th>
                          <th className="p-3 text-right">イベント</th>
                        </tr>
                      </thead>

                      <tbody>
                        {salesAnalysis.ranking.map((row, index) => (
                          <tr
                            key={row.staffId}
                            className="border-b border-slate-800"
                          >
                            <td className="p-3">
                              <span
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-black ${
                                  index === 0
                                    ? "bg-yellow-500 text-slate-950"
                                    : index === 1
                                      ? "bg-slate-300 text-slate-950"
                                      : index === 2
                                        ? "bg-orange-700 text-white"
                                        : "bg-slate-800"
                                }`}
                              >
                                {index + 1}
                              </span>
                            </td>

                            <td className="p-3">
                              <p className="font-bold">{row.name}</p>
                              <p className="text-xs text-slate-500">
                                {row.role}
                              </p>
                            </td>

                            <td className="p-3 text-right font-black text-emerald-300">
                              {formatYen(row.attributedSales)}
                            </td>
                            <td className="p-3 text-right">
                              {row.drinkCount}杯
                            </td>
                            <td className="p-3 text-right">
                              {row.champagneCount}本
                            </td>
                            <td className="p-3 text-right">
                              {row.companionCount}件
                            </td>
                            <td className="p-3 text-right">
                              {row.reservationCount}名
                            </td>
                            <td className="p-3 text-right">
                              {row.eventCount}件
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-2xl bg-slate-900 p-4">
                <h3 className="text-xl font-black">日別売上</h3>

                {salesAnalysis.dailySales.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-slate-800 p-6 text-center text-slate-400">
                    会計済みデータがありません
                  </div>
                ) : (
                  <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                    {salesAnalysis.dailySales.map((day) => {
                      const maxSales = Math.max(
                        ...salesAnalysis.dailySales.map(
                          (item) => item.sales,
                        ),
                        1,
                      );

                      const width = Math.max(
                        5,
                        Math.round(
                          (day.sales / maxSales) * 100,
                        ),
                      );

                      return (
                        <div
                          key={day.businessDate}
                          className="rounded-xl bg-slate-800 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-bold">
                                {day.businessDate}
                              </p>
                              <p className="text-xs text-slate-400">
                                {day.groupCount}組・{day.guestCount}名
                              </p>
                            </div>

                            <p className="text-lg font-black">
                              {formatYen(day.sales)}
                            </p>
                          </div>

                          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-700">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <section className="rounded-2xl bg-slate-900 p-4">
                <h3 className="text-xl font-black">売上内訳</h3>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(
                    salesAnalysis.categoryTotals,
                  ).map(([name, amount]) => (
                    <div
                      key={name}
                      className="rounded-xl bg-slate-800 p-3"
                    >
                      <p className="text-sm text-slate-400">
                        {name}
                      </p>
                      <p className="mt-1 font-black">
                        {formatYen(amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl bg-slate-900 p-4">
                <h3 className="text-xl font-black">支払方法別</h3>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {Object.entries(
                    salesAnalysis.paymentTotals,
                  ).map(([name, amount]) => (
                    <div
                      key={name}
                      className="rounded-xl bg-slate-800 p-3"
                    >
                      <p className="text-sm text-slate-400">
                        {name}
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {formatYen(amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {showBusinessHistory && (
        <HistoryHubModal
          reports={businessReports}
          closedTickets={closedTickets}
          activeTicketCount={tickets.length}
          staff={staff}
          adjustments={payrollAdjustments}
          payments={payrollPayments}
          currentTime={currentTime}
          businessSession={businessSession}
          onCreateBackup={createBackup}
          onRestoreBackup={restoreBackup}
          onClose={() => setShowBusinessHistory(false)}
        />
      )}

      {showSeatMove && selectedTicket && (
        <SeatMoveModal
          seats={seats}
          tickets={tickets}
          currentSeatId={selectedTicket.seatId}
          onMove={moveSelectedTicket}
          onClose={() => setShowSeatMove(false)}
        />
      )}

      {showDrawer && (
        <DrawerModal
          session={businessSession}
          closeMode={drawerCloseMode}
          figures={
            businessSession
              ? getBusinessCashFigures(businessSession)
              : null
          }
          onStart={startBusinessDay}
          onAddEntry={addDrawerEntry}
          onDeleteEntry={deleteDrawerEntry}
          onCloseBusiness={closeBusinessDay}
          onClose={() => {
            setShowDrawer(false);
            setDrawerCloseMode(false);
          }}
        />
      )}

      {showReceivables && (
        <ReceivablesModal
          receivables={receivables}
          onCollect={collectReceivable}
          onDeleteCollection={
            deleteReceivableCollection
          }
          onClose={() => setShowReceivables(false)}
        />
      )}

      {showReservationCalendar && (
        <ReservationCalendarModal
          reservations={calendarReservations}
          customers={customers}
          staff={staff}
          onSave={saveCalendarReservation}
          onDelete={deleteCalendarReservation}
          onClose={() =>
            setShowReservationCalendar(false)
          }
        />
      )}

      {showCustomers && (
        <CustomerModal
          customers={customers}
          staff={staff}
          onOpenReservationCalendar={() => {
            setShowCustomers(false);
            setShowReservationCalendar(true);
          }}
          onSave={saveCustomer}
          onDelete={deleteCustomer}
          onClose={() => setShowCustomers(false)}
        />
      )}

      {showMemberManagement && (
        <MemberManagementModal
          tickets={tickets.map((ticket) => ({
            id: ticket.id,
            label: `${
              seats.find((seat) => seat.id === ticket.seatId)?.name ??
              `席${ticket.seatId}`
            }${ticket.customerName ? `・${ticket.customerName}様` : ""}`,
            total: calculateTicketTotal(ticket),
            balance: calculateBalance(ticket),
            hasPayments: ticket.payments.length > 0,
            hasCoupon: ticket.orders.some((order) =>
              order.productId.startsWith("member-coupon-"),
            ),
            memberUid: ticket.memberUid,
            memberName: ticket.memberName,
            pointEligibleAmount:
              calculateMemberPointEligibleAmount(ticket),
          }))}
          selectedTicketId={selectedTicketId}
          canApplyCoupon={isPosTerminal}
          onLinkMember={linkMemberToTicket}
          onApplyCoupon={applyMemberCouponToTicket}
          onClose={() => setShowMemberManagement(false)}
        />
      )}

      {showMemberList && (
        <MemberListModal
          onClose={() => setShowMemberList(false)}
        />
      )}

      {showMemberCampaign && (
        <MemberCampaignModal
          onClose={() => setShowMemberCampaign(false)}
        />
      )}

      {showStaff && (
        <StaffModal
          staff={staff}
          onClockIn={clockIn}
          onClockOut={clockOut}
          onUpdateStaff={updateStaff}
          onAddTemporaryStaff={addTemporaryStaff}
          onClose={() => {
            setShowStaff(false);
            setShowPayroll(false);
          }}
        />
      )}
    </main>
  );
}