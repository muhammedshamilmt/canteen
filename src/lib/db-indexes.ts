/**
 * Ensures all required MongoDB indexes exist.
 * Call once at app startup or via /api/admin/init-indexes.
 */
import clientPromise from './mongodb';

export async function ensureIndexes() {
  const client = await clientPromise;
  const db = client.db();

  await Promise.all([
    // students — most queried by admissionNumber and campus
    db.collection('students').createIndex({ admissionNumber: 1 }, { unique: true, background: true }),
    db.collection('students').createIndex({ campus: 1 }, { background: true }),
    db.collection('students').createIndex({ tableNumber: 1 }, { background: true }),

    // users — queried by admissionNumber and email
    db.collection('users').createIndex({ admissionNumber: 1 }, { unique: true, background: true }),
    db.collection('users').createIndex({ email: 1 }, { sparse: true, background: true }),
    db.collection('users').createIndex({ isSick: 1 }, { background: true }),

    // attendance_history — queried by admissionNumber + date
    db.collection('attendance_history').createIndex(
      { admissionNumber: 1, date: -1 },
      { background: true }
    ),

    // leave_history
    db.collection('leave_history').createIndex({ admissionNumber: 1 }, { background: true }),

    // settings
    db.collection('settings').createIndex({ key: 1 }, { unique: true, background: true }),
  ]);
}
