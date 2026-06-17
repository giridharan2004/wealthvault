import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { auth } from '$lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User
} from 'firebase/auth';

export const user = writable<User | null>(null);
export const idToken = writable<string | null>(null);
export const loading = writable<boolean>(browser ? true : false);
export const isAuthenticated = derived(user, ($user) => $user !== null);

if (browser) {
  onAuthStateChanged(auth, async (firebaseUser) => {
    user.set(firebaseUser);
    loading.set(false);
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken();
      idToken.set(token);
    } else {
      idToken.set(null);
    }
  });
}

export async function signInWithGoogle() {
  if (!browser) return;
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export async function logout() {
  if (!browser) return;
  try {
    await signOut(auth);
    user.set(null);
    idToken.set(null);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}
