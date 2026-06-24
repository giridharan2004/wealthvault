const { initializeApp } = require("firebase-admin/app");
const { cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("../secrets/firebase-key.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const snap = await db.collection("families").get();
  snap.forEach(doc => {
    console.log("Doc ID:", doc.id);
    console.log("Data:", JSON.stringify(doc.data(), null, 2));
    console.log("---");
  });
}

check();
