"use client";

import type {
  ClosedTicket,
  PayrollAdjustment,
  PayrollPayment,
  Ticket,
} from "../page";
import type { Staff } from "../components/StaffModal";

export type PayrollSnapshotRow = {
  businessDate: string;
  staffId: string;
  name: string;
  role: string;
  paymentCycle: string;
  hourlyWage: number;
  minutes: number;
  hourly: number;
  drink: number;
  champagne: number;
  event: number;
  reservation: number;
  transport: number;
  parking: number;
  gross: number;
  paid: number;
};

const champagneBack: Record<string, number> = {
  pompa: 1000,
  mavam: 1500,
  veuve: 3000,
  moetNir: 3500,
  soumei: 5000,
  angel: 10000,
  armand: 12000,
};

const normalDrinkBack: Record<string, number> = {
  castDrink: 300,
  castJug: 500,
  castShot: 500,
  castMega: 1500,
  castAnejo: 1000,
  castSpirytus: 1000,
};

const companionDrinkBack: Record<string, number> = {
  castDrink: 400,
  castJug: 600,
  castShot: 600,
  castMega: 1600,
  castAnejo: 1100,
  castSpirytus: 1100,
};

function eventBackPerCup(productId: string) {
  const lower = productId.toLowerCase();

  if (
    productId.startsWith("ferris") ||
    productId.startsWith("heart")
  ) {
    if (
      lower.includes("tequilakleiner") ||
      lower.includes("mix")
    ) {
      return 700;
    }
    if (lower.includes("kleiner")) return 600;
    if (lower.includes("soft")) return 400;
    if (lower.includes("ginger")) return 500;
    return 800;
  }

  if (productId.startsWith("roulette")) {
    if (lower.includes("kleiner")) return 600;
    if (lower.includes("soft")) return 400;
    if (lower.includes("ginger")) return 500;
    return 700;
  }

  if (lower.includes("cocabombcola")) return 600;
  if (lower.includes("cocabomb")) return 700;

  return 0;
}

export function getBusinessDate(value: Date) {
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

function getMinutes(
  clockIn: string | null,
  clockOut: string | null,
  currentTime: number,
  businessDate: string,
) {
  if (!clockIn) return 0;

  const startDate = new Date(clockIn);

  if (getBusinessDate(startDate) !== businessDate) {
    return 0;
  }

  const start = startDate.getTime();
  const end = clockOut
    ? new Date(clockOut).getTime()
    : currentTime;

  return Math.max(
    0,
    Math.floor((end - start) / 60000),
  );
}

function ticketIsForBusinessDate(
  ticket: Ticket | ClosedTicket,
  businessDate: string,
) {
  if ("closedAt" in ticket && ticket.closedAt) {
    return (
      getBusinessDate(new Date(ticket.closedAt)) ===
      businessDate
    );
  }

  return (
    getBusinessDate(new Date(ticket.startedAt)) ===
    businessDate
  );
}

export function calculatePayrollSnapshotRows({
  businessDate,
  staff,
  closedTickets,
  activeTickets,
  currentTime,
  adjustments,
  payments,
}: {
  businessDate: string;
  staff: Staff[];
  closedTickets: ClosedTicket[];
  activeTickets: Ticket[];
  currentTime: number;
  adjustments: PayrollAdjustment[];
  payments: PayrollPayment[];
}): PayrollSnapshotRow[] {
  const tickets: Ticket[] = [
    ...closedTickets.filter((ticket) =>
      ticketIsForBusinessDate(ticket, businessDate),
    ),
    ...activeTickets.filter((ticket) =>
      ticketIsForBusinessDate(ticket, businessDate),
    ),
  ];

  const dayAdjustments = adjustments.filter(
    (item) =>
      getBusinessDate(new Date(item.createdAt)) ===
      businessDate,
  );

  const dayPayments = payments.filter(
    (item) =>
      getBusinessDate(new Date(item.paidAt)) ===
      businessDate,
  );

  return staff
    .map((person) => {
      const minutes = getMinutes(
        person.clockIn,
        person.clockOut,
        currentTime,
        businessDate,
      );

      const hourly = Math.floor(
        (minutes * person.hourlyWage) / 60,
      );

      let drink = 0;
      let champagne = 0;
      let event = 0;

      for (const ticket of tickets) {
        const companionSeat = ticket.orders.some(
          (order) =>
            order.productId === "companion",
        );

        const drinkTable = companionSeat
          ? companionDrinkBack
          : normalDrinkBack;

        for (const order of ticket.orders) {
          if (
            order.assignedStaffIds?.includes(
              person.id,
            ) &&
            drinkTable[order.productId]
          ) {
            drink +=
              drinkTable[order.productId] *
              order.quantity;
          }

          const totalChampagneBack =
            champagneBack[order.productId];

          if (
            totalChampagneBack &&
            order.assignedStaffIds?.includes(
              person.id,
            )
          ) {
            const assignedCount =
              order.assignedStaffIds.length;

            champagne +=
              Math.floor(
                totalChampagneBack /
                  assignedCount /
                  100,
              ) *
              100 *
              order.quantity;
          }

          const cups =
            order.eventCups?.[person.id] ?? 0;

          event +=
            cups *
            eventBackPerCup(order.productId);

          if (
            order.representativeStaffId ===
            person.id
          ) {
            event += 1000;
          }
        }
      }

      const staffAdjustments =
        dayAdjustments.filter(
          (item) =>
            item.staffId === person.id,
        );

      const reservationFromTickets =
        tickets.reduce((total, ticket) => {
          const quantity = (
            ticket.reservationEntries ?? []
          )
            .filter(
              (entry) =>
                entry.staffId === person.id,
            )
            .reduce(
              (subtotal, entry) =>
                subtotal + entry.quantity,
              0,
            );

          return total + quantity * 300;
        }, 0);

      const legacyReservation =
        staffAdjustments
          .filter(
            (item) =>
              item.type === "予約",
          )
          .reduce(
            (total, item) =>
              total +
              item.quantity *
                item.unitAmount,
            0,
          );

      const reservation =
        reservationFromTickets +
        legacyReservation;

      const transport =
        staffAdjustments
          .filter(
            (item) =>
              item.type === "送迎",
          )
          .reduce(
            (total, item) =>
              total +
              item.quantity *
                item.unitAmount,
            0,
          );

      const parking =
        staffAdjustments
          .filter(
            (item) =>
              item.type === "駐車場",
          )
          .reduce(
            (total, item) =>
              total +
              item.quantity *
                item.unitAmount,
            0,
          );

      const gross =
        hourly +
        drink +
        champagne +
        event +
        reservation +
        transport +
        parking;

      const paid = dayPayments
        .filter(
          (payment) =>
            payment.staffId === person.id,
        )
        .reduce(
          (total, payment) =>
            total + payment.amount,
          0,
        );

      return {
        businessDate,
        staffId: person.id,
        name: person.name,
        role: person.role,
        paymentCycle: person.paymentCycle,
        hourlyWage: person.hourlyWage,
        minutes,
        hourly,
        drink,
        champagne,
        event,
        reservation,
        transport,
        parking,
        gross,
        paid,
      };
    })
    .filter(
      (row) =>
        row.minutes > 0 ||
        row.gross > 0 ||
        row.paid > 0,
    );
}
