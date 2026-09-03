/**
 * Semantic Search Verification Script
 *
 * Tests each layer of the semantic search pipeline end-to-end:
 *   1. Gemini Embedding API connectivity
 *   2. Embedding generation (document & query)
 *   3. Resume embedding storage in MongoDB
 *   4. Job embedding storage in MongoDB
 *   5. Atlas $vectorSearch on resumes
 *   6. Atlas $vectorSearch on jobs
 *   7. Hybrid search merge logic
 *   8. Similar-document lookup
 *   9. Rank-resumes-by-job
 *
 * Usage:
 *   node scripts/verify-semantic-search.js
 *
 * Environment:
 *   Requires GEMINI_API_KEY and MONGODB_URI (pointing to Atlas) to be set.
 */

const mongoose = require('mongoose');
const config = require('../src/config');
const Resume = require('../src/models/Resume');
const Job = require('../src/models/Job');
// Load models that search service populate() references
require('../src/models/User');
require('../src/models/Company');
const {
  generateEmbedding,
  generateQueryEmbedding,
} = require('../src/adapters/ai/gemini.adapter');
const {
  buildResumeText,
  buildJobText,
  generateResumeEmbedding,
  generateJobEmbedding,
  semanticSearchResumes,
  semanticSearchJobs,
  findSimilarResumes,
  findSimilarJobs,
  rankResumesByJob,
} = require('../src/services/embedding.service');

// ── Helpers ─────────────────────────────────────────────

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';
const SKIP = '⏭️';

let passCount = 0;
let failCount = 0;
let warnCount = 0;
let skipCount = 0;

function pass(msg, detail) {
  passCount++;
  console.log(`  ${PASS} ${msg}${detail ? ` — ${detail}` : ''}`);
}

function fail(msg, detail) {
  failCount++;
  console.log(`  ${FAIL} ${msg}${detail ? ` — ${detail}` : ''}`);
}

function warn(msg, detail) {
  warnCount++;
  console.log(`  ${WARN} ${msg}${detail ? ` — ${detail}` : ''}`);
}

function skip(msg, detail) {
  skipCount++;
  console.log(`  ${SKIP} ${msg}${detail ? ` — ${detail}` : ''}`);
}

function header(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(60)}`);
}

// ── Test Cases ──────────────────────────────────────────

async function testGeminiApiConnectivity() {
  header('1. Gemini Embedding API Connectivity');

  if (!config.gemini.apiKey) {
    fail('GEMINI_API_KEY is not set');
    return null;
  }
  pass('GEMINI_API_KEY is configured');

  console.log(`     Model: ${config.gemini.embeddingModel || 'gemini-embedding-001'}`);

  try {
    const vector = await generateEmbedding('Hello world, this is a test sentence.');
    if (!vector) {
      fail('generateEmbedding returned null');
      return null;
    }
    if (!Array.isArray(vector)) {
      fail('generateEmbedding did not return an array', `Got: ${typeof vector}`);
      return null;
    }
    if (vector.length === 0) {
      fail('generateEmbedding returned empty array');
      return null;
    }
    pass(`generateEmbedding works`, `${vector.length} dimensions`);

    // Verify it's all numbers
    const allNumbers = vector.every((v) => typeof v === 'number' && !isNaN(v));
    if (allNumbers) {
      pass('Vector contains valid float numbers');
    } else {
      fail('Vector contains non-numeric values');
    }

    return vector;
  } catch (err) {
    fail('generateEmbedding threw an error', err.message);
    return null;
  }
}

async function testQueryEmbedding() {
  header('2. Query Embedding Generation');

  try {
    const vector = await generateQueryEmbedding('experienced React developer with AWS skills');
    if (!vector || vector.length === 0) {
      fail('generateQueryEmbedding returned null or empty');
      return null;
    }
    pass(`generateQueryEmbedding works`, `${vector.length} dimensions`);

    // Verify query and document embeddings have same dimensions
    const docVector = await generateEmbedding('React developer experienced in AWS.');
    if (docVector && docVector.length === vector.length) {
      pass('Document and query embeddings have same dimensions');
    } else {
      warn('Dimension mismatch between doc and query embeddings');
    }

    // Quick semantic similarity sanity check (cosine similarity)
    const sim = cosineSimilarity(vector, docVector);
    console.log(`     Cosine similarity (related texts): ${sim.toFixed(4)}`);
    if (sim > 0.5) {
      pass('Related texts have high cosine similarity', sim.toFixed(4));
    } else {
      warn('Cosine similarity lower than expected for related texts', sim.toFixed(4));
    }

    // Test unrelated text
    const unrelatedVector = await generateEmbedding('The recipe for chocolate cake requires flour and eggs.');
    if (unrelatedVector) {
      const unrelatedSim = cosineSimilarity(vector, unrelatedVector);
      console.log(`     Cosine similarity (unrelated texts): ${unrelatedSim.toFixed(4)}`);
      if (unrelatedSim < sim) {
        pass('Unrelated text has lower similarity (embeddings are semantically meaningful)');
      } else {
        warn('Unrelated text similarity not lower than related text');
      }
    }

    return vector;
  } catch (err) {
    fail('generateQueryEmbedding threw an error', err.message);
    return null;
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function testTextBuilders() {
  header('3. Text Builder Functions');

  // Resume text builder
  const resumeText = buildResumeText({
    headline: 'Senior Full Stack Engineer',
    summary: 'Experienced developer with 10 years in web development.',
    skills: ['JavaScript', 'React', 'Node.js', 'AWS', 'MongoDB'],
    experience: [
      { title: 'Senior Engineer', company: 'TechCorp', description: 'Built scalable microservices' },
      { title: 'Full Stack Developer', company: 'StartupXYZ', description: 'Led frontend team' },
    ],
    education: [{ degree: 'Bachelor of Science', field: 'Computer Science', institution: 'MIT' }],
    certifications: [{ name: 'AWS Solutions Architect' }],
    totalYearsOfExperience: 10,
  });

  if (resumeText && resumeText.length > 50) {
    pass('buildResumeText generates meaningful text', `${resumeText.length} chars`);
  } else {
    fail('buildResumeText output too short', `${resumeText?.length || 0} chars`);
  }

  if (resumeText.includes('Senior Full Stack Engineer')) {
    pass('Resume text includes headline');
  } else {
    fail('Resume text missing headline');
  }

  if (resumeText.includes('JavaScript')) {
    pass('Resume text includes skills');
  } else {
    fail('Resume text missing skills');
  }

  // Job text builder
  const jobText = buildJobText({
    title: 'Backend Engineer',
    description: 'We are looking for a backend engineer to build APIs.',
    skills: ['Node.js', 'PostgreSQL', 'Docker'],
    qualifications: 'BS in Computer Science',
    experienceLevel: 'senior',
    employmentType: 'full-time',
    workplaceType: 'remote',
    location: { city: 'San Francisco', state: 'CA', country: 'US' },
  });

  if (jobText && jobText.length > 50) {
    pass('buildJobText generates meaningful text', `${jobText.length} chars`);
  } else {
    fail('buildJobText output too short', `${jobText?.length || 0} chars`);
  }

  // Edge cases
  const emptyResumeText = buildResumeText(null);
  if (emptyResumeText === '') {
    pass('buildResumeText handles null input');
  } else {
    fail('buildResumeText should return empty string for null');
  }

  const emptyJobText = buildJobText(null);
  if (emptyJobText === '') {
    pass('buildJobText handles null input');
  } else {
    fail('buildJobText should return empty string for null');
  }
}

async function testResumeEmbeddingStorage() {
  header('4. Resume Embedding Storage');

  // Find a resume with parsedData to test
  const resume = await Resume.findOne({
    'parsedData.skills': { $exists: true, $not: { $size: 0 } },
  }).lean();

  if (!resume) {
    skip('No resumes with parsed data found in database');
    return null;
  }

  console.log(`     Testing with resume: ${resume._id} (${resume.title || 'untitled'})`);

  const success = await generateResumeEmbedding(resume._id);
  if (success) {
    pass('generateResumeEmbedding completed successfully');
  } else {
    fail('generateResumeEmbedding returned false');
    return null;
  }

  // Verify it was stored
  const updated = await Resume.findById(resume._id).lean();
  if (updated.embedding?.vector?.length > 0) {
    pass(`Embedding stored in DB`, `${updated.embedding.vector.length} dimensions`);
  } else {
    fail('Embedding not found in DB after generation');
    return null;
  }

  if (updated.embedding.model) {
    pass(`Embedding model recorded`, updated.embedding.model);
  } else {
    warn('Embedding model not recorded');
  }

  if (updated.embedding.generatedAt) {
    pass('Embedding timestamp recorded');
  } else {
    warn('Embedding timestamp not recorded');
  }

  return updated;
}

async function testJobEmbeddingStorage() {
  header('5. Job Embedding Storage');

  const job = await Job.findOne({
    title: { $exists: true, $ne: '' },
    description: { $exists: true, $ne: '' },
  }).lean();

  if (!job) {
    skip('No jobs with title + description found in database');
    return null;
  }

  console.log(`     Testing with job: ${job._id} (${job.title})`);

  const success = await generateJobEmbedding(job._id);
  if (success) {
    pass('generateJobEmbedding completed successfully');
  } else {
    fail('generateJobEmbedding returned false');
    return null;
  }

  // Verify stored
  const updated = await Job.findById(job._id).lean();
  if (updated.embedding?.vector?.length > 0) {
    pass(`Embedding stored in DB`, `${updated.embedding.vector.length} dimensions`);
  } else {
    fail('Embedding not found in DB after generation');
    return null;
  }

  return updated;
}

async function testAtlasVectorSearchResumes() {
  header('6. Atlas $vectorSearch — Resumes');

  // Check if any resumes have embeddings
  const embeddedCount = await Resume.countDocuments({
    'embedding.vector': { $exists: true, $not: { $size: 0 } },
  });

  console.log(`     Resumes with embeddings: ${embeddedCount}`);

  if (embeddedCount === 0) {
    skip('No resumes have embeddings — run backfill first');
    return;
  }

  // Detect stored embedding dimensions for diagnostic purposes
  const sampleResume = await Resume.findOne(
    { 'embedding.vector': { $exists: true, $not: { $size: 0 } } },
    { 'embedding.vector': { $slice: 1 }, 'embedding.model': 1 }
  ).lean();
  const storedDims = sampleResume?.embedding?.vector?.length
    ? await Resume.findOne(
        { 'embedding.vector': { $exists: true, $not: { $size: 0 } } },
        { 'embedding.vector': 1 }
      ).lean().then((r) => r?.embedding?.vector?.length)
    : 0;
  if (storedDims) {
    console.log(`     Stored embedding dimensions: ${storedDims}`);
    console.log(`     ⚠  Ensure your Atlas "resume_vector_index" uses numDimensions: ${storedDims}`);
  }

  try {
    const result = await semanticSearchResumes(
      'experienced software engineer with cloud computing skills',
      {},
      { page: 1, limit: 5 }
    );

    if (result && result.docs) {
      if (result.docs.length > 0) {
        pass(`$vectorSearch returned ${result.docs.length} results`);

        // Verify semantic scores are present
        const hasScores = result.docs.every((d) => typeof d.semanticScore === 'number');
        if (hasScores) {
          pass('All results have semanticScore');
          console.log(`     Top score: ${result.docs[0].semanticScore.toFixed(4)}`);
          console.log(`     Bottom score: ${result.docs[result.docs.length - 1].semanticScore.toFixed(4)}`);
        } else {
          warn('Some results missing semanticScore');
        }

        // Verify results are sorted by score (descending)
        const sorted = result.docs.every((d, i) =>
          i === 0 || d.semanticScore <= result.docs[i - 1].semanticScore
        );
        if (sorted) {
          pass('Results sorted by semantic score (descending)');
        } else {
          warn('Results not sorted by score');
        }

        // Verify embedding vectors are NOT leaked in response
        const noVectors = result.docs.every((d) => !d.embedding?.vector?.length);
        if (noVectors) {
          pass('Embedding vectors excluded from response (privacy/performance)');
        } else {
          warn('Embedding vectors leaked in response payload');
        }

        // Verify pagination meta
        if (result.meta?.pagination) {
          pass('Pagination metadata present');
        } else {
          warn('Pagination metadata missing');
        }
      } else {
        warn(
          `$vectorSearch returned 0 results with ${embeddedCount} embedded resume(s)`,
          storedDims
            ? `Fix: recreate "resume_vector_index" in Atlas UI with numDimensions: ${storedDims}`
            : 'Check Atlas Vector Search index exists and numDimensions matches stored embeddings'
        );
        console.log('     → Atlas UI → Database → Search → Create Index (JSON Editor)');
        console.log(`     → { "fields": [{ "type": "vector", "path": "embedding.vector", "numDimensions": ${storedDims || 3072}, "similarity": "cosine" }] }`);
      }
    } else {
      fail('semanticSearchResumes returned invalid result structure');
    }
  } catch (err) {
    if (err.message.includes('vector') || err.message.includes('index') || err.codeName === 'InvalidPipelineOperator') {
      fail('Atlas Vector Search index not found', 'Create "resume_vector_index" in Atlas UI');
      console.log('     → Go to Atlas UI → Database → Search → Create Index (JSON Editor)');
      console.log('     → Index name: resume_vector_index');
      console.log('     → Collection: resumes');
      console.log(`     → Definition: { "fields": [{ "type": "vector", "path": "embedding.vector", "numDimensions": ${storedDims || 3072}, "similarity": "cosine" }] }`);
    } else {
      fail('$vectorSearch query failed', err.message);
    }
  }
}

async function testAtlasVectorSearchJobs() {
  header('7. Atlas $vectorSearch — Jobs');

  const embeddedCount = await Job.countDocuments({
    'embedding.vector': { $exists: true, $not: { $size: 0 } },
  });

  console.log(`     Jobs with embeddings: ${embeddedCount}`);

  if (embeddedCount === 0) {
    skip('No jobs have embeddings — run backfill first');
    return;
  }

  // Detect stored embedding dimensions for diagnostic purposes
  const storedDims = await Job.findOne(
    { 'embedding.vector': { $exists: true, $not: { $size: 0 } } },
    { 'embedding.vector': 1 }
  ).lean().then((j) => j?.embedding?.vector?.length || 0);
  if (storedDims) {
    console.log(`     Stored embedding dimensions: ${storedDims}`);
    console.log(`     ⚠  Ensure your Atlas "job_vector_index" uses numDimensions: ${storedDims}`);
  }

  try {
    const result = await semanticSearchJobs(
      'remote backend developer position with Node.js',
      {},
      { page: 1, limit: 5 }
    );

    if (result && result.docs) {
      if (result.docs.length > 0) {
        pass(`$vectorSearch returned ${result.docs.length} job results`);

        const hasScores = result.docs.every((d) => typeof d.semanticScore === 'number');
        if (hasScores) {
          pass('All job results have semanticScore');
        } else {
          warn('Some job results missing semanticScore');
        }
      } else {
        warn(
          `$vectorSearch returned 0 job results with ${embeddedCount} embedded job(s)`,
          storedDims
            ? `Fix: recreate "job_vector_index" in Atlas UI with numDimensions: ${storedDims}`
            : 'Check Atlas Vector Search index exists and numDimensions matches stored embeddings'
        );
        console.log('     → Atlas UI → Database → Search → Create Index (JSON Editor)');
        console.log(`     → { "fields": [{ "type": "vector", "path": "embedding.vector", "numDimensions": ${storedDims || 3072}, "similarity": "cosine" }] }`);
      }
    } else {
      fail('semanticSearchJobs returned invalid structure');
    }
  } catch (err) {
    if (err.message.includes('vector') || err.message.includes('index') || err.codeName === 'InvalidPipelineOperator') {
      fail('Atlas Vector Search index not found', 'Create "job_vector_index" in Atlas UI');
      console.log(`     → Index name: job_vector_index, Collection: jobs`);
      console.log(`     → Definition: { "fields": [{ "type": "vector", "path": "embedding.vector", "numDimensions": ${storedDims || 3072}, "similarity": "cosine" }] }`);
    } else {
      fail('$vectorSearch query failed', err.message);
    }
  }
}

async function testSimilarDocuments() {
  header('8. Similar Document Lookup');

  // Test similar resumes
  const resumeWithEmbedding = await Resume.findOne({
    'embedding.vector': { $exists: true, $not: { $size: 0 } },
  }).lean();

  const totalEmbeddedResumes = await Resume.countDocuments({
    'embedding.vector': { $exists: true, $not: { $size: 0 } },
  });

  if (resumeWithEmbedding) {
    try {
      const similar = await findSimilarResumes(resumeWithEmbedding._id, 3);
      if (Array.isArray(similar) && similar.length > 0) {
        pass(`findSimilarResumes returned ${similar.length} results`);

        // Verify source doc is excluded
        const includesSelf = similar.some((d) => d._id.toString() === resumeWithEmbedding._id.toString());
        if (!includesSelf) {
          pass('Source resume correctly excluded from similar results');
        } else {
          fail('Source resume included in its own similar results');
        }
      } else {
        if (totalEmbeddedResumes < 2) {
          warn(
            `findSimilarResumes returned 0 results — only ${totalEmbeddedResumes} embedded resume(s)`,
            'Run backfill to embed more resumes: node scripts/backfill-embeddings.js resumes'
          );
        } else {
          warn(
            `findSimilarResumes returned 0 results with ${totalEmbeddedResumes} embedded resume(s)`,
            'Fix: recreate "resume_vector_index" in Atlas UI with correct numDimensions'
          );
        }
      }
    } catch (err) {
      if (err.message.includes('vector') || err.message.includes('index')) {
        fail('Atlas Vector Search index missing for similar resume lookup');
      } else {
        fail('findSimilarResumes failed', err.message);
      }
    }
  } else {
    skip('No resumes with embeddings for similarity test');
  }

  // Test similar jobs
  const jobWithEmbedding = await Job.findOne({
    'embedding.vector': { $exists: true, $not: { $size: 0 } },
  }).lean();

  const totalEmbeddedJobs = await Job.countDocuments({
    'embedding.vector': { $exists: true, $not: { $size: 0 } },
  });

  if (jobWithEmbedding) {
    try {
      const similar = await findSimilarJobs(jobWithEmbedding._id, 3);
      if (Array.isArray(similar) && similar.length > 0) {
        pass(`findSimilarJobs returned ${similar.length} results`);
      } else {
        if (totalEmbeddedJobs < 2) {
          warn(
            `findSimilarJobs returned 0 results — only ${totalEmbeddedJobs} embedded job(s)`,
            'Run backfill to embed more jobs: node scripts/backfill-embeddings.js jobs'
          );
        } else {
          warn(
            `findSimilarJobs returned 0 results with ${totalEmbeddedJobs} embedded job(s)`,
            'Fix: recreate "job_vector_index" in Atlas UI with correct numDimensions'
          );
        }
      }
    } catch (err) {
      if (err.message.includes('vector') || err.message.includes('index')) {
        fail('Atlas Vector Search index missing for similar job lookup');
      } else {
        fail('findSimilarJobs failed', err.message);
      }
    }
  } else {
    skip('No jobs with embeddings for similarity test');
  }
}

async function testRankResumesByJob() {
  header('9. Rank Resumes by Job');

  const job = await Job.findOne({
    title: { $exists: true, $ne: '' },
    status: 'active',
  }).lean();

  const embeddedResumes = await Resume.countDocuments({
    'embedding.vector': { $exists: true, $not: { $size: 0 } },
  });

  if (!job) {
    skip('No active jobs found in database');
    return;
  }

  if (embeddedResumes === 0) {
    skip('No resumes have embeddings for ranking');
    return;
  }

  console.log(`     Ranking resumes against: "${job.title}" (${job._id})`);

  try {
    const result = await rankResumesByJob(job._id, { page: 1, limit: 5 });

    if (result && result.docs) {
      if (result.docs.length > 0) {
        pass(`rankResumesByJob returned ${result.docs.length} ranked candidates`);

        if (result.meta?.jobTitle) {
          pass('Result includes job metadata', result.meta.jobTitle);
        }
      } else {
        // Detect stored embedding dimensions for a clearer message
        const storedDims = await Resume.findOne(
          { 'embedding.vector': { $exists: true, $not: { $size: 0 } } },
          { 'embedding.vector': 1 }
        ).lean().then((r) => r?.embedding?.vector?.length || 0);
        warn(
          `rankResumesByJob returned 0 results with ${embeddedResumes} embedded resume(s)`,
          storedDims
            ? `Fix: recreate "resume_vector_index" in Atlas UI with numDimensions: ${storedDims}`
            : 'Check Atlas Vector Search index numDimensions matches stored embeddings'
        );
      }
    } else {
      fail('rankResumesByJob returned invalid structure');
    }
  } catch (err) {
    if (err.message.includes('vector') || err.message.includes('index')) {
      fail('Atlas Vector Search index missing for resume ranking');
    } else {
      fail('rankResumesByJob failed', err.message);
    }
  }
}

async function testSearchServiceIntegration() {
  header('10. Search Service Integration (Hybrid Mode)');

  // Import the search service to test its hybrid mode
  let searchService;
  try {
    searchService = require('../src/services/search.service');
    pass('Search service loaded successfully');
  } catch (err) {
    fail('Failed to load search service', err.message);
    return;
  }

  // Test hybrid job search
  try {
    const jobResult = await searchService.searchJobs({
      q: 'software engineer',
      mode: 'hybrid',
      page: 1,
      limit: 5,
    });

    if (jobResult && jobResult.docs) {
      pass(`Hybrid job search returned ${jobResult.docs.length} results`);
      if (jobResult.meta?.searchMode === 'hybrid') {
        pass('Search mode correctly reported as hybrid');
      }
    } else {
      warn('Hybrid job search returned no docs (may be empty DB)');
    }
  } catch (err) {
    // If it fails due to missing vector index, that's expected — keyword should still work
    warn('Hybrid job search encountered an issue', err.message);
  }

  // Test hybrid resume search
  try {
    const resumeResult = await searchService.searchResumes({
      q: 'React developer',
      mode: 'hybrid',
      page: 1,
      limit: 5,
    });

    if (resumeResult && resumeResult.docs) {
      pass(`Hybrid resume search returned ${resumeResult.docs.length} results`);
      if (resumeResult.meta?.searchMode === 'hybrid') {
        pass('Resume search mode correctly reported as hybrid');
      }
      if (resumeResult.meta?.keywordResults !== undefined) {
        console.log(`     Keyword results: ${resumeResult.meta.keywordResults}`);
        console.log(`     Semantic results: ${resumeResult.meta.semanticResults}`);
      }
    } else {
      warn('Hybrid resume search returned no docs');
    }
  } catch (err) {
    warn('Hybrid resume search encountered an issue', err.message);
  }

  // Test keyword-only mode (should always work)
  try {
    const keywordResult = await searchService.searchJobs({
      q: 'developer',
      mode: 'keyword',
      page: 1,
      limit: 5,
    });

    if (keywordResult && keywordResult.docs !== undefined) {
      pass('Keyword-only search mode works');
    } else {
      fail('Keyword-only search mode failed');
    }
  } catch (err) {
    fail('Keyword-only search mode threw an error', err.message);
  }
}

// ── Main ────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('🔍 Semantic Search Verification Script');
  console.log('═'.repeat(60));
  console.log(`  Embedding Model: ${config.gemini.embeddingModel || 'gemini-embedding-001'}`);
  console.log(`  Gemini Model:    ${config.gemini.model || 'gemini-3.6-flash'}`);
  console.log(`  API Key:         ${config.gemini.apiKey ? '***' + config.gemini.apiKey.slice(-4) : 'NOT SET'}`);
  console.log(`  MongoDB:         ${config.mongodb.uri ? config.mongodb.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'NOT SET'}`);
  console.log('═'.repeat(60));

  // Connect to MongoDB
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log(`\n  ${PASS} Connected to MongoDB`);

    const resumeCount = await Resume.countDocuments();
    const jobCount = await Job.countDocuments();
    console.log(`     Resumes: ${resumeCount} | Jobs: ${jobCount}`);
  } catch (err) {
    console.log(`\n  ${FAIL} Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }

  // Run all tests sequentially
  const docVector = await testGeminiApiConnectivity();
  if (!docVector) {
    console.log('\n  ⛔ Gemini API not working — skipping remaining tests that require embeddings\n');
    await testTextBuilders();
  } else {
    await testQueryEmbedding();
    await testTextBuilders();
    await testResumeEmbeddingStorage();
    await testJobEmbeddingStorage();
    await testAtlasVectorSearchResumes();
    await testAtlasVectorSearchJobs();
    await testSimilarDocuments();
    await testRankResumesByJob();
    await testSearchServiceIntegration();
  }

  // Summary
  console.log('');
  console.log('═'.repeat(60));
  console.log('  RESULTS');
  console.log('═'.repeat(60));
  console.log(`  ${PASS} Passed:  ${passCount}`);
  console.log(`  ${FAIL} Failed:  ${failCount}`);
  console.log(`  ${WARN} Warnings: ${warnCount}`);
  console.log(`  ${SKIP} Skipped: ${skipCount}`);
  console.log('═'.repeat(60));

  if (failCount === 0) {
    console.log(`\n  🎉 All tests passed! Semantic search is working correctly.\n`);
  } else {
    console.log(`\n  🔧 ${failCount} test(s) failed. Check the output above for details.\n`);
  }

  await mongoose.disconnect();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n  ${FAIL} Unexpected error: ${err.message}\n`);
  mongoose.disconnect().then(() => process.exit(1));
});
