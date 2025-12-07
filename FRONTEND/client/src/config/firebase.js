import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "tabletalk-social",
  appId: "1:925236799140:android:61ad591d616ab133df6831"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
