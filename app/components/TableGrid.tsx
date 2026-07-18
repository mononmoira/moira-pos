"use client";

export type Seat = {
  id: number;
  name: string;
};

export type TableTicket = {
  id: string;
  seatId: number;
  guests: number;
  courseName: string;
  startedAt: string;
  endAt: string;
  total: number;
  balance: number;
};

type Props = {
  seats: Seat[];
  tickets: TableTicket[];
  currentTime: number;
  onSelectTicket: (ticketId: string) => void;
};

function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatRemaining(endAt: string, currentTime: number) {
  const minutes = Math.ceil(
    (new Date(endAt).getTime() - currentTime) / 60000,
  );

  if (minutes < 0) return `${Math.abs(minutes)}分超過`;
  return `残り${minutes}分`;
}

export default function TableGrid({
  seats,
  tickets,
  currentTime,
  onSelectTicket,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {seats.map((seat) => {
        const ticket = tickets.find(
          (item) => item.seatId === seat.id,
        );

        if (!ticket) {
          return (
            <div
              key={seat.id}
              className="min-h-40 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/40 p-4"
            >
              <p className="text-2xl font-bold">{seat.name}</p>
              <p className="mt-5 text-slate-500">空席</p>
            </div>
          );
        }

        const minutes = Math.ceil(
          (new Date(ticket.endAt).getTime() - currentTime) / 60000,
        );

        const warning =
          minutes <= 5
            ? "bg-red-800 animate-pulse"
            : minutes <= 10
              ? "bg-yellow-700"
              : "bg-purple-700";

        return (
          <button
            key={seat.id}
            type="button"
            onClick={() => onSelectTicket(ticket.id)}
            className={`min-h-40 rounded-2xl p-4 text-left ${warning}`}
          >
            <p className="text-2xl font-black">{seat.name}</p>
            <p className="mt-1">{ticket.guests}名</p>
            <p className="mt-3 text-xl font-bold">
              {formatRemaining(ticket.endAt, currentTime)}
            </p>
            <p className="mt-2 text-base">
              未会計 {formatYen(ticket.balance)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
