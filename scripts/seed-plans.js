/**
 * Seed script to populate the Plan collection with default subscription plans.
 *
 * Usage:
 *   node scripts/seed-plans.js
 *
 * This script is idempotent — it will skip plans that already exist (matched by planId).
 * Run this after deploying the Plan model to populate initial plan data.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Plan = require('../src/models/Plan');

const DEFAULT_PLANS = [
  {
    planId: 'pay-per-job',
    name: 'Pay Per Job',
    description: 'Post a single job listing. Ideal for occasional hiring needs.',
    price: 9900, // $99.00
    jobQuota: 1,
    resumeQuota: 0,
    hasResumeDB: false,
    durationMonths: 1,
    isActive: true,
  },
  {
    planId: 'monthly',
    name: 'Monthly Subscription',
    description: 'Post up to 10 jobs per month with resume database access and 100 resume searches.',
    price: 29900, // $299.00
    jobQuota: 10,
    resumeQuota: 100,
    hasResumeDB: true,
    durationMonths: 1,
    isActive: true,
  },
  {
    planId: 'annual',
    name: 'Annual Enterprise',
    description: 'Unlimited job postings and resume searches for a full year. Best value for growing teams.',
    price: 249900, // $2,499.00
    jobQuota: 0, // unlimited
    resumeQuota: 0, // unlimited
    hasResumeDB: true,
    durationMonths: 12,
    isActive: true,
  },
  {
    planId: 'enterprise',
    name: 'Custom Enterprise',
    description: 'Fully customizable plan for large organizations with dedicated support and unlimited everything.',
    price: 499900, // $4,999.00
    jobQuota: 0, // unlimited
    resumeQuota: 0, // unlimited
    hasResumeDB: true,
    durationMonths: 12,
    isActive: true,
  },
];

async function seedPlans() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI or MONGO_URI environment variable is not set.');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected.\n');

  let created = 0;
  let skipped = 0;

  for (const planData of DEFAULT_PLANS) {
    const existing = await Plan.findOne({ planId: planData.planId });

    if (existing) {
      console.log(`⏭️  Skipping "${planData.name}" (planId: ${planData.planId}) — already exists.`);
      skipped++;
    } else {
      await Plan.create(planData);
      console.log(`✅ Created "${planData.name}" (planId: ${planData.planId})`);
      created++;
    }
  }

  console.log('\n═'.repeat(50));
  console.log(`  📊 Results: ${created} created, ${skipped} skipped`);
  console.log('═'.repeat(50));

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB.');
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error(`\n❌ Seed script failed: ${err.message}`);
  mongoose.disconnect().then(() => process.exit(1));
});
