/**
 * Migration: Remove invalid / missing location coordinates.
 *
 * This script clears invalid coordinates from all User, Job, and Company
 * documents so that MongoDB's 2dsphere index does not throw on save.
 *
 * Handles the following invalid patterns:
 *   1. coordinates: { type: 'Point' }          ← missing coordinates array (root cause of login error)
 *   2. coordinates: { type: 'Point', coordinates: [] }   ← empty array
 *   3. coordinates: { type: 'Point', coordinates: null }  ← null
 *   4. coordinates: { type: 'Point', coordinates: [0, 0] } ← Null Island
 *
 * Usage:
 *   node scripts/migrate-null-coordinates.js
 *
 * Safe to run multiple times (idempotent).
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hire-engine';

/**
 * Builds a MongoDB filter that matches documents with any kind of invalid coordinates.
 * @param {string} coordsPath - Dot-notation path to the coordinates subdocument, e.g. 'location.coordinates'
 */
function buildInvalidCoordsFilter(coordsPath) {
  const arrayPath = `${coordsPath}.coordinates`;
  return {
    $or: [
      // Coordinates subdocument exists but array is missing entirely
      { [coordsPath]: { $exists: true }, [arrayPath]: { $exists: false } },
      // Array is null
      { [arrayPath]: null },
      // Array is empty []
      { [arrayPath]: { $size: 0 } },
      // Array is Null Island [0, 0]
      { [arrayPath]: [0, 0] },
    ],
  };
}

async function migrate() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  const db = mongoose.connection.db;

  // ── Migrate Users ─────────────────────────────────
  console.log('📌 Migrating User documents...');
  const userResult = await db.collection('users').updateMany(
    buildInvalidCoordsFilter('location.coordinates'),
    { $unset: { 'location.coordinates': '' } }
  );
  console.log(`   Updated: ${userResult.modifiedCount} users (cleared invalid coordinates)\n`);

  // ── Migrate Jobs ──────────────────────────────────
  console.log('📌 Migrating Job documents...');
  const jobResult = await db.collection('jobs').updateMany(
    buildInvalidCoordsFilter('location.coordinates'),
    { $unset: { 'location.coordinates': '' } }
  );
  console.log(`   Updated: ${jobResult.modifiedCount} jobs (cleared invalid coordinates)\n`);

  // ── Migrate Companies ─────────────────────────────
  console.log('📌 Migrating Company documents...');
  const companyResult = await db.collection('companies').updateMany(
    buildInvalidCoordsFilter('address.coordinates'),
    { $unset: { 'address.coordinates': '' } }
  );
  console.log(`   Updated: ${companyResult.modifiedCount} companies (cleared invalid coordinates)\n`);

  // ── Summary ───────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Migration complete.`);
  console.log(`   Users fixed:     ${userResult.modifiedCount}`);
  console.log(`   Jobs fixed:      ${jobResult.modifiedCount}`);
  console.log(`   Companies fixed: ${companyResult.modifiedCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
