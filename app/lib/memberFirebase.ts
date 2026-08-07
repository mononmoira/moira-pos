import {
  getApp,
  getApps,
  initializeApp,
} from "firebase/app";

import { getFirestore } from "firebase/firestore";

const memberFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_MEMBER_FIREBASE_API_KEY!,
  authDomain:
    process.env.NEXT_PUBLIC_MEMBER_FIREBASE_AUTH_DOMAIN!,
  projectId:
    process.env.NEXT_PUBLIC_MEMBER_FIREBASE_PROJECT_ID!,
  storageBucket:
    process.env.NEXT_PUBLIC_MEMBER_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId:
    process.env.NEXT_PUBLIC_MEMBER_FIREBASE_MESSAGING_SENDER_ID!,
  appId:
    process.env.NEXT_PUBLIC_MEMBER_FIREBASE_APP_ID!,
};

const memberApp =
  getApps().find(
    (app) => app.name === "moira-official",
  ) ??
  initializeApp(
    memberFirebaseConfig,
    "moira-official",
  );

export const memberDb =
  getFirestore(memberApp);