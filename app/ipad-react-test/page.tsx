"use client";

import { useEffect, useState } from "react";

export default function IPadReactTestPage() {
  const [currentTime, setCurrentTime] = useState("--:--:--");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(new Date().toLocaleTimeString("ja-JP"));
    };

    updateClock();
    const timer = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white">
      <section className="w-full max-w-2xl rounded-3xl bg-slate-900 p-8 text-center">
        <h1 className="text-3xl font-black">iPad React Test</h1>
        <p className="my-8 text-5xl font-black">{currentTime}</p>
        <button
          type="button"
          onClick={() => setCount((current) => current + 1)}
          className="min-h-16 w-full rounded-2xl bg-purple-700 p-4 text-2xl font-black active:bg-purple-600"
        >
          カウント: {count}
        </button>
      </section>
    </main>
  );
}