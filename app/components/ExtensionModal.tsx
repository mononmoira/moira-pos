"use client";

type Props = {
  courseId: string;
  onSelect: (minutes: number, price: number) => void;
  onClose: () => void;
};

type ExtensionOption = {
  minutes: number;
  price: number;
};

function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function getOptions(courseId: string): ExtensionOption[] {
 if (
  courseId === "normal" ||
  courseId === "normal30"
) {
  return [
    { minutes: 30, price: 1500 },
    { minutes: 60, price: 3000 },
  ];
}

if (
  courseId === "oneToOne" ||
  courseId === "oneToOne30"
) {
  return [
    { minutes: 30, price: 2000 },
    { minutes: 60, price: 4000 },
  ];
}

if (
  courseId === "bottleKeep" ||
  courseId === "set45"
) {
  return [
    { minutes: 45, price: 1750 },
    { minutes: 90, price: 3500 },
  ];
} 

  return [
    { minutes: 30, price: 1750 },
    { minutes: 60, price: 3500 },
  ];
}

export default function ExtensionModal({
  courseId,
  onSelect,
  onClose,
}: Props) {
  const options = getOptions(courseId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">延長時間を選択</h2>
            <p className="mt-2 text-slate-400">
              選択すると終了時刻と料金へすぐ反映します
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

        <div className="mt-6 grid grid-cols-2 gap-3">
          {options.map((option) => (
            <button
              key={`${option.minutes}-${option.price}`}
              type="button"
              onClick={() =>
                onSelect(option.minutes, option.price)
              }
              className="min-h-28 rounded-2xl bg-orange-700 p-4 text-center font-bold hover:bg-orange-600"
            >
              <span className="block text-3xl">
                {option.minutes}分
              </span>
              <span className="mt-2 block text-lg">
                ＋{formatYen(option.price)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
