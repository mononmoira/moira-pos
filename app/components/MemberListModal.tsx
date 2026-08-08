"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";

import { memberDb } from "../lib/memberFirebase";

type Props = {
  onClose: () => void;
};

type MemberRow = {
  uid: string;
  memberNo: string;
  name: string;
  rank: string;
  point: number;
  birthday: string;
  visitCount: number;
  lastVisitAt: unknown;
};

function formatDate(value: unknown) {
  if (!value) return "なし";

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate ===
      "function"
  ) {
    return (
      value as { toDate: () => Date }
    )
      .toDate()
      .toLocaleDateString("ja-JP");
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("ja-JP");
}

export default function MemberListModal({
  onClose,
}: Props) {
  const [members, setMembers] =
    useState<MemberRow[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [search, setSearch] =
    useState("");
  const [
    selectedUid,
    setSelectedUid,
  ] = useState<string | null>(null);

  async function loadMembers() {
    setLoading(true);

    try {
      const snapshot =
        await getDocs(
          collection(memberDb, "users"),
        );

      const nextMembers =
        snapshot.docs
          .map((memberDoc) => {
            const data =
              memberDoc.data();

            return {
              uid: memberDoc.id,
              memberNo:
                typeof data.memberNo === "string"
                  ? data.memberNo
                  : "",
              name:
                typeof data.name === "string"
                  ? data.name
                  : "名前未設定",
              rank:
                typeof data.rank === "string"
                  ? data.rank
                  : "Bronze",
              point:
                typeof data.point === "number"
                  ? data.point
                  : 0,
              birthday:
                typeof data.birthday === "string"
                  ? data.birthday
                  : "",
              visitCount:
                typeof data.visitCount === "number"
                  ? data.visitCount
                  : 0,
              lastVisitAt:
                data.lastVisitAt ??
                data.lastVisit ??
                null,
            } satisfies MemberRow;
          })
          .sort((a, b) => {
            if (a.memberNo && b.memberNo) {
              return a.memberNo.localeCompare(
                b.memberNo,
                "ja",
              );
            }

            return a.name.localeCompare(
              b.name,
              "ja",
            );
          });

      setMembers(nextMembers);
    } catch (error) {
      console.error(
        "会員一覧の取得に失敗しました。",
        error,
      );

      alert(
        "会員一覧を取得できませんでした。",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  const filteredMembers =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return members;
      }

      return members.filter(
        (member) =>
          member.name
            .toLowerCase()
            .includes(keyword) ||
          member.memberNo
            .toLowerCase()
            .includes(keyword),
      );
    }, [members, search]);

  const selectedMember =
    members.find(
      (member) =>
        member.uid === selectedUid,
    ) ?? null;

  return (
    <div className="fixed inset-0 z-[165] overflow-y-auto bg-black/90 p-3 sm:p-5">
      <div className="mx-auto w-full max-w-6xl rounded-3xl bg-slate-900 p-5 text-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">
              会員一覧
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Moira会員アプリの登録会員
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void loadMembers()
              }
              disabled={loading}
              className="rounded-xl bg-blue-700 px-4 py-3 font-bold disabled:bg-slate-700"
            >
              更新
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
            >
              閉じる
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="名前・会員番号で検索"
            className="w-full rounded-xl bg-slate-800 p-4"
          />

          <div className="rounded-xl bg-slate-950 px-5 py-3 text-center">
            <p className="text-xs text-slate-400">
              登録会員
            </p>
            <p className="text-xl font-black text-violet-300">
              {members.length}名
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 rounded-2xl bg-slate-800 p-8 text-center font-bold">
            会員一覧を読み込んでいます...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-950 p-8 text-center text-slate-400">
            該当する会員がいません。
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700">
            <div className="hidden grid-cols-[1.1fr_1.5fr_.8fr_.9fr_.8fr_1fr] gap-2 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-400 md:grid">
              <span>会員番号</span>
              <span>名前</span>
              <span>ランク</span>
              <span>ポイント</span>
              <span>来店</span>
              <span>最終来店</span>
            </div>

            <div className="max-h-[58vh] overflow-y-auto">
              {filteredMembers.map(
                (member) => (
                  <button
                    key={member.uid}
                    type="button"
                    onClick={() =>
                      setSelectedUid(
                        member.uid,
                      )
                    }
                    className="grid w-full gap-2 border-t border-slate-800 bg-slate-900 px-4 py-4 text-left hover:bg-slate-800 md:grid-cols-[1.1fr_1.5fr_.8fr_.9fr_.8fr_1fr]"
                  >
                    <div>
                      <span className="text-xs text-slate-500 md:hidden">
                        会員番号
                      </span>
                      <p className="font-bold">
                        {member.memberNo ||
                          "未設定"}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 md:hidden">
                        名前
                      </span>
                      <p className="font-black">
                        {member.name} 様
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 md:hidden">
                        ランク
                      </span>
                      <p className="font-bold text-violet-300">
                        {member.rank}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 md:hidden">
                        ポイント
                      </span>
                      <p className="font-bold text-yellow-300">
                        {member.point.toLocaleString(
                          "ja-JP",
                        )}
                        pt
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 md:hidden">
                        来店回数
                      </span>
                      <p className="font-bold">
                        {member.visitCount}回
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 md:hidden">
                        最終来店
                      </span>
                      <p className="font-bold">
                        {formatDate(
                          member.lastVisitAt,
                        )}
                      </p>
                    </div>
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {selectedMember && (
          <div className="mt-5 rounded-2xl border border-violet-500/30 bg-violet-950/30 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-violet-300">
                  {selectedMember.memberNo ||
                    "会員番号未設定"}
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  {selectedMember.name} 様
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedUid(null)
                }
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold"
              >
                詳細を閉じる
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-xs text-slate-400">
                  ランク
                </p>
                <p className="mt-1 font-black text-violet-300">
                  {selectedMember.rank}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-xs text-slate-400">
                  ポイント
                </p>
                <p className="mt-1 font-black text-yellow-300">
                  {selectedMember.point.toLocaleString(
                    "ja-JP",
                  )}
                  pt
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-xs text-slate-400">
                  来店回数
                </p>
                <p className="mt-1 font-black">
                  {selectedMember.visitCount}回
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-xs text-slate-400">
                  誕生日
                </p>
                <p className="mt-1 font-black">
                  {selectedMember.birthday ||
                    "未登録"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-xs text-slate-400">
                  最終来店
                </p>
                <p className="mt-1 font-black">
                  {formatDate(
                    selectedMember.lastVisitAt,
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}