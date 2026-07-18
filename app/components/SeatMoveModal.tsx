"use client";

import type {
  Seat,
  TableTicket,
} from "./TableGrid";

type Props = {
  seats: Seat[];
  tickets: TableTicket[];
  currentSeatId: number;
  onMove: (seatId: number) => void;
  onClose: () => void;
};

export default function SeatMoveModal({
  seats,
  tickets,
  currentSeatId,
  onMove,
  onClose,
}: Props) {
  const occupiedIds = new Set(
    tickets.map((ticket) => ticket.seatId),
  );

  const availableSeats = seats.filter(
    (seat) =>
      seat.id === currentSeatId ||
      !occupiedIds.has(seat.id),
  );

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">
              席移動
            </h2>
            <p className="mt-2 text-slate-400">
              移動先の空席を選択してください
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
          >
            閉じる
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {availableSeats.map((seat) => {
            const current =
              seat.id === currentSeatId;

            return (
              <button
                key={seat.id}
                type="button"
                disabled={current}
                onClick={() => onMove(seat.id)}
                className={`min-h-24 rounded-2xl p-4 text-xl font-bold ${
                  current
                    ? "bg-slate-700 text-slate-400"
                    : "bg-teal-700"
                }`}
              >
                {seat.name}
                <span className="mt-2 block text-sm">
                  {current ? "現在の席" : "ここへ移動"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
