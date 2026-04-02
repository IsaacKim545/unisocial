const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

const SUPPORTED_PLATFORMS = [
  "twitter", "instagram", "tiktok", "linkedin", "facebook",
  "youtube", "threads", "reddit", "pinterest", "bluesky",
  "telegram", "snapchat", "googlebusiness",
];

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function addDoc(collection, data) {
  const ref = db.collection(collection).doc();
  const doc = { ...data, id: ref.id, createdAt: admin.firestore.FieldValue.serverTimestamp() };
  await ref.set(doc);
  return { id: ref.id, ...data, createdAt: new Date() };
}

async function updateDoc(collection, id, data) {
  await db.collection(collection).doc(id).update({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function deleteDoc(collection, id) {
  await db.collection(collection).doc(id).delete();
}

async function getDoc(collection, id) {
  const snap = await db.collection(collection).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function queryDocs(collection, conditions = [], orderByField = null, orderDir = "desc", limitCount = null, offsetCount = null) {
  let ref = db.collection(collection);
  for (const [field, op, value] of conditions) {
    ref = ref.where(field, op, value);
  }
  if (orderByField) ref = ref.orderBy(orderByField, orderDir);
  if (offsetCount && offsetCount > 0) {
    const allSnap = await ref.limit(offsetCount + (limitCount || 100)).get();
    const allDocs = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    return allDocs.slice(offsetCount, offsetCount + (limitCount || 100));
  }
  if (limitCount) ref = ref.limit(limitCount);
  const snap = await ref.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function countDocs(collection, conditions = []) {
  let ref = db.collection(collection);
  for (const [field, op, value] of conditions) {
    ref = ref.where(field, op, value);
  }
  const snap = await ref.count().get();
  return snap.data().count;
}

module.exports = {
  admin, db, auth, storage,
  SUPPORTED_PLATFORMS,
  monthStart, addDoc, updateDoc, deleteDoc, getDoc, queryDocs, countDocs,
};
