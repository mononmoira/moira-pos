import {
  getApps,
  initializeApp,
} from "firebase/app";

import {
  getAuth,
  signInAnonymously,
} from "firebase/auth";

import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

// Moira-DAYS2 シフト管理アプリ用 Firebase
const shiftFirebaseConfig = {
  apiKey:
    "AIzaSyBSj0VYyJgyUroSNO90ty8RBRnqKqgykZs",
  authDomain:
    "moira-days2.firebaseapp.com",
  projectId:
    "moira-days2",
  storageBucket:
    "moira-days2.firebasestorage.app",
  messagingSenderId:
    "252386286539",
  appId:
    "1:252386286539:web:c7c5d8503107c79a62b44e",
};

// Moira POS本体とは別のFirebaseアプリとして起動
const shiftApp =
  getApps().find(
    (app) => app.name === "moira-days2",
  ) ??
  initializeApp(
    shiftFirebaseConfig,
    "moira-days2",
  );

export const shiftDb =
  getFirestore(shiftApp);

const shiftAuth =
  getAuth(shiftApp);

// Moira-DAYS2へ匿名ログイン
export async function ensureShiftAuth() {
  if (shiftAuth.currentUser) {
    return;
  }

  await signInAnonymously(shiftAuth);
}

// POS側で使用する確定シフト型
export type ShiftSchedule = {
  id: string;
  staff: string;
  date: string;
  start: string;
  end: string;
  memo?: string;
  published?: boolean;
  publicationStatus?: string;
};

// 指定日の「公開済みシフト」をリアルタイム取得
export async function subscribePublishedShifts(
  date: string,
  onChange: (
    shifts: ShiftSchedule[],
  ) => void,
): Promise<Unsubscribe> {
  await ensureShiftAuth();

  const shiftsQuery = query(
    collection(
      shiftDb,
      "shift_shifts",
    ),
    where(
      "date",
      "==",
      date,
    ),
  );

  return onSnapshot(
    shiftsQuery,

    (snapshot) => {
      const shifts =
        snapshot.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          }),
        ) as ShiftSchedule[];

      const publishedShifts =
        shifts
          .filter(
            (shift) =>
              shift.published === true ||
              shift.publicationStatus ===
                "published",
          )
          .sort((a, b) =>
            (
              a.start + a.staff
            ).localeCompare(
              b.start + b.staff,
            ),
          );

      onChange(
        publishedShifts,
      );
    },

    (error) => {
      console.error(
        "確定シフトの読み込みに失敗しました。",
        error,
      );

      onChange([]);
    },
  );
}