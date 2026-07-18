import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SavedState = {
  tickets: unknown[];
  closedTickets: unknown[];
  businessReports: unknown[];
  staff: unknown[];
  payrollAdjustments: unknown[];
  payrollPayments: unknown[];
  customers: unknown[];
  appUsers: unknown[];
  auditLogs: unknown[];
  calendarReservations: unknown[];
  currentUserId: string;
  receivables: unknown[];
  businessSession: unknown | null;
  updatedAt: string;
};

const dataDirectory = path.join(process.cwd(), "data");

function getDataFile(request: Request) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get("store") === "days" ? "days" : "moira";
  const dataMode = searchParams.get("mode") === "test" ? "test" : "live";

  // Keep the original Moira filenames unchanged for backward compatibility.
  const filename =
    store === "moira"
      ? dataMode === "test"
        ? "moira-pos-test-state.json"
        : "moira-pos-state.json"
      : dataMode === "test"
        ? "days-pos-test-state.json"
        : "days-pos-state.json";

  return path.join(dataDirectory, filename);
}

function createInitialState(): SavedState {
  return {
    tickets: [],
    closedTickets: [],
    businessReports: [],
    staff: [],
    payrollAdjustments: [],
    payrollPayments: [],
    customers: [],
    appUsers: [],
    auditLogs: [],
    calendarReservations: [],
    currentUserId: "",
    receivables: [],
    businessSession: null,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeSavedState(value: unknown): SavedState {
  const initial = createInitialState();

  if (!value || typeof value !== "object") return initial;
  const saved = value as Partial<SavedState>;

  return {
    tickets: Array.isArray(saved.tickets) ? saved.tickets : [],
    closedTickets: Array.isArray(saved.closedTickets) ? saved.closedTickets : [],
    businessReports: Array.isArray(saved.businessReports) ? saved.businessReports : [],
    staff: Array.isArray(saved.staff) ? saved.staff : [],
    payrollAdjustments: Array.isArray(saved.payrollAdjustments) ? saved.payrollAdjustments : [],
    payrollPayments: Array.isArray(saved.payrollPayments) ? saved.payrollPayments : [],
    customers: Array.isArray(saved.customers) ? saved.customers : [],
    appUsers: Array.isArray(saved.appUsers) ? saved.appUsers : [],
    auditLogs: Array.isArray(saved.auditLogs) ? saved.auditLogs : [],
    calendarReservations: Array.isArray(saved.calendarReservations)
      ? saved.calendarReservations
      : [],
    currentUserId: typeof saved.currentUserId === "string" ? saved.currentUserId : "",
    receivables: Array.isArray(saved.receivables) ? saved.receivables : [],
    businessSession: saved.businessSession ?? null,
    updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : initial.updatedAt,
  };
}

async function ensureDataFile(dataFile: string) {
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(
      dataFile,
      JSON.stringify(createInitialState(), null, 2),
      "utf8",
    );
  }
}

export async function GET(request: Request) {
  try {
    const dataFile = getDataFile(request);
    await ensureDataFile(dataFile);
    const content = await fs.readFile(dataFile, "utf8");
    return NextResponse.json(normalizeSavedState(JSON.parse(content)));
  } catch (error) {
    console.error("POS load error:", error);
    return NextResponse.json(
      { message: "保存データの読込に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SavedState>;

    if (!Array.isArray(body.tickets) || !Array.isArray(body.staff)) {
      return NextResponse.json(
        { message: "保存内容が正しくありません。" },
        { status: 400 },
      );
    }

    const dataFile = getDataFile(request);
    await ensureDataFile(dataFile);

    const savedState = normalizeSavedState({
      ...body,
      updatedAt: new Date().toISOString(),
    });
    const temporaryFile = `${dataFile}.tmp`;

    await fs.writeFile(
      temporaryFile,
      JSON.stringify(savedState, null, 2),
      "utf8",
    );
    await fs.rename(temporaryFile, dataFile);

    return NextResponse.json({ ok: true, updatedAt: savedState.updatedAt });
  } catch (error) {
    console.error("POS save error:", error);
    return NextResponse.json(
      { message: "保存に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const dataFile = getDataFile(request);
    await fs.mkdir(dataDirectory, { recursive: true });
    const initialState = createInitialState();

    await fs.writeFile(dataFile, JSON.stringify(initialState, null, 2), "utf8");

    return NextResponse.json({
      ok: true,
      updatedAt: initialState.updatedAt,
    });
  } catch (error) {
    console.error("POS reset error:", error);
    return NextResponse.json(
      { message: "データの初期化に失敗しました。" },
      { status: 500 },
    );
  }
}