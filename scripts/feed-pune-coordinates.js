/**
 * Script to feed Pune coordinates [longitude, latitude] for a specific document ID.
 *
 * ID: 6a86f2b5941befe721e8781c
 * Location: Pune, Maharashtra, India
 * Coordinates (GeoJSON format [lng, lat]): [73.8567437, 18.5204303]
 *
 * Usage:
 *   node scripts/feed-pune-coordinates.js
 *   node scripts/feed-pune-coordinates.js <TARGET_ID>
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hire-engine';
const TARGET_ID = process.argv[2] || '6a8e77edadf320d4dea6b575';

// Pune coordinates: [lng, lat]
const PUNE_COORDINATES = [73.8567437, 18.5204303];
const PUNE_LOCATION = {
  city: 'Pune',
  state: 'Maharashtra',
  country: 'India',
  coordinates: {
    type: 'Point',
    coordinates: PUNE_COORDINATES,
  },
};

async function updateCoordinates() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  if (!mongoose.Types.ObjectId.isValid(TARGET_ID)) {
    console.error(`❌ Invalid ObjectId: ${TARGET_ID}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const objectId = new mongoose.Types.ObjectId(TARGET_ID);
  const db = mongoose.connection.db;

  let found = false;

  // 1. Check & Update in Jobs
  const job = await db.collection('jobs').findOne({ _id: objectId });
  if (job) {
    found = true;
    console.log(`📌 Found in "jobs" collection: "${job.title || job._id}"`);
    await db.collection('jobs').updateOne(
      { _id: objectId },
      {
        $set: {
          'location.city': job.location?.city || PUNE_LOCATION.city,
          'location.state': job.location?.state || PUNE_LOCATION.state,
          'location.country': job.location?.country || PUNE_LOCATION.country,
          'location.coordinates': PUNE_LOCATION.coordinates,
        },
      }
    );
    console.log('✅ Updated job location coordinates to Pune [73.8567437, 18.5204303]');
  }

  // 2. Check & Update in Users
  const user = await db.collection('users').findOne({ _id: objectId });
  if (user) {
    found = true;
    console.log(`📌 Found in "users" collection: "${user.email || user.firstName || user._id}"`);
    await db.collection('users').updateOne(
      { _id: objectId },
      {
        $set: {
          'location.city': user.location?.city || PUNE_LOCATION.city,
          'location.state': user.location?.state || PUNE_LOCATION.state,
          'location.country': user.location?.country || PUNE_LOCATION.country,
          'location.coordinates': PUNE_LOCATION.coordinates,
        },
      }
    );
    console.log('✅ Updated user location coordinates to Pune [73.8567437, 18.5204303]');
  }

  // 3. Check & Update in Companies
  const company = await db.collection('companies').findOne({ _id: objectId });
  if (company) {
    found = true;
    console.log(`📌 Found in "companies" collection: "${company.name || company._id}"`);
    await db.collection('companies').updateOne(
      { _id: objectId },
      {
        $set: {
          'address.city': company.address?.city || PUNE_LOCATION.city,
          'address.state': company.address?.state || PUNE_LOCATION.state,
          'address.country': company.address?.country || PUNE_LOCATION.country,
          'address.coordinates': PUNE_LOCATION.coordinates,
        },
      }
    );
    console.log('✅ Updated company address coordinates to Pune [73.8567437, 18.5204303]');
  }

  if (!found) {
    console.log(`⚠️ Document with ID ${TARGET_ID} not found in jobs, users, or companies collection.`);
  } else {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Coordinates successfully updated for ID:', TARGET_ID);
    console.log('   Coordinates (GeoJSON [lng, lat]):', PUNE_COORDINATES);
    console.log('   City/State/Country: Pune, Maharashtra, India');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

updateCoordinates().catch((err) => {
  console.error('❌ Error updating coordinates:', err.message);
  process.exit(1);
});
