import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function registerFarmer({ name, district, email, password }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  await setDoc(doc(db, "farmers", user.uid), {
    name,
    district,
    email,
    createdAt: new Date().toISOString()
  });
  return user;
}

export async function login({ email, password }) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function logout() {
  return signOut(auth);
}

// Firestore helpers
export async function addUserCrop(userId, { name }) {
  const cropsRef = collection(db, `farmers/${userId}/crops`);
  const docRef = await addDoc(cropsRef, {
    name,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function listUserCrops(userId) {
  const cropsRef = collection(db, `farmers/${userId}/crops`);
  const q = query(cropsRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getUserProfile(userId) {
  const profileRef = doc(db, "farmers", userId);
  const snap = await getDoc(profileRef);
  return snap.exists() ? snap.data() : null;
}


