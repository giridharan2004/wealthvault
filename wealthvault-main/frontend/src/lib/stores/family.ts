import { writable } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import {
	doc,
	getDoc,
	setDoc,
	updateDoc,
	collection,
	query,
	where,
	getDocs
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
	memberUids: string[];
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
	// Cryptographically stronger random invite code (8 chars, base36)
	const bytes = new Uint8Array(6);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(36).toUpperCase().padStart(2, '0'))
		.join('')
		.slice(0, 8);
}

export async function loadFamily(): Promise<Family | null> {
	familyLoading.set(true);
	try {
		const uid = getUID();
		const userDoc = await getDoc(doc(db, 'users', uid));
		const familyId = userDoc.data()?.familyId;
		if (!familyId) {
			family.set(null);
			return null;
		}
		const famDoc = await getDoc(doc(db, 'families', familyId));
		if (!famDoc.exists()) {
			family.set(null);
			return null;
		}
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

	const cleanName = familyName.trim();
	const cleanDisplayName = displayName.trim();
	if (!cleanName || cleanName.length > 60) throw new Error('Invalid family name');
	if (!cleanDisplayName || cleanDisplayName.length > 60) throw new Error('Invalid display name');

	// Use a Firestore-generated ID instead of Date.now() to avoid collisions/predictability
	const familyRef = doc(collection(db, 'families'));
	const familyId = familyRef.id;
	const inviteCode = randomCode();

	const member: FamilyMember = { uid, displayName: cleanDisplayName, photoURL, role: 'admin' };
	const famData: Family = {
		id: familyId,
		name: cleanName,
		inviteCode,
		members: [member],
		memberUids: [uid]
	};

	await setDoc(familyRef, famData);
	await setDoc(
		doc(db, 'users', uid),
		{ familyId, displayName: cleanDisplayName, photoURL },
		{ merge: true }
	);

	family.set(famData);
	return famData;
}

export async function joinFamily(inviteCode: string, displayName: string, photoURL: string) {
	const uid = getUID();

	const cleanCode = inviteCode.trim().toUpperCase();
	const cleanDisplayName = displayName.trim();
	if (!cleanCode) throw new Error('Invite code required');
	if (!cleanDisplayName || cleanDisplayName.length > 60) throw new Error('Invalid display name');

	const q = query(collection(db, 'families'), where('inviteCode', '==', cleanCode));
	const snap = await getDocs(q);
	if (snap.empty) throw new Error('Invalid invite code');

	const famDoc = snap.docs[0];
	const famData = famDoc.data() as Family;

	// Prevent duplicate joins / cap family size
	if (famData.memberUids?.includes(uid)) {
		const updated = { ...famData, id: famDoc.id };
		family.set(updated);
		return updated;
	}
	if ((famData.memberUids?.length ?? 0) >= 20) {
		throw new Error('Family member limit reached');
	}

	const member: FamilyMember = { uid, displayName: cleanDisplayName, photoURL, role: 'member' };
	const updatedMembers = [...(famData.members || []).filter((m) => m.uid !== uid), member];
	const updatedMemberUids = [...(famData.memberUids || []).filter((u) => u !== uid), uid];

	await updateDoc(doc(db, 'families', famDoc.id), {
		members: updatedMembers,
		memberUids: updatedMemberUids
	});
	await setDoc(
		doc(db, 'users', uid),
		{ familyId: famDoc.id, displayName: cleanDisplayName, photoURL },
		{ merge: true }
	);

	const updated = {
		...famData,
		id: famDoc.id,
		members: updatedMembers,
		memberUids: updatedMemberUids
	};
	family.set(updated);
	return updated;
}

export async function fetchMemberAssets(memberUID: string) {
	const snap = await getDocs(collection(db, 'users', memberUID, 'portfolios', 'main', 'assets'));
	const assets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
	return { assets };
}
