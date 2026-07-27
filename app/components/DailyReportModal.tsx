"use client";

import type { PaymentMethod } from "./PaymentModal";
import { useMemo, useState } from "react";
import type {
  BusinessSession,
  ClosedTicket,
  PayrollAdjustment,
  PayrollPayment,
} from "../page";
import type { Staff } from "./StaffModal";

type Props = {
  closedTickets: ClosedTicket[];
  activeTicketCount: number;
  staff: Staff[];
  adjustments: PayrollAdjustment[];
  payments: PayrollPayment[];
  currentTime: number;
  businessSession: BusinessSession | null;
  onOpenBackup?: () => void;
  onClose?: () => void;
  embedded?: boolean;
};

type DetailRow = {
  label: string;
  quantityLabel: string;
  quantity: number;
  unit: number;
  total: number;
  order: number;
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
};

const companionDrinkBack: Record<string, number> = {
  castDrink: 400,
  castJug: 600,
  castShot: 600,
  castMega: 1600,
  castAnejo: 1100,
};

const normalDrinkLabels: Record<string, string> = {
  castDrink: "通常ドリンク",
  castJug: "ジョッキ",
  castShot: "ショット",
  castMega: "メガジョッキ",
  castAnejo: "アネホ",
};
const BACK_EXCLUDED_STAFF = [
  "azusa",
  "owner",
];

const companionDrinkLabels: Record<string, string> = {
  castDrink: "同伴通常ドリンク",
  castJug: "同伴ジョッキ",
  castShot: "同伴ショット",
  castMega: "同伴メガジョッキ",
  castAnejo: "同伴アネホ",
};

function eventBackPerCup(id: string) {
  const lower = id.toLowerCase();

  if (
    id.startsWith("ferris") ||
    id.startsWith("heart")
  ) {
    if (
      lower.includes("tequilakleiner") ||
      lower.includes("mix")
    ) {
      return 700;
    }

    if (lower.includes("kleiner")) {
      return 600;
    }

    if (lower.includes("soft")) {
      return 400;
    }

    if (lower.includes("ginger")) {
      return 500;
    }

    return 800;
  }

  if (id.startsWith("roulette")) {
    if (lower.includes("kleiner")) {
      return 600;
    }

    if (lower.includes("soft")) {
      return 400;
    }

    if (lower.includes("ginger")) {
      return 500;
    }

    return 700;
  }

  if (lower.includes("cocabombcola")) {
    return 600;
  }

  if (lower.includes("cocabomb")) {
    return 700;
  }

  return 0;
}

function yen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function getBusinessDate(date: Date) {
  const target = new Date(date);

  if (target.getHours() < 8) {
    target.setDate(target.getDate() - 1);
  }

  return [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, "0"),
    String(target.getDate()).padStart(2, "0"),
  ].join("-");
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-");

  return `${year}年${Number(month)}月${Number(day)}日`;
}

function workMinutes(
  clockIn: string | null,
  clockOut: string | null,
  currentTime: number,
) {
  if (!clockIn) {
    return 0;
  }

  const endTime = clockOut
    ? new Date(clockOut).getTime()
    : currentTime;

  return Math.max(
    0,
    Math.floor(
      (endTime - new Date(clockIn).getTime()) /
        60000,
    ),
  );
}

function cleanOrderName(name: string) {
  return name.replace(/（.*?）/g, "");
}

function addDetail(
  map: Map<string, DetailRow>,
  key: string,
  row: DetailRow,
) {
  const current = map.get(key);

  if (current) {
    current.quantity += row.quantity;
    current.total += row.total;
    return;
  }

  map.set(key, { ...row });
}

export default function DailyReportModal({
  closedTickets,
  activeTicketCount,
  staff,
  adjustments,
  payments,
  currentTime,
  businessSession,
  onOpenBackup,
  onClose,
  embedded = false,
}: Props) {
  const [tab, setTab] = useState<
    "sales" | "backs"
  >("sales");

  const today =
    businessSession?.businessDate ??
    getBusinessDate(new Date());

  const tickets = closedTickets.filter(
    (ticket) =>
      getBusinessDate(
        new Date(ticket.closedAt),
      ) === today,
  );

  const totalSales = tickets.reduce(
    (sum, ticket) => sum + ticket.total,
    0,
  );

  const guests = tickets.reduce(
    (sum, ticket) => sum + ticket.guests,
    0,
  );
  const customerUnitPrice =
    guests > 0
      ? Math.floor(totalSales / guests)
      : 0;

  const paymentTotals: Record<PaymentMethod, number> = {
    現金: 0,
    Squareカード: 0,
    QR: 0,
    売掛: 0,
  };

tickets.forEach((ticket) => {
  ticket.payments.forEach((payment) => {
    switch (payment.method) {
      case "現金":
        paymentTotals.現金 += payment.amount;
        break;

      case "Squareカード":
        paymentTotals.Squareカード += payment.amount;
        break;

      case "QR":
        paymentTotals.QR += payment.amount;
        break;

      case "売掛":
        paymentTotals.売掛 += payment.amount;
        break;
    }
  });
});

  const productRows = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        qty: number;
        sales: number;
        back: number;
        details: string[];
      }
    >();

    for (const ticket of tickets) {
      const companionStaffIds = new Set(
  ticket.orders
    .filter(
      (order) =>
        order.productId === "companion",
    )
    .flatMap(
      (order) =>
        order.assignedStaffIds ?? [],
    ),
);


      for (const order of ticket.orders) {
        let back = 0;
        const details: string[] = [];

       if (
  normalDrinkBack[order.productId] &&
  order.assignedStaffIds?.length
) {
  const assignedStaffIds =
    order.assignedStaffIds;

  back =
    assignedStaffIds.reduce(
      (total, staffId) => {
        const isCompanionStaff =
          companionStaffIds.has(staffId);

        const unit = isCompanionStaff
          ? companionDrinkBack[
              order.productId
            ]
          : normalDrinkBack[
              order.productId
            ];

        return (
          total +
          unit * order.quantity
        );
      },
      0,
    );

  details.push(
    assignedStaffIds
      .map((staffId) => {
        const staffName =
          staff.find(
            (person) =>
              person.id === staffId,
          )?.name ?? staffId;

        const isCompanionStaff =
          companionStaffIds.has(staffId);

        return `${staffName}／${
          isCompanionStaff
            ? "同伴ドリンク"
            : "通常ドリンク"
        }`;
      })
      .join("・"),
  );
}

        if (
          champagneBack[order.productId] &&
          order.assignedStaffIds?.length
        ) {
          const each = Math.floor(
            champagneBack[order.productId] /
              order.assignedStaffIds.length /
              100,
          ) * 100;

          back =
            each *
            order.assignedStaffIds.length *
            order.quantity;

          details.push(
            `${
              order.assignedStaffIds
                .map(
                  (id) =>
                    staff.find(
                      (person) =>
                        person.id === id,
                    )?.name ?? id,
                )
                .join("・")
            }／1人${yen(each)}`,
          );
        }

        if (order.eventCups) {
          for (const [id, cups] of Object.entries(
            order.eventCups,
          )) {
            back +=
              cups *
              eventBackPerCup(order.productId);

            details.push(
              `${
                staff.find(
                  (person) =>
                    person.id === id,
                )?.name ?? id
              } ${cups}杯`,
            );
          }
        }

        if (order.representativeStaffId) {
          back += 1000;

          details.push(
            `指名料 ${
              staff.find(
                (person) =>
                  person.id ===
                  order.representativeStaffId,
              )?.name ??
              order.representativeStaffId
            } 1,000円`,
          );
        }

        const key = order.productId;
        const current = map.get(key) ?? {
          name: cleanOrderName(order.name),
          qty: 0,
          sales: 0,
          back: 0,
          details: [],
        };

        current.qty += order.quantity;
        current.sales +=
          order.price * order.quantity;
        current.back += back;
        current.details.push(...details);

        map.set(key, current);
      }
    }

    return [...map.values()].sort(
      (a, b) => b.sales - a.sales,
    );
  }, [tickets, staff]);

  const staffRows = useMemo(
    () =>
      staff.map((person) => {
        if (BACK_EXCLUDED_STAFF.includes(person.id)) {
  return {
    person,
    mins: workMinutes(
      person.clockIn,
      person.clockOut,
      currentTime,
    ),
    hourly: Math.floor(
      (workMinutes(
        person.clockIn,
        person.clockOut,
        currentTime,
      ) * person.hourlyWage) / 60,
    ),
    drink: 0,
    champagne: 0,
    event: 0,
    reservation: 0,
    transport: 0,
    parking: 0,
    gross: Math.floor(
      (workMinutes(
        person.clockIn,
        person.clockOut,
        currentTime,
      ) * person.hourlyWage) / 60,
    ),
    paid: 0,
    details: [],
  };
}
        let drink = 0;
        let champagne = 0;
        let event = 0;
        let reservation = 0;

        const detailMap = new Map<
          string,
          DetailRow
        >();

        for (const ticket of tickets) {
          const isCompanionStaff = ticket.orders.some(
  (order) =>
    order.productId === "companion" &&
    order.assignedStaffIds?.includes(person.id),
);

const drinkTable = isCompanionStaff
  ? companionDrinkBack
  : normalDrinkBack;

const drinkLabels = isCompanionStaff
  ? companionDrinkLabels
  : normalDrinkLabels;

          for (const order of ticket.orders) {
            if (
              order.assignedStaffIds?.includes(
                person.id,
              ) &&
              drinkTable[order.productId]
            ) {
              const unit =
                drinkTable[order.productId];

              const total =
                unit * order.quantity;

              drink += total;

              const label =
                drinkLabels[order.productId] ??
                cleanOrderName(order.name);

              addDetail(
                detailMap,
                `drink-${isCompanionStaff}-${order.productId}-${unit}`,
                {
                  label,
                  quantityLabel: "杯",
                  quantity: order.quantity,
                  unit,
                  total,
                  order: isCompanionStaff ? 20 : 10,
                },
              );
            }

            if (
              champagneBack[order.productId] &&
              order.assignedStaffIds?.includes(
                person.id,
              )
            ) {
              const unit = Math.floor(
                champagneBack[order.productId] /
                  order.assignedStaffIds.length /
                  100,
              ) * 100;

              const total =
                unit * order.quantity;

              champagne += total;

              addDetail(
                detailMap,
                `champagne-${order.productId}-${unit}`,
                {
                  label: cleanOrderName(
                    order.name,
                  ),
                  quantityLabel: "本",
                  quantity: order.quantity,
                  unit,
                  total,
                  order: 30,
                },
              );
            }

            const cups =
              order.eventCups?.[person.id] ?? 0;

            if (cups > 0) {
              const unit = eventBackPerCup(
                order.productId,
              );

              const total = cups * unit;

              event += total;

              addDetail(
                detailMap,
                `event-${order.productId}-${unit}`,
                {
                  label: cleanOrderName(
                    order.name,
                  ),
                  quantityLabel: "杯",
                  quantity: cups,
                  unit,
                  total,
                  order: 40,
                },
              );
            }

            if (
              order.representativeStaffId ===
              person.id
            ) {
              event += 1000;

              addDetail(
                detailMap,
                "event-nomination-fee",
                {
                  label: "イベント指名料",
                  quantityLabel: "回",
                  quantity: 1,
                  unit: 1000,
                  total: 1000,
                  order: 50,
                },
              );
            }
          }

          const reservationPeople = (
            ticket.reservationEntries ?? []
          )
            .filter(
              (entry) =>
                entry.staffId === person.id,
            )
            .reduce(
              (sum, entry) =>
                sum + entry.quantity,
              0,
            );

          if (reservationPeople > 0) {
            const total =
              reservationPeople * 300;

            reservation += total;

            addDetail(
              detailMap,
              "reservation",
              {
                label: "予約",
                quantityLabel: "人",
                quantity: reservationPeople,
                unit: 300,
                total,
                order: 60,
              },
            );
          }
        }

        const dayAdjustments =
          adjustments.filter(
            (adjustment) =>
              adjustment.staffId ===
                person.id &&
              getBusinessDate(
                new Date(
                  adjustment.createdAt,
                ),
              ) === today,
          );

        const transportQuantity =
          dayAdjustments
            .filter(
              (adjustment) =>
                adjustment.type === "送迎",
            )
            .reduce(
              (sum, adjustment) =>
                sum + adjustment.quantity,
              0,
            );

        const transport =
          dayAdjustments
            .filter(
              (adjustment) =>
                adjustment.type === "送迎",
            )
            .reduce(
              (sum, adjustment) =>
                sum +
                adjustment.quantity *
                  adjustment.unitAmount,
              0,
            );

        if (transportQuantity > 0) {
          addDetail(
            detailMap,
            "transport",
            {
              label: "送迎",
              quantityLabel: "人",
              quantity: transportQuantity,
              unit: 500,
              total: transport,
              order: 70,
            },
          );
        }

        const parkingQuantity =
          dayAdjustments
            .filter(
              (adjustment) =>
                adjustment.type ===
                "駐車場",
            )
            .reduce(
              (sum, adjustment) =>
                sum + adjustment.quantity,
              0,
            );

        const parking =
          dayAdjustments
            .filter(
              (adjustment) =>
                adjustment.type ===
                "駐車場",
            )
            .reduce(
              (sum, adjustment) =>
                sum +
                adjustment.quantity *
                  adjustment.unitAmount,
              0,
            );

        if (parkingQuantity > 0) {
          addDetail(
            detailMap,
            "parking",
            {
              label: "駐車場",
              quantityLabel: "回",
              quantity: parkingQuantity,
              unit: 500,
              total: parking,
              order: 80,
            },
          );
        }

        const mins = workMinutes(
          person.clockIn,
          person.clockOut,
          currentTime,
        );

        const hourly = Math.floor(
          (mins * person.hourlyWage) / 60,
        );

        const gross =
          hourly +
          drink +
          champagne +
          event +
          reservation +
          transport +
          parking;

        const paid = payments
          .filter(
            (payment) =>
              payment.staffId === person.id &&
              getBusinessDate(
                new Date(payment.paidAt),
              ) === today,
          )
          .reduce(
            (sum, payment) =>
              sum + payment.amount,
            0,
          );

        const details = [
          ...detailMap.values(),
        ].sort(
          (a, b) =>
            a.order - b.order ||
            a.label.localeCompare(
              b.label,
              "ja",
            ),
        );

        return {
          person,
          mins,
          hourly,
          drink,
          champagne,
          event,
          reservation,
          transport,
          parking,
          gross,
          paid,
          details,
        };
      }),
    [
      staff,
      tickets,
      adjustments,
      payments,
      currentTime,
      today,
    ],
  );

  return (
    <div
      className={
        embedded
          ? ""
          : "fixed inset-0 z-[80] overflow-y-auto bg-black/90 p-4"
      }
    >
      <div
        className={
          embedded
            ? "w-full text-white"
            : "mx-auto my-4 w-full max-w-7xl rounded-3xl bg-slate-900 p-6 text-white"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black">
              営業日報・バック明細
            </h2>

            <p className="mt-2 text-slate-400">
              {displayDate(today)}営業分
            </p>
          </div>

          {!embedded && (
            <div className="flex gap-2">
              {onOpenBackup && (
                <button
                  type="button"
                  onClick={onOpenBackup}
                  className="rounded-xl bg-sky-700 px-5 py-3 font-bold"
                >
                  バックアップ
                </button>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
                >
                  閉じる
                </button>
              )}
            </div>
          )}
        </div>

        {activeTicketCount > 0 && (
          <p className="mt-4 rounded-xl bg-yellow-900 p-4">
            使用中伝票が
            {activeTicketCount}件あります。
            会計終了分だけ集計しています。
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <div className="rounded-xl bg-blue-900 p-4">
            <p>売上合計</p>
            <strong className="text-2xl">
              {yen(totalSales)}
            </strong>
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <p>組数</p>
            <strong className="text-2xl">
              {tickets.length}組
            </strong>
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <p>人数</p>
            <strong className="text-2xl">
              {guests}名
            </strong>
          </div>

          <div className="rounded-xl bg-violet-900 p-4">
            <p>客単価</p>
            <strong className="text-2xl">
              {yen(customerUnitPrice)}
            </strong>
          </div>

          {Object.entries(paymentTotals)
            .slice(0, 2)
            .map(([name, value]) => (
              <div
                key={name}
                className="rounded-xl bg-slate-800 p-4"
              >
                <p>{name}</p>
                <strong className="text-xl">
                  {yen(value)}
                </strong>
              </div>
            ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTab("sales")}
            className={`rounded-xl p-4 text-xl font-bold ${
              tab === "sales"
                ? "bg-blue-700"
                : "bg-slate-800"
            }`}
          >
            売上・商品明細
          </button>

          <button
            type="button"
            onClick={() => setTab("backs")}
            className={`rounded-xl p-4 text-xl font-bold ${
              tab === "backs"
                ? "bg-amber-700"
                : "bg-slate-800"
            }`}
          >
            スタッフ別バック明細
          </button>
        </div>

        {tab === "sales" ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="p-3">商品</th>
                  <th>数量</th>
                  <th>売上</th>
                  <th>バック合計</th>
                  <th>担当・配分</th>
                </tr>
              </thead>

              <tbody>
                {productRows.map(
                  (row, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-700 bg-slate-800"
                    >
                      <td className="p-3 font-bold">
                        {row.name}
                      </td>
                      <td>{row.qty}</td>
                      <td>{yen(row.sales)}</td>
                      <td className="text-amber-300">
                        {yen(row.back)}
                      </td>
                      <td className="text-sm text-slate-300">
                        {row.details.join("／") ||
                          "-"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {staffRows.map((row) => (
              <section
                key={row.person.id}
                className="rounded-2xl bg-slate-800 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold">
                      {row.person.name}
                    </h3>

                    <p className="text-slate-400">
                      勤務{" "}
                      {Math.floor(
                        row.mins / 60,
                      )}
                      時間
                      {row.mins % 60}分・時給分{" "}
                      {yen(row.hourly)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-amber-300">
                      総支給{" "}
                      <strong className="text-2xl">
                        {yen(row.gross)}
                      </strong>
                    </p>

                    <p className="text-sm">
                      支払済み {yen(row.paid)}
                      ／未払い{" "}
                      {yen(
                        Math.max(
                          0,
                          row.gross -
                            row.paid,
                        ),
                      )}
                    </p>
                  </div>
                </div>

                {row.details.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-slate-700 p-4 text-slate-400">
                    バック明細はありません。
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="text-left text-slate-400">
                        <tr>
                          <th className="p-3">
                            バック項目
                          </th>
                          <th>数量</th>
                          <th>単価</th>
                          <th>金額</th>
                        </tr>
                      </thead>

                      <tbody>
                        {row.details.map(
                          (detail, index) => (
                            <tr
                              key={`${detail.label}-${index}`}
                              className="border-t border-slate-700"
                            >
                              <td className="p-3 font-bold">
                                {detail.label}
                              </td>
                              <td>
                                {detail.quantity}
                                {detail.quantityLabel}
                              </td>
                              <td>
                                {yen(detail.unit)}
                              </td>
                              <td className="font-bold text-amber-300">
                                {yen(detail.total)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap justify-end gap-4 rounded-xl bg-slate-900 p-4">
                  <span>
                    ドリンク合計{" "}
                    <strong>
                      {yen(row.drink)}
                    </strong>
                  </span>
                  <span>
                    シャンパン合計{" "}
                    <strong>
                      {yen(row.champagne)}
                    </strong>
                  </span>
                  <span>
                    イベント合計{" "}
                    <strong>
                      {yen(row.event)}
                    </strong>
                  </span>
                  <span>
                    予約合計{" "}
                    <strong>
                      {yen(row.reservation)}
                    </strong>
                  </span>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
