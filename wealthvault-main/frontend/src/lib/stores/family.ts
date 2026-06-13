import { writable } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import {
  doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs
} from 'firebase/firestore';

export interface FamilyMember {
  uid: string;
  displayName: string;
  photoURL: string;
  role: string;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  members: FamilyMember[];
}

export const family = writable<Family | null>(null);
export const selectedMember = writable<FamilyMember | null>(null);
export const familyLoading = writable(false);

function getUID(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function loadFamily(): Promise<Family | null> {
  familyLoading.set(true);
  try {
    const uid = getUID();
    const userDoc = await getDoc(doc(db, 'users', uid));
    const familyId = userDoc.data()?.familyId;
    if (!familyId) { family.set(null); return null; }
    const famDoc = await getDoc(doc(db, 'families', familyId));
    if (!famDoc.exists()) { family.set(null); return null; }
    const data = { id: famDoc.id, ...famDoc.data() } as Family;
    family.set(data);
    return data;
  } catch (e) {
    family.set(null);
    return null;
  } finally {
    familyLoading.set(false);
  }
}

export async function createFamily(familyName: string, displayName: string, photoURL: string) {
  const uid = getUID();
  const familyId = Date.now().toString();
  const inviteCode = randomCode();
  const member: FamilyMember = { uid, displayName, photoURL, role: 'admin' };
  const famData: Family = { id: familyId, name: familyName, inviteCode, members: [member] };
  await setDoc(doc(db, 'families', familyId), famData);
  await setDoc(doc(db, 'users', uid), { familyId, displayName, photoURL }, { merge: true });
  family.set(famData);
  return famData;
}

export async function joinFamily(inviteCode: string, displayName: string, photoURL: string) {
  const uid = getUID();
  const q = query(collection(db, 'families'), where('inviteCode', '==', inviteCode.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Invalid invite code');
  const famDoc = snap.docs[0];
  const famData = famDoc.data() as Family;
  const member: FamilyMember = { uid, displayName, photoURL, role: 'member' };
  const updatedMembers = [...famData.members.filter(m => m.uid !== uid), member];
  await updateDoc(doc(db, 'families', famDoc.id), { members: updatedMembers });
  await setDoc(doc(db, 'users', uid), { familyId: famDoc.id, displayName, photoURL }, { merge: true });
  const updated = { ...famData, id: famDoc.id, members: updatedMembers };
  family.set(updated);
  return updated;
}

export async function fetchMemberAssets(memberUID: string) {
  const snap = await getDocs(collection(db, 'users', memberUID, 'assets'));
  const assets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return { assets };
}
