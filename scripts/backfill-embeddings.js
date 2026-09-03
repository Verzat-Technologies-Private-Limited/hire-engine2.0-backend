/**
 * Backfill Embeddings Script
 *
 * Generates Gemini AI embeddings for existing resumes and jobs that don't have one yet.
 * Processes in batches with rate-limiting delays to respect Gemini API quotas.
 *
 * Usage:
 *   node scripts/backfill-embeddings.js          # Process both resumes and jobs
 *   node scripts/backfill-embeddings.js resumes  # Resumes only
 *   node scripts/backfill-embeddings.js jobs     # Jobs only
 *
 * Environment:
 *   Requires GEMINI_API_KEY and MONGODB_URI to be set.
 */

const mongoose = require('mongoose');
const config = require('../src/config');
const Resume = require('../src/models/Resume');
const Job = require('../src/models/Job');
const { generateResumeEmbedding, generateJobEmbedding } = require('../src/services/embedding.service');

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 2000; // 2 seconds between batches to avoid rate limits
const DELAY_BETWEEN_ITEMS_MS = 200;    // 200ms between individual items

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillResumes() {
  const total = await Resume.countDocuments({
    $or: [
      { 'embedding.vector': { $exists: false } },
      { 'embedding.vector': { $size: 0 } },
    ],
  });

  console.log(`\n📄 Found ${total} resumes without embeddings`);
  if (total === 0) return;

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Process in batches
  while (processed < total) {
    const batch = await Resume.find({
      $or: [
        { 'embedding.vector': { $exists: false } },
        { 'embedding.vector': { $size: 0 } },
      ],
    })
      .select('_id')
      .limit(BATCH_SIZE)
      .lean();

    if (batch.length === 0) break;

    for (const resume of batch) {
      try {
        const success = await generateResumeEmbedding(resume._id);
        if (success) {
          succeeded++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`  ❌ Error processing resume ${resume._id}: ${err.message}`);
        failed++;
      }

      processed++;
      const pct = ((processed / total) * 100).toFixed(1);
      process.stdout.write(`\r  Progress: ${processed}/${total} (${pct}%) | ✅ ${succeeded} | ❌ ${failed}`);

      await sleep(DELAY_BETWEEN_ITEMS_MS);
    }

    await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  console.log(`\n  ✅ Resume backfill complete: ${succeeded} succeeded, ${failed} failed out of ${total}`);
}

async function backfillJobs() {
  const total = await Job.countDocuments({
    $or: [
      { 'embedding.vector': { $exists: false } },
      { 'embedding.vector': { $size: 0 } },
    ],
  });

  console.log(`\n💼 Found ${total} jobs without embeddings`);
  if (total === 0) return;

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  while (processed < total) {
    const batch = await Job.find({
      $or: [
        { 'embedding.vector': { $exists: false } },
        { 'embedding.vector': { $size: 0 } },
      ],
    })
      .select('_id')
      .limit(BATCH_SIZE)
      .lean();

    if (batch.length === 0) break;

    for (const job of batch) {
      try {
        const success = await generateJobEmbedding(job._id);
        if (success) {
          succeeded++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`  ❌ Error processing job ${job._id}: ${err.message}`);
        failed++;
      }

      processed++;
      const pct = ((processed / total) * 100).toFixed(1);
      process.stdout.write(`\r  Progress: ${processed}/${total} (${pct}%) | ✅ ${succeeded} | ❌ ${failed}`);

      await sleep(DELAY_BETWEEN_ITEMS_MS);
    }

    await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  console.log(`\n  ✅ Job backfill complete: ${succeeded} succeeded, ${failed} failed out of ${total}`);
}

async function main() {
  const target = process.argv[2]; // 'resumes', 'jobs', or undefined (both)

  console.log('🚀 Embedding Backfill Script');
  console.log('═'.repeat(50));
  console.log(`Target: ${target || 'both resumes and jobs'}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Embedding model: ${config.gemini.embeddingModel || 'gemini-embedding-001'}`);

  if (!config.gemini.apiKey) {
    console.error('❌ GEMINI_API_KEY is not set. Cannot generate embeddings.');
    process.exit(1);
  }

  // Connect to MongoDB
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  try {
    if (!target || target === 'resumes') {
      await backfillResumes();
    }

    if (!target || target === 'jobs') {
      await backfillJobs();
    }

    console.log('\n' + '═'.repeat(50));
    console.log('🎉 Backfill complete!');
  } catch (err) {
    console.error('\n❌ Backfill failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

main();
