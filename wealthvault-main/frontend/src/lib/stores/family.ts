import { writable, get } from 'svelte/store';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '$lib/firebase';
import { user } from './auth';

export interface FamilyMember {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'member';
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  members: FamilyMember[];
  createdBy: string;
}

export const family = writable<Family | null>(null);
export const familyMembers = writable<FamilyMember[]>([]);
export const familyCode = writable<string | null>(null);
export const selectedMember = writable<FamilyMember | null>(null);

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function loadFamily(): Promise<Family | null> {
  const currentUser = get(user);
  if (!currentUser) return null;

  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
  if (!userSnap.exists() || !userSnap.data().familyId) return null;

  const familyId = userSnap.data().familyId;
  const familySnap = await getDoc(doc(db, 'families', familyId));
  if (!familySnap.exists()) return null;

  const data = familySnap.data() as Family;
  family.set(data);
  familyCode.set(data.inviteCode);
  familyMembers.set(data.members);
  return data;
}

export async function createFamily(familyName: string, displayName: string): Promise<string> {
  const currentUser = get(user);
  if (!currentUser) throw new Error('Not logged in');

  const code = generateCode();
  const familyId = Date.now().toString();

  const newMember: FamilyMember = {
    uid: currentUser.uid,
    displayName,
    email: currentUser.email || '',
    photoURL: currentUser.photoURL || undefined,
    role: 'admin'
  };

  const newFamily: Family = {
    id: familyId,
    name: familyName,
    inviteCode: code,
    members: [newMember],
    createdBy: currentUser.uid
  };

  await setDoc(doc(db, 'families', familyId), newFamily);
  await setDoc(doc(db, 'users', currentUser.uid), {
    familyId,
    familyCode: code,
    displayName,
    email: currentUser.email,
    joinedAt: new Date().toISOString()
  }, { merge: true });

  family.set(newFamily);
  familyCode.set(code);
  familyMembers.set([newMember]);
  return code;
}

export async function joinFamily(code: string, displayName: string): Promise<void> {
  const currentUser = get(user);
  if (!currentUser) throw new Error('Not logged in');

  const familiesSnap = await getDocs(collection(db, 'families'));
  let targetFamily: Family | null = null;
  let targetId = '';

  familiesSnap.forEach(d => {
    const data = d.data() as Family;
    if (data.inviteCode === code.toUpperCase()) {
      targetFamily = data;
      targetId = d.id;
    }
  });

  if (!targetFamily) throw new Error('Family code not found');

  const newMember: FamilyMember = {
    uid: currentUser.uid,
    displayName,
    email: currentUser.email || '',
    photoURL: currentUser.photoURL || undefined,
    role: 'member'
  };

  const updatedMembers = [...(targetFamily as Family).members, newMember];

  await updateDoc(doc(db, 'families', targetId), { members: updatedMembers });
  await setDoc(doc(db, 'users', currentUser.uid), {
    familyId: targetId,
    familyCode: code.toUpperCase(),
    displayName,
    email: currentUser.email,
    joinedAt: new Date().toISOString()
  }, { merge: true });

  const updated = { ...(targetFamily as Family), members: updatedMembers };
  family.set(updated);
  familyCode.set(code.toUpperCase());
  familyMembers.set(updatedMembers);
}