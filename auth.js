import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Suppress Firestore connection error logs
console.log('Firebase initialized - Firestore connection errors are expected and handled gracefully');

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function registerFarmer({ name, district, email, password }) {
  try {
    console.log('Creating Firebase user account...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('Firebase user created successfully:', user.uid);
    
    // Store user data in localStorage as backup since Firestore is having connection issues
    const userData = {
      name,
      district,
      email,
      createdAt: new Date().toISOString(),
      uid: user.uid
    };
    
    localStorage.setItem(`farmer_${user.uid}`, JSON.stringify(userData));
    console.log('User data saved to localStorage as backup');
    
    // Try Firestore but don't fail if it doesn't work
    try {
      console.log('Attempting to save to Firestore...');
      await setDoc(doc(db, "farmers", user.uid), userData);
      console.log('Farmer profile saved to Firestore successfully');
    } catch (firestoreError) {
      console.warn('Firestore save failed (connection issues), but user account was created and data saved locally:', firestoreError.message);
      // This is expected due to connection issues - user can still use the app
    }
    
    return user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
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
  try {
    // Try Firestore first
    const profileRef = doc(db, "farmers", userId);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    console.warn('Firestore read failed, trying localStorage:', error.message);
  }
  
  // Fallback to localStorage
  const localData = localStorage.getItem(`farmer_${userId}`);
  if (localData) {
    return JSON.parse(localData);
  }
  
  return null;
}


