"use client";

import { useEffect, useState } from "react";
import type { BusinessSession } from "../page";

type Figures = {
  cashSales: number;
  receivableCollections: number;
  payrollOut: number;
  manualIn: number;
  manualOut: number;
  expected: number;
};

type Props = {
  session: BusinessSession | null;
  closeMode: boolean;
  figures: Figures | null;
  onStart: (openingAmount: number) => void;
  onAddEntry: (type: "入金" | "出金", amount: number, note: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onCloseBusiness: (closingAmount: number) => void;
  onClose: () => void;
};

function yen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

export default function DrawerModal({
  session, closeMode, figures, onStart, onAddEntry, onDeleteEntry, onCloseBusiness, onClose,
}: Props) {
  const [openingAmount, setOpeningAmount] = useState(0);
  const [type, setType] = useState<"入金" | "出金">("出金");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [closingAmount, setClosingAmount] = useState(figures?.expected ?? 0);

  useEffect(() => {
    if (figures) setClosingAmount(figures.expected);
  }, [figures]);

  return (
    <div className="fixed inset-0 z-[115] overflow-y-auto bg-black/90 p-4">
      <div className="mx-auto my-4 w-full max-w-4xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-3xl font-black">ドロア管理</h2><p className="mt-2 text-slate-400">営業開始金・買い物・その他入出金・締め金額</p></div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-700 px-5 py-3 font-bold">閉じる</button>
        </div>

        {!session ? (
          <section className="mt-6 rounded-2xl bg-slate-800 p-5">
            <h3 className="text-2xl font-bold">営業開始</h3>
            <label className="mt-4 block font-bold">開始時のドロア金額</label>
            <input type="number" min={0} value={openingAmount} onChange={(e)=>setOpeningAmount(Number(e.target.value))} className="mt-2 w-full rounded-xl bg-slate-700 p-4 text-2xl"/>
            <button type="button" onClick={()=>onStart(openingAmount)} className="mt-4 min-h-14 w-full rounded-xl bg-emerald-700 p-4 text-xl font-bold">この金額で営業開始</button>
          </section>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-800 p-4"><p className="text-slate-400">開始金</p><p className="mt-1 text-xl font-bold">{yen(session.openingAmount)}</p></div>
              <div className="rounded-xl bg-slate-800 p-4"><p className="text-slate-400">現金売上</p><p className="mt-1 text-xl font-bold">{yen(figures?.cashSales ?? 0)}</p></div>
              <div className="rounded-xl bg-slate-800 p-4"><p className="text-slate-400">給与支払</p><p className="mt-1 text-xl font-bold text-red-300">-{yen(figures?.payrollOut ?? 0)}</p></div>
              <div className="rounded-xl bg-orange-950 p-4"><p className="text-orange-200">現在予定額</p><p className="mt-1 text-2xl font-black">{yen(figures?.expected ?? 0)}</p></div>
            </div>

            {!closeMode && (
              <section className="mt-5 rounded-2xl bg-slate-800 p-5">
                <h3 className="text-2xl font-bold">営業中の金額変動</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button type="button" onClick={()=>setType("入金")} className={`rounded-xl p-3 font-bold ${type==="入金"?"bg-emerald-700":"bg-slate-700"}`}>その他入金</button>
                  <button type="button" onClick={()=>setType("出金")} className={`rounded-xl p-3 font-bold ${type==="出金"?"bg-red-700":"bg-slate-700"}`}>買い物・その他出金</button>
                </div>
                <input type="number" min={0} value={amount} onChange={(e)=>setAmount(Number(e.target.value))} placeholder="金額" className="mt-3 w-full rounded-xl bg-slate-700 p-3 text-xl"/>
                <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="内容（例：氷購入、雑収入）" className="mt-3 w-full rounded-xl bg-slate-700 p-3"/>
                <button type="button" onClick={()=>{if(amount<=0)return;onAddEntry(type,amount,note);setAmount(0);setNote("");}} className="mt-3 w-full rounded-xl bg-blue-700 p-3 font-bold">記録する</button>
              </section>
            )}

            <section className="mt-5 rounded-2xl bg-slate-800 p-5">
              <h3 className="text-xl font-bold">営業中の入出金履歴</h3>
              {session.entries.length===0 ? <p className="mt-3 text-slate-400">記録はありません。</p> : <div className="mt-3 space-y-2">{session.entries.slice().reverse().map(entry=><div key={entry.id} className="flex items-center justify-between rounded-xl bg-slate-700 p-3"><div><p className="font-bold">{entry.note}</p><p className="text-sm text-slate-400">{entry.type}</p></div><div className="flex items-center gap-3"><strong className={entry.type==="入金"?"text-emerald-300":"text-red-300"}>{entry.type==="入金"?"+":"-"}{yen(entry.amount)}</strong><button type="button" onClick={()=>onDeleteEntry(entry.id)} className="rounded-lg bg-red-900 px-3 py-2 text-sm">取消</button></div></div>)}</div>}
            </section>

            {closeMode && (
              <section className="mt-5 rounded-2xl border-2 border-red-600 bg-red-950/40 p-5">
                <h3 className="text-2xl font-bold">営業終了</h3>
                <p className="mt-2">ドロア予定額：<strong>{yen(figures?.expected ?? 0)}</strong></p>
                <label className="mt-4 block font-bold">実際に数えたドロア金額</label>
                <input type="number" min={0} value={closingAmount} onChange={(e)=>setClosingAmount(Number(e.target.value))} className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-2xl"/>
                <p className="mt-3 text-xl">過不足：<strong>{closingAmount-(figures?.expected??0)>=0?"+":""}{yen(closingAmount-(figures?.expected??0))}</strong></p>
                <button type="button" onClick={()=>onCloseBusiness(closingAmount)} className="mt-4 min-h-14 w-full rounded-xl bg-red-700 p-4 text-xl font-bold">この金額で営業終了</button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
