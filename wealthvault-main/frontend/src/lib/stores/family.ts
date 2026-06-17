import { writable, get } from 'svelte/store';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '$lib/firebase';
import { user } from './auth';

export interface FamilyMember {
  uid: string;
  name: string;
  email: string;
}

export interface Family {
  code: string;
  name: string;
  members: string[];
  createdBy: string;
}

export const family = writable<Family | null>(null);
export const familyMembers = writable<FamilyMember[]>([]);
export const familyCode = writable<string | null>(null);

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createFamily(familyName: string, memberName: string): Promise<string> {
  const currentUser = get(user);
  if (!currentUser) throw new Error('Not logged in');
  const code = generateCode();
  await setDoc(doc(db, 'families', code), {
    code, name: familyName, members: [currentUser.uid],
    createdBy: currentUser.uid, createdAt: new Date().toISOString()
  });
  await setDoc(doc(db, 'users', currentUser.uid), {
    familyCode: code, name: memberName,
    email: currentUser.email, joinedAt: new Date().toISOString()
  }, { merge: true });
  familyCode.set(code);
  return code;
}

export async function joinFamily(code: string, memberName: string): Promise<void> {
  const currentUser = get(user);
  if (!currentUser) throw new Error('Not logged in');
  const familyRef = doc(db, 'families', code.toUpperCase());
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) throw new Error('Family code not found');
  await updateDoc(familyRef, { members: arrayUnion(currentUser.uid) });
  await setDoc(doc(db, 'users', currentUser.uid), {
    familyCode: code.toUpperCase(), name: memberName,
    email: currentUser.email, joinedAt: new Date().toISOString()
  }, { merge: true });
  familyCode.set(code.toUpperCase());
}

export async function loadFamily(): Promise<void> {
  const currentUser = get(user);
  if (!currentUser) return;
  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
  if (!userSnap.exists() || !userSnap.data().familyCode) return;
  const code = userSnap.data().familyCode;
  familyCode.set(code);
  const familySnap = await getDoc(doc(db, 'families', code));
  if (!familySnap.exists()) return;
  family.set(familySnap.data() as Family);
  const members: FamilyMember[] = [];
  for (const uid of familySnap.data().members) {
    const memberSnap = await getDoc(doc(db, 'users', uid));
    if (memberSnap.exists()) {
      members.push({ uid, name: memberSnap.data().name, email: memberSnap.data().email });
    }
  }
  familyMembers.set(members);
}
