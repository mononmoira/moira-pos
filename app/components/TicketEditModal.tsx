"use client";

type CourseOption = {
  id: string;
  name: string;
  minutes: number;
  price: number;
};

type Props = {
  courses: CourseOption[];
  currentCourseId: string;
  extensionCourseId?: string;
  onChangeCourse: (courseId: string) => void;
  onChangeExtensionCourse: (courseId: string) => void;
  onClose: () => void;
};

function formatYen(value: number) {
  const sign = value > 0 ? "＋" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toLocaleString("ja-JP")}円`;
}

export default function TicketEditModal({
  courses,
  currentCourseId,
  extensionCourseId,
  onChangeCourse,
  onChangeExtensionCourse,
  onClose,
}: Props) {
  const currentCourse = courses.find(
    (course) => course.id === currentCourseId,
  );

  const currentExtensionCourse =
    courses.find(
      (course) =>
        course.id ===
        (extensionCourseId ?? currentCourseId),
    ) ?? currentCourse;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black">
              伝票修正
            </h2>
            <p className="mt-2 text-slate-400">
              セット料金や延長料金を変更します
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

        <section className="mt-6 rounded-2xl bg-slate-950 p-4">
          <h3 className="text-xl font-bold">
            セット変更
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            現在：
            {currentCourse?.name ?? "不明"}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            変更した場合は現在料金との差額だけを加算します。
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {courses.map((course) => {
              const difference =
                course.price -
                (currentCourse?.price ?? 0);

              const selected =
                course.id === currentCourseId;

              return (
                <button
                  key={course.id}
                  type="button"
                  disabled={selected}
                  onClick={() => {
                    const message =
                      difference === 0
                        ? `${course.name}へ変更しますか？`
                        : `${course.name}へ変更しますか？\n差額：${formatYen(
                            difference,
                          )}`;

                    if (window.confirm(message)) {
                      onChangeCourse(course.id);
                    }
                  }}
                  className={`min-h-20 rounded-xl p-3 text-left font-bold ${
                    selected
                      ? "bg-emerald-800 text-emerald-100"
                      : "bg-blue-800 hover:bg-blue-700"
                  }`}
                >
                  <span className="block text-lg">
                    {course.name}
                  </span>

                  <span className="mt-1 block text-sm">
                    {selected
                      ? "現在のセット"
                      : `差額 ${formatYen(difference)}`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-slate-950 p-4">
          <h3 className="text-xl font-bold">
            延長コース変更
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            現在：
            {currentExtensionCourse?.name ?? "不明"}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            次回以降の延長料金だけが変わります。
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {courses.map((course) => {
              const selected =
                course.id ===
                (extensionCourseId ?? currentCourseId);

              return (
                <button
                  key={course.id}
                  type="button"
                  disabled={selected}
                  onClick={() =>
                    onChangeExtensionCourse(course.id)
                  }
                  className={`min-h-20 rounded-xl p-3 text-left font-bold ${
                    selected
                      ? "bg-purple-800 text-purple-100"
                      : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  <span className="block text-lg">
                    {course.name}
                  </span>

                  <span className="mt-1 block text-sm">
                    {selected
                      ? "現在の延長コース"
                      : `${course.minutes}分・${course.price.toLocaleString(
                          "ja-JP",
                        )}円`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}