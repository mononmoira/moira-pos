"use client";

import { useEffect, useMemo, useState } from "react";

import TableGrid, {
  type Seat,
  type TableTicket,
} from "./components/TableGrid";

import OrderModal, {
  type Product,
} from "./components/OrderModal";

import PaymentModal, {
  type PaymentMethod,
} from "./components/PaymentModal";

import StaffModal, {
  type PaymentCycle,
  type Staff,
  type StaffRole,
} from "./components/StaffModal";

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

type Payment = {
  id: string;
  method: PaymentMethod;
  amount: number;
  appliedAmount?: number;
  surchargeAmount?: number;
  paidAt: string;
};

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
  courseTotal: number;
  orders: OrderItem[];
  payments: Payment[];
  reservationEntries?: ReservationEntry[];
  customerId?: string;
  customerName?: string;
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
      purpose: "companion" | "champagne";
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
];

const products: Product[] = [
  { id: "companion", name: "同伴", category: "同伴", price: 1000 },

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
];

const initialStaff: Staff[] = [
  { id: "masaki", name: "まさき", role: "ボーイ", hourlyWage: 1900, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "yuu", name: "ゆう", role: "キャスト", hourlyWage: 2600, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "meira", name: "めいら", role: "キャスト", hourlyWage: 2500, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "fumika", name: "ふみか", role: "キャスト", hourlyWage: 2400, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "nanami", name: "ななみ", role: "キャスト", hourlyWage: 2400, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "fuuka", name: "ふうか", role: "キャスト", hourlyWage: 2100, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
  { id: "airi", name: "あいり", role: "キャスト", hourlyWage: 1900, paymentCycle: "当日日払い", clockIn: null, clockOut: null },
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

  const paymentTotals = {
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
    id: crypto.randomUUID(),
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

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [closedTickets, setClosedTickets] =
    useState<ClosedTicket[]>([]);
  const [businessReports, setBusinessReports] =
    useState<BusinessReport[]>([]);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [calendarReservations, setCalendarReservations] =
    useState<CalendarReservation[]>([]);
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
  const [saveStatus, setSaveStatus] = useState<
    "読込中" | "保存済み" | "保存中" | "保存失敗"
  >("読込中");
  const [isTestMode, setIsTestMode] =
    useState(false);
  const [modeReady, setModeReady] = useState(false);

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [showDailyReport, setShowDailyReport] =
    useState(false);
  const [showBusinessHistory, setShowBusinessHistory] =
    useState(false);
  const [showPayroll, setShowPayroll] = useState(false);
  const [showReservation, setShowReservation] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  const [showReservationCalendar, setShowReservationCalendar] =
    useState(false);
  const [showExtension, setShowExtension] = useState(false);
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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
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
        } catch {
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
    async function loadSavedData() {
      try {
        if (!modeReady) {
          return;
        }

        setDataLoaded(false);
        setSaveStatus("読込中");

        const response = await fetch(
          `/api/state?mode=${
            isTestMode ? "test" : "live"
          }`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("保存データを読み込めませんでした。");
        }

        const saved = (await response.json()) as {
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

        setTickets(
          Array.isArray(saved.tickets)
            ? saved.tickets
            : [],
        );

        setClosedTickets(
          Array.isArray(saved.closedTickets)
            ? saved.closedTickets
            : [],
        );

        setBusinessReports(
          Array.isArray(saved.businessReports)
            ? saved.businessReports
            : [],
        );

        setStaff(
          Array.isArray(saved.staff) &&
            saved.staff.length > 0
            ? saved.staff
            : initialStaff,
        );

        setPayrollAdjustments(
          Array.isArray(saved.payrollAdjustments)
            ? saved.payrollAdjustments
            : [],
        );

        setPayrollPayments(
          Array.isArray(saved.payrollPayments)
            ? saved.payrollPayments
            : [],
        );

        setCustomers(
          Array.isArray(saved.customers)
            ? saved.customers.map((customer) => ({
                ...customer,
                ageGroup: customer.ageGroup ?? "不明",
                birthMonth: customer.birthMonth ?? null,
                birthDay: customer.birthDay ?? null,
                smokingStatus:
                  customer.smokingStatus ?? "不明",
                gender: customer.gender ?? "未設定",
                assignedStaffIds:
                  customer.assignedStaffIds ?? [],
              }))
            : [],
        );

        setAppUsers(
          Array.isArray(saved.appUsers) &&
            saved.appUsers.length > 0
            ? saved.appUsers
            : initialUsers,
        );

        setAuditLogs(
          Array.isArray(saved.auditLogs)
            ? saved.auditLogs
            : [],
        );

        setCalendarReservations(
          Array.isArray(saved.calendarReservations)
            ? saved.calendarReservations
            : [],
        );

        setCurrentUserId(
          typeof saved.currentUserId === "string" &&
            saved.currentUserId
            ? saved.currentUserId
            : "owner",
        );

        setReceivables(
          Array.isArray(saved.receivables)
            ? saved.receivables
            : [],
        );

        setBusinessSession(
          saved.businessSession ?? null,
        );

        setSelectedTicketId(null);

        setSaveStatus("保存済み");
      } catch (error) {
        console.error(error);
        setSaveStatus("保存失敗");
      } finally {
        setDataLoaded(true);
      }
    }

    loadSavedData();
  }, [modeReady, isTestMode]);

  useEffect(() => {
    if (!dataLoaded) return;

    setSaveStatus("保存中");

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/state?mode=${
            isTestMode ? "test" : "live"
          }`,
          {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
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
          }),
        },
        );

        if (!response.ok) {
          throw new Error("保存に失敗しました。");
        }

        setSaveStatus("保存済み");
      } catch (error) {
        console.error(error);
        setSaveStatus("保存失敗");
      }
    }, 500);

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
    isTestMode,
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

  function calculateBalance(ticket: Ticket) {
    return Math.max(
      0,
      calculateTicketTotal(ticket) - calculatePaidTotal(ticket),
    );
  }

  function refreshTicketAmounts(ticket: Ticket): Ticket {
    return {
      ...ticket,
      total: calculateTicketTotal(ticket),
      balance: calculateBalance(ticket),
    };
  }

  function openNewTicket() {
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
      id: crypto.randomUUID(),
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
    };

    setTickets((current) => [...current, newTicket]);
    setShowNewTicket(false);
    setSelectedTicketId(newTicket.id);
  }

  function addPlainProduct(product: Product) {
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
                id: crypto.randomUUID(),
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
    if (product.category === "同伴") {
      setShowOrder(false);
      setPendingStaffSelection({
        mode: "multiple",
        purpose: "companion",
        product,
      });
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
            id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
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
                id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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

  function saveReservationEntries(
    entries: ReservationEntry[],
  ) {
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
    if (quantity <= 0) {
      return;
    }

    const unitAmount =
      type === "予約" ? 300 : 500;

    const adjustment: PayrollAdjustment = {
      id: crypto.randomUUID(),
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
    setPayrollAdjustments((current) =>
      current.filter((item) => item.id !== adjustmentId),
    );
  }

  function registerPayrollPayment(
    staffId: string,
    amount: number,
    note: string,
  ) {
    if (amount <= 0) {
      alert("支払額を入力してください。");
      return;
    }

    const payment: PayrollPayment = {
      id: crypto.randomUUID(),
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
    if (!window.confirm("この給与支払いを取り消しますか？")) {
      return;
    }

    setPayrollPayments((current) =>
      current.filter((item) => item.id !== paymentId),
    );
  }

  function registerPayment(
    method: PaymentMethod,
    baseAmount: number,
  ) {
    if (!selectedTicket) return;

    const currentBalance = calculateBalance(selectedTicket);

    if (baseAmount <= 0 || baseAmount > currentBalance) {
      alert("支払額を確認してください。");
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

    const isCashless =
      method === "Squareカード" || method === "QR";

    const surchargeAmount = isCashless
      ? Math.ceil(baseAmount * 0.1)
      : 0;

    const chargedAmount =
      baseAmount + surchargeAmount;

    const payment: Payment = {
      id: crypto.randomUUID(),
      method,
      amount: chargedAmount,
      appliedAmount: baseAmount,
      surchargeAmount,
      paidAt: new Date().toISOString(),
    };

    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== selectedTicket.id) {
          return ticket;
        }

        const surchargeOrder =
          surchargeAmount > 0
            ? {
                id: crypto.randomUUID(),
                productId: `cashless-fee-${payment.id}`,
                name: "キャッシュレス手数料10％",
                price: surchargeAmount,
                quantity: 1,
              }
            : null;

        return refreshTicketAmounts({
          ...ticket,
          orders: surchargeOrder
            ? [...ticket.orders, surchargeOrder]
            : ticket.orders,
          payments: [...ticket.payments, payment],
        });
      }),
    );

    if (
      method === "売掛" &&
      selectedTicket.customerId &&
      selectedTicket.customerName
    ) {
      const receivable: Receivable = {
        id: crypto.randomUUID(),
        customerId: selectedTicket.customerId,
        customerName: selectedTicket.customerName,
        ticketId: selectedTicket.id,
        originalAmount: baseAmount,
        createdAt: new Date().toISOString(),
        collections: [],
      };

      setReceivables((current) => [
        ...current,
        receivable,
      ]);
    }

    setShowPayment(false);
  }

  function deleteLastPayment() {
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
                  `cashless-fee-${lastPayment.id}`,
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
          id: crypto.randomUUID(),
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

  function addExtension(minutes: number, price: number) {
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
                id: crypto.randomUUID(),
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

  function finishTicket() {
    if (!selectedTicket) return;

    const balance = calculateBalance(selectedTicket);

    if (balance > 0) {
      alert(`未会計残高が${formatYen(balance)}あります。`);
      return;
    }

    if (!window.confirm("会計済みとして伝票を終了しますか？")) return;

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
            id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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

    window.localStorage.setItem(
      "moira-pos-mode",
      nextMode,
    );

    window.location.reload();
  }

  async function resetCurrentData() {
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
      const response = await fetch(
        `/api/state?mode=${
          isTestMode ? "test" : "live"
        }`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(
          "データの初期化に失敗しました。",
        );
      }

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
    if (!businessSession || amount <= 0) return;

    const entry: DrawerEntry = {
      id: crypto.randomUUID(),
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

  function businessTimeToIso(businessTime: string) {
    const [businessHour, minute] = businessTime.split(":").map(Number);
    const now = new Date();
    const baseDate = new Date(now);

    if (now.getHours() < 12) {
      baseDate.setDate(baseDate.getDate() - 1);
    }

    baseDate.setHours(0, 0, 0, 0);

    if (businessHour >= 24) {
      baseDate.setDate(baseDate.getDate() + 1);
      baseDate.setHours(businessHour - 24, minute, 0, 0);
    } else {
      baseDate.setHours(businessHour, minute, 0, 0);
    }

    return baseDate.toISOString();
  }

  function clockIn(staffId: string, businessTime: string) {
    setStaff((current) =>
      current.map((person) =>
        person.id === staffId
          ? {
              ...person,
              clockIn: businessTimeToIso(businessTime),
              clockOut: null,
            }
          : person,
      ),
    );
  }

  function clockOut(staffId: string, businessTime: string) {
    setStaff((current) =>
      current.map((person) =>
        person.id === staffId
          ? {
              ...person,
              clockOut: businessTimeToIso(businessTime),
            }
          : person,
      ),
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
      id: crypto.randomUUID(),
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

  return (
    <main className="min-h-screen bg-slate-950 p-3 text-white sm:p-4">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-900 p-3">
  <div>
    <h1 className="text-2xl font-black sm:text-3xl">
      Moira POS Ver3
    </h1>
    <p className="hidden text-sm text-slate-400 sm:block">
      10.2インチiPad横画面対応
    </p>
  </div>

  <div className="flex items-center gap-2">
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
      onClick={resetCurrentData}
      className="min-h-12 rounded-xl bg-red-950 px-3 py-2 text-sm font-bold text-red-200"
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

        {isTestMode && (
          <div className="mb-3 rounded-2xl border-4 border-fuchsia-500 bg-fuchsia-950 p-3 text-center text-xl font-black text-fuchsia-100">
            テストモード：ここで入力した内容は本番データに入りません
          </div>
        )}

        <div className="grid gap-3 lg:h-[calc(100vh-92px)] lg:grid-cols-[3fr_2fr]">
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
                className="min-h-12 rounded-xl bg-white px-4 py-2 font-bold text-slate-950"
              >
                ＋ 新規伝票
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <TableGrid
                seats={seats}
                tickets={tickets}
                currentTime={currentTime}
                onSelectTicket={setSelectedTicketId}
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

            {selectedTicket && (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">
                      {seats.find((seat) => seat.id === selectedTicket.seatId)?.name}
                    </h2>
                    <p className="mt-1 text-slate-300">
                      {selectedTicket.guests}名・{selectedTicket.courseName}
                    </p>

                    {selectedTicket.customerName && (
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

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOrder(true)}
                    className="min-h-14 rounded-xl bg-purple-600 p-3 text-lg font-bold"
                  >
                    ＋ 注文追加
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPayment(true)}
                    className="min-h-14 rounded-xl bg-pink-600 p-3 text-lg font-bold"
                  >
                    先払い・会計
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReservation(true)}
                    className="min-h-12 rounded-xl bg-cyan-700 p-3 text-lg font-bold"
                  >
                    予約設定
                    {selectedTicket.reservationEntries?.length
                      ? `（${selectedTicket.reservationEntries.reduce(
                          (total, entry) =>
                            total + entry.quantity,
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

                <div className="hidden">
                  <button
                    type="button"
                    onClick={() => setShowReservation(true)}
                    className="mt-2 min-h-12 w-full rounded-xl bg-cyan-700 p-3 text-lg font-bold"
                  >
                  予約設定
                  {selectedTicket.reservationEntries?.length
                    ? `（${selectedTicket.reservationEntries.reduce(
                        (total, entry) => total + entry.quantity,
                        0,
                      )}人）`
                    : ""}
                </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExtension(true)}
                  className="mt-2 min-h-12 w-full rounded-xl bg-orange-700 p-3 text-lg font-bold"
                >
                  延長
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

      {showExtension && selectedTicket && (
        <ExtensionModal
          courseId={selectedTicket.courseId}
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
          onRegisterPayment={registerPayment}
          onClose={() => setShowPayment(false)}
        />
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
