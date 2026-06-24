const { initializeApp } = require("firebase-admin/app");
const { cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("../secrets/firebase-key.json");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const usersSnap = await db.collection("users").get();
  usersSnap.forEach(doc => {
    console.log("UID:", doc.id);
    console.log("Data:", JSON.stringify(doc.data(), null, 2));
    console.log("---");
  });
}

check();
