const admin = require("firebase-admin");
const path = require("path");

// In production on Cloud Run, this is automatically picked up from metadata server
// if using the default compute service account. Locally, we use the key file.
const serviceAccountPath = path.join(__dirname, "../sa-key.json");

let app;

try {
  // Try to initialize with local service account key if it exists
  const serviceAccount = require(serviceAccountPath);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "lab-resources",
    storageBucket: "sonic-stream-storage",
  });
  console.log("Firebase Admin initialized with local key.");
} catch (error) {
  // Fall back to application default credentials (Cloud Run)
  app = admin.initializeApp({
    projectId: "lab-resources",
    storageBucket: "sonic-stream-storage",
  });
  console.log(
    "Firebase Admin initialized with Application Default Credentials.",
  );
}

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

module.exports = {
  admin,
  db,
  bucket,
};
