import {
  getApps,
  initializeApp,
} from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVExe9PiUmuRuD_TtajxhLHwStcEixCTI",
  authDomain: "moira-pos.firebaseapp.com",
  projectId: "moira-pos",
  storageBucket: "moira-pos.firebasestorage.app",
  messagingSenderId: "809757883169",
  appId: "1:809757883169:web:84e28ded6d860fd3819c60",
};

const appName = "moira-pos-main";

const app =
  getApps().find(
    (item) => item.name === appName,
  ) ??
  initializeApp(
    firebaseConfig,
    appName,
  );

export const db = getFirestore(app);