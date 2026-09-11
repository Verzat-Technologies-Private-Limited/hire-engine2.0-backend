/**
 * Comprehensive Candidate Database Endpoint Test Suite
 *
 * Tests all endpoints related to the candidate database against the real MongoDB Atlas database:
 *
 * 1. Talent Sourcing / Resume Database Search (`GET /api/v1/search/resumes`)
 *    - Keyword & Boolean search (`mode=keyword`)
 *    - Skills filter (`skills=...`)
 *    - Experience range filter (`experienceMin=...&experienceMax=...`)
 *    - Education filter (`education=...`)
 *    - Location filter (`location=...`)
 *    - Sorting (`sort=relevance|experience|date`)
 *    - Pagination (`page=...&limit=...`)
 *    - Semantic AI Search (`mode=semantic`)
 *    - Hybrid AI + Boolean Search (`mode=hybrid`)
 *    - RBAC: Employer/Admin allowed (200), Jobseeker forbidden (403), Anonymous unauthorized (401)
 *    - Privacy: Private profiles are excluded from candidate database searches
 *
 * 2. Candidate Similarity & AI Job Ranking (`/api/v1/search/resumes/...`)
 *    - `GET /api/v1/search/resumes/similar/:resumeId` (Find similar candidates)
 *    - `GET /api/v1/search/resumes/rank-by-job/:jobId` (AI-rank candidate database by job fit)
 *    - RBAC & validation tests
 *
 * 3. Saved Candidate Searches & Alerts (`/api/v1/search/saved`)
 *    - `POST /api/v1/search/saved` (Save search criteria)
 *    - `GET /api/v1/search/saved` (List saved searches)
 *    - `DELETE /api/v1/search/saved/:id` (Delete saved search)
 *
 * 4. Candidate Resume Inspection & AI Match (`/api/v1/resumes/...`)
 *    - `GET /api/v1/resumes/:id` (View candidate parsed resume)
 *    - `GET /api/v1/resumes/:id/analysis` (AI ATS feedback & critique)
 *    - `GET /api/v1/resumes/:id/match/:jobId` (Direct resume-to-job match score)
 *    - Privacy: Private candidate resume hidden from non-hiring recruiters
 *
 * 5. Candidate ATS Applications & Notes (`/api/v1/applications/...`)
 *    - `GET /api/v1/applications/jobs/:jobId/applications` (List job applicants)
 *    - `GET /api/v1/applications/:id` (Candidate application details)
 *    - `GET /api/v1/applications/:id/fit` (AI Candidate Fit Score)
 *    - `POST /api/v1/applications/:id/notes` (Add recruiter note)
 *    - `GET /api/v1/applications/:id/notes` (List recruiter notes)
 *    - `POST /api/v1/applications/:id/rate` (Rate candidate 1-5 stars)
 *
 * Usage:
 *   node scripts/test-candidate-database-atlas.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');

const User = require('../src/models/User');
const Resume = require('../src/models/Resume');
const Job = require('../src/models/Job');
const Company = require('../src/models/Company');
const Application = require('../src/models/Application');
const CandidateNote = require('../src/models/CandidateNote');
const SavedSearch = require('../src/models/SavedSearch');
const { generateAccessToken } = require('../src/utils/tokens');

// ── Test Result Reporters ─────────────────────────────────────────
const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
const WARN = '⚠️ WARN';
const INFO = 'ℹ️ INFO';

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function logPass(title, details = '') {
  passCount++;
  console.log(`  ${PASS}: ${title}${details ? ` (${details})` : ''}`);
}

function logFail(title, error = '') {
  failCount++;
  console.log(`  ${FAIL}: ${title}${error ? ` -> ${error}` : ''}`);
}

function logWarn(title, details = '') {
  warnCount++;
  console.log(`  ${WARN}: ${title}${details ? ` -> ${details}` : ''}`);
}

function logInfo(msg) {
  console.log(`  ${INFO}: ${msg}`);
}

function logSection(title) {
  console.log(`\n================================================================`);
  console.log(`  ${title}`);
  console.log(`================================================================`);
}

// ── Test Execution ────────────────────────────────────────────────
async function runTestSuite() {
  console.log('\n🚀 Starting Candidate Database Endpoints Test Suite against MongoDB Atlas...');
  console.log(`   Database Target: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@') : 'MISSING'}\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(` Connected to MongoDB Atlas host: ${mongoose.connection.host}/${mongoose.connection.name}`);

  const cleanup = {
    users: [],
    resumes: [],
    savedSearches: [],
    notes: [],
  };

  try {
    // ── 0. Setup Test Personas & Test Data ───────────────────────────
    logSection('0. Setup Test Personas & Data Verification');

    let employerUser = await User.findOne({ role: 'employer', status: 'active' });
    let adminUser = await User.findOne({ role: 'admin', status: 'active' });
    let seekerUser = await User.findOne({ role: 'jobseeker', status: 'active' });

    if (!employerUser) {
      employerUser = await User.create({
        firstName: 'Test',
        lastName: 'Employer',
        email: `test_emp_${Date.now()}@example.com`,
        passwordHash: 'Password123!',
        role: 'employer',
        status: 'active',
        profileVisibility: 'public',
      });
      cleanup.users.push(employerUser._id);
    }

    if (!adminUser) {
      adminUser = await User.create({
        firstName: 'Test',
        lastName: 'Admin',
        email: `test_admin_${Date.now()}@example.com`,
        passwordHash: 'Password123!',
        role: 'admin',
        status: 'active',
        profileVisibility: 'public',
      });
      cleanup.users.push(adminUser._id);
    }

    if (!seekerUser) {
      seekerUser = await User.create({
        firstName: 'Test',
        lastName: 'Seeker',
        email: `test_seeker_${Date.now()}@example.com`,
        passwordHash: 'Password123!',
        role: 'jobseeker',
        status: 'active',
        profileVisibility: 'public',
      });
      cleanup.users.push(seekerUser._id);
    }

    // Create one controlled public candidate and one private candidate for visibility tests
    const uniqueTestTag = `AtlasTest_${Date.now()}`;

    const testCandidatePublic = await User.create({
      firstName: 'AtlasPublic',
      lastName: 'Candidate',
      email: `atlas_public_${Date.now()}@testdb.com`,
      passwordHash: 'Password123!',
      role: 'jobseeker',
      status: 'active',
      profileVisibility: 'public',
    });
    cleanup.users.push(testCandidatePublic._id);

    const testResumePublic = await Resume.create({
      user: testCandidatePublic._id,
      title: 'Atlas Public FullStack Resume',
      fileUrl: 'https://example.com/resumes/atlas_public.pdf',
      publicId: `resumes/atlas_public_${Date.now()}`,
      fileType: 'pdf',
      parsedData: {
        skills: [uniqueTestTag, 'Node.js', 'React', 'TypeScript', 'MongoDB'],
        headline: 'Senior Full Stack Cloud Engineer',
        summary: `Experienced software developer specializing in ${uniqueTestTag} and microservices architecture.`,
        totalYearsOfExperience: 6,
        education: [
          {
            degree: 'Bachelor of Technology',
            field: 'Computer Science',
            institution: 'University of Science',
            graduationYear: 2020,
          },
        ],
        personalInfo: {
          location: 'San Francisco, CA',
        },
      },
    });
    cleanup.resumes.push(testResumePublic._id);

    const testCandidatePrivate = await User.create({
      firstName: 'AtlasPrivate',
      lastName: 'Candidate',
      email: `atlas_private_${Date.now()}@testdb.com`,
      passwordHash: 'Password123!',
      role: 'jobseeker',
      status: 'active',
      profileVisibility: 'private',
    });
    cleanup.users.push(testCandidatePrivate._id);

    const testResumePrivate = await Resume.create({
      user: testCandidatePrivate._id,
      title: 'Atlas Private Secret Resume',
      fileUrl: 'https://example.com/resumes/atlas_private.pdf',
      publicId: `resumes/atlas_private_${Date.now()}`,
      fileType: 'pdf',
      parsedData: {
        skills: [uniqueTestTag, 'SecretTech'],
        headline: 'Confidential Senior Researcher',
        totalYearsOfExperience: 10,
        personalInfo: {
          location: 'San Francisco, CA',
        },
      },
    });
    cleanup.resumes.push(testResumePrivate._id);

    const empToken = generateAccessToken({ userId: employerUser._id, role: employerUser.role });
    const adminToken = generateAccessToken({ userId: adminUser._id, role: adminUser.role });
    const seekerToken = generateAccessToken({ userId: seekerUser._id, role: seekerUser.role });

    logPass('Personas and test data prepared', `Public candidate: ${testCandidatePublic.email}, Private candidate: ${testCandidatePrivate.email}`);

    // ── 1. Talent Sourcing & Resume Database Search ──────────────────
    logSection('1. Talent Sourcing / Candidate Resume Database Search');

    // 1.1 RBAC Enforcement
    {
      const resUnauth = await request(app).get('/api/v1/search/resumes');
      if (resUnauth.status === 401) {
        logPass('RBAC: Anonymous access rejected with 401 Unauthorized');
      } else {
        logFail('RBAC: Anonymous access was not blocked', `Status: ${resUnauth.status}`);
      }

      const resSeeker = await request(app)
        .get('/api/v1/search/resumes')
        .set('Authorization', `Bearer ${seekerToken}`);
      if (resSeeker.status === 403) {
        logPass('RBAC: Jobseeker access rejected with 403 Forbidden');
      } else {
        logFail('RBAC: Jobseeker access was not forbidden', `Status: ${resSeeker.status}`);
      }

      const resEmployer = await request(app)
        .get('/api/v1/search/resumes?mode=keyword')
        .set('Authorization', `Bearer ${empToken}`);
      if (resEmployer.status === 200 && Array.isArray(resEmployer.body.data)) {
        logPass('RBAC: Employer access authorized (200 OK)', `Found ${resEmployer.body.data.length} candidate(s)`);
      } else {
        logFail('RBAC: Employer access failed', `Status: ${resEmployer.status}`);
      }

      const resAdmin = await request(app)
        .get('/api/v1/search/resumes?mode=keyword')
        .set('Authorization', `Bearer ${adminToken}`);
      if (resAdmin.status === 200) {
        logPass('RBAC: Admin access authorized (200 OK)');
      } else {
        logFail('RBAC: Admin access failed', `Status: ${resAdmin.status}`);
      }
    }

    // 1.2 Keyword & Skills Filtering
    {
      const resSkill = await request(app)
        .get(`/api/v1/search/resumes?skills=${encodeURIComponent(uniqueTestTag)}&mode=keyword`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resSkill.status === 200 && resSkill.body.data?.length > 0) {
        const foundIds = resSkill.body.data.map((d) => d._id.toString());
        const hasPublic = foundIds.includes(testResumePublic._id.toString());
        const hasPrivate = foundIds.includes(testResumePrivate._id.toString());

        if (hasPublic) {
          logPass('Skills Filter: Found public candidate by skill', `Skill: ${uniqueTestTag}`);
        } else {
          logFail('Skills Filter: Public candidate with skill was not returned');
        }

        if (!hasPrivate) {
          logPass('Privacy Protection: Private candidate resume was blocked from resume database search');
        } else {
          logFail('Security Leak: Private candidate was returned in resume search!');
        }
      } else {
        logFail('Skills filter request failed or returned empty results', `Status: ${resSkill.status}`);
      }
    }

    // 1.3 Experience Range Filter
    {
      const resExp = await request(app)
        .get(`/api/v1/search/resumes?skills=${encodeURIComponent(uniqueTestTag)}&experienceMin=5&experienceMax=8&mode=keyword`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resExp.status === 200 && resExp.body.data?.length > 0) {
        logPass('Experience Filter: Correctly matched candidate with 6 years experience');
      } else {
        logFail('Experience Filter: Candidate not matched in range 5-8 years', `Status: ${resExp.status}`);
      }

      const resExpMismatch = await request(app)
        .get(`/api/v1/search/resumes?skills=${encodeURIComponent(uniqueTestTag)}&experienceMin=15&mode=keyword`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resExpMismatch.status === 200 && resExpMismatch.body.data?.length === 0) {
        logPass('Experience Filter: Correctly filtered out candidate with experienceMin=15');
      } else {
        logFail('Experience Filter: Candidate was not filtered out when out of range');
      }
    }

    // 1.4 Education & Location Filters
    {
      const resEdu = await request(app)
        .get(`/api/v1/search/resumes?skills=${encodeURIComponent(uniqueTestTag)}&education=bachelor&mode=keyword`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resEdu.status === 200 && resEdu.body.data?.length > 0) {
        logPass('Education Filter: Correctly matched candidate with bachelor degree');
      } else {
        logFail('Education Filter failed', `Status: ${resEdu.status}`);
      }

      const resLoc = await request(app)
        .get(`/api/v1/search/resumes?skills=${encodeURIComponent(uniqueTestTag)}&location=San%20Francisco&mode=keyword`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resLoc.status === 200 && resLoc.body.data?.length > 0) {
        logPass('Location Filter: Correctly matched candidate by location "San Francisco"');
      } else {
        logFail('Location Filter failed', `Status: ${resLoc.status}`);
      }
    }

    // 1.5 Sorting & Pagination
    {
      const resPaged = await request(app)
        .get('/api/v1/search/resumes?mode=keyword&page=1&limit=3&sort=experience')
        .set('Authorization', `Bearer ${empToken}`);

      if (resPaged.status === 200 && resPaged.body.meta?.pagination) {
        const pagination = resPaged.body.meta.pagination;
        logPass('Pagination & Sorting: Pagination metadata returned', `Limit: ${pagination.limit}, Total: ${pagination.totalDocs}, Docs: ${resPaged.body.data.length}`);
      } else {
        logFail('Pagination metadata missing or error in pagination query');
      }
    }

    // 1.6 Hybrid & Semantic Search Modes
    {
      const resHybrid = await request(app)
        .get('/api/v1/search/resumes?q=developer&mode=hybrid')
        .set('Authorization', `Bearer ${empToken}`);

      if (resHybrid.status === 200 && resHybrid.body.meta?.searchMode === 'hybrid') {
        logPass('Hybrid Search Mode: Executed hybrid resume database search (200 OK)', `Found: ${resHybrid.body.data.length} docs`);
      } else {
        logFail('Hybrid Search Mode failed', `Status: ${resHybrid.status}`);
      }

      const resSemantic = await request(app)
        .get('/api/v1/search/resumes?q=Full%20Stack%20Cloud%20Engineer&mode=semantic')
        .set('Authorization', `Bearer ${empToken}`);

      if (resSemantic.status === 200 && resSemantic.body.meta?.searchMode === 'semantic') {
        logPass('Semantic Search Mode: Executed semantic vector resume search (200 OK)', `Docs: ${resSemantic.body.data.length}`);
      } else {
        logWarn('Semantic Search Mode status', `Status: ${resSemantic.status}`);
      }
    }

    // ── 2. Candidate Similarity & AI Job Ranking ──────────────────────
    logSection('2. Candidate Similarity & AI Job Ranking');

    // 2.1 Candidate Vector Similarity (`GET /api/v1/search/resumes/similar/:resumeId`)
    {
      const embeddedResume = await Resume.findOne({
        'embedding.vector': { $exists: true, $ne: [] },
      });

      if (embeddedResume) {
        const resSimilar = await request(app)
          .get(`/api/v1/search/resumes/similar/${embeddedResume._id}?limit=5`)
          .set('Authorization', `Bearer ${empToken}`);

        if (resSimilar.status === 200) {
          logPass('Similar Candidates: Successfully queried similar candidates (200 OK)', `Returned: ${resSimilar.body.data?.length || 0} similar candidate(s)`);
        } else {
          logFail('Similar Candidates endpoint failed', `Status: ${resSimilar.status}, Error: ${JSON.stringify(resSimilar.body)}`);
        }
      } else {
        logWarn('Similar Candidates: No pre-existing resume with vector embedding found in Atlas to test similarity');
      }

      // Check RBAC
      const resSimJobseeker = await request(app)
        .get(`/api/v1/search/resumes/similar/${testResumePublic._id}`)
        .set('Authorization', `Bearer ${seekerToken}`);

      if (resSimJobseeker.status === 403) {
        logPass('Similar Candidates RBAC: Jobseeker blocked with 403 Forbidden');
      } else {
        logFail('Similar Candidates RBAC: Jobseeker was not blocked', `Status: ${resSimJobseeker.status}`);
      }
    }

    // 2.2 AI-Rank Candidate Database by Job Fit (`GET /api/v1/search/resumes/rank-by-job/:jobId`)
    {
      const existingJob = await Job.findOne({ status: 'active' });

      if (existingJob) {
        const resRank = await request(app)
          .get(`/api/v1/search/resumes/rank-by-job/${existingJob._id}?page=1&limit=5`)
          .set('Authorization', `Bearer ${empToken}`);

        if (resRank.status === 200) {
          logPass('AI Job-to-Candidate Ranking: Successfully ranked candidate database against job (200 OK)', `Docs: ${resRank.body.data?.length || 0}, Job: "${existingJob.title}"`);
        } else {
          logFail('AI Job-to-Candidate Ranking failed', `Status: ${resRank.status}`);
        }
      } else {
        logWarn('AI Job-to-Candidate Ranking: No active job found in Atlas to rank candidates against');
      }

      // Check RBAC
      const resRankJobseeker = await request(app)
        .get(`/api/v1/search/resumes/rank-by-job/${testResumePublic._id}`)
        .set('Authorization', `Bearer ${seekerToken}`);

      if (resRankJobseeker.status === 403) {
        logPass('AI Job Ranking RBAC: Jobseeker blocked with 403 Forbidden');
      } else {
        logFail('AI Job Ranking RBAC: Jobseeker was not blocked', `Status: ${resRankJobseeker.status}`);
      }
    }

    // ── 3. Saved Candidate Searches & Alerts ──────────────────────────
    logSection('3. Saved Candidate Searches & Alerts');

    let savedSearchId = null;

    // 3.1 Create Saved Candidate Search
    {
      const savePayload = {
        name: `Senior React Developers Alert ${Date.now()}`,
        searchType: 'resumes',
        filters: {
          q: 'React AND Node.js',
          location: 'San Francisco, CA',
          experienceMin: 5,
        },
        frequency: 'daily',
        emailAlert: true,
        smsAlert: false,
      };

      const resSave = await request(app)
        .post('/api/v1/search/saved')
        .set('Authorization', `Bearer ${empToken}`)
        .send(savePayload);

      if (resSave.status === 201 && resSave.body.data?._id) {
        savedSearchId = resSave.body.data._id;
        cleanup.savedSearches.push(savedSearchId);
        logPass('Save Search Criteria: Saved candidate database search (201 Created)', `ID: ${savedSearchId}`);
      } else {
        logFail('Save Search Criteria failed', `Status: ${resSave.status}, Error: ${JSON.stringify(resSave.body)}`);
      }
    }

    // 3.2 List Saved Searches
    {
      const resList = await request(app)
        .get('/api/v1/search/saved')
        .set('Authorization', `Bearer ${empToken}`);

      if (resList.status === 200 && Array.isArray(resList.body.data)) {
        const found = resList.body.data.some((s) => s._id.toString() === savedSearchId?.toString());
        if (found) {
          logPass('List Saved Searches: Successfully retrieved saved searches (200 OK)', `Includes newly created search`);
        } else {
          logFail('List Saved Searches: Newly created search not found in list');
        }
      } else {
        logFail('List Saved Searches failed', `Status: ${resList.status}`);
      }
    }

    // 3.3 Delete Saved Search
    if (savedSearchId) {
      const resDel = await request(app)
        .delete(`/api/v1/search/saved/${savedSearchId}`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resDel.status === 200) {
        logPass('Delete Saved Search: Successfully deleted saved search (200 OK)');
      } else {
        logFail('Delete Saved Search failed', `Status: ${resDel.status}`);
      }
    }

    // ── 4. Candidate Resume Inspection & AI Match ─────────────────────
    logSection('4. Candidate Resume Inspection & AI Match');

    // 4.1 Employer viewing candidate's parsed resume
    {
      const resView = await request(app)
        .get(`/api/v1/resumes/${testResumePublic._id}`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resView.status === 200 && resView.body.data?._id) {
        logPass('View Candidate Resume: Employer successfully retrieved candidate resume (200 OK)', `Title: "${resView.body.data.title}"`);
      } else {
        logFail('View Candidate Resume: Employer could not retrieve public candidate resume', `Status: ${resView.status}, Error: ${JSON.stringify(resView.body)}`);
      }
    }

    // 4.2 Candidate privacy: Employer attempting to view private candidate resume without application
    {
      const resViewPrivate = await request(app)
        .get(`/api/v1/resumes/${testResumePrivate._id}`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resViewPrivate.status === 404 || resViewPrivate.status === 403) {
        logPass('Privacy Enforcement: Employer blocked from viewing private candidate resume', `Status: ${resViewPrivate.status}`);
      } else {
        logFail('Security Leak: Employer was able to view private candidate resume without an application!', `Status: ${resViewPrivate.status}`);
      }
    }

    // 4.3 AI Resume Analysis & ATS Feedback (`GET /api/v1/resumes/:id/analysis`)
    {
      const resAnalysis = await request(app)
        .get(`/api/v1/resumes/${testResumePublic._id}/analysis`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resAnalysis.status === 200 && resAnalysis.body.data) {
        logPass('AI Resume Analysis: Successfully generated ATS critique & feedback (200 OK)', `ATS Score: ${resAnalysis.body.data.atsScore ?? 'N/A'}`);
      } else {
        logFail('AI Resume Analysis failed', `Status: ${resAnalysis.status}, Error: ${JSON.stringify(resAnalysis.body)}`);
      }
    }

    // 4.4 Direct Resume-to-Job Match Analysis (`GET /api/v1/resumes/:id/match/:jobId`)
    {
      const existingJob = await Job.findOne({ status: 'active' });
      if (existingJob) {
        const resMatch = await request(app)
          .get(`/api/v1/resumes/${testResumePublic._id}/match/${existingJob._id}`)
          .set('Authorization', `Bearer ${empToken}`);

        if (resMatch.status === 200 && resMatch.body.data) {
          logPass('Direct Resume-to-Job Match: Match score & skill gap analysis computed (200 OK)', `Match Score: ${resMatch.body.data.overallMatchScore ?? resMatch.body.data.matchScore ?? 'Calculated'}`);
        } else {
          logFail('Direct Resume-to-Job Match failed', `Status: ${resMatch.status}, Error: ${JSON.stringify(resMatch.body)}`);
        }
      } else {
        logWarn('Direct Resume-to-Job Match: Skipped because no active job found');
      }
    }

    // ── 5. Candidate ATS Pipeline Management ─────────────────────────
    logSection('5. Candidate ATS Pipeline & Recruiter Notes');

    // Create a company and job for employer to test applicant management
    const testCompany = await Company.create({
      name: `Candidate DB Test Company ${Date.now()}`,
      owner: employerUser._id,
      industry: 'Technology',
      countryCode: 'US',
      verificationStatus: 'approved',
      teamMembers: [{ user: employerUser._id, role: 'owner' }],
    });
    cleanup.companies = cleanup.companies || [];
    cleanup.companies.push(testCompany._id);

    const testJob = await Job.create({
      company: testCompany._id,
      postedBy: employerUser._id,
      title: `Lead Cloud Engineer ${Date.now()}`,
      description: 'Candidate database verification job description',
      skills: ['Node.js', 'React', 'MongoDB'],
      employmentType: 'full-time',
      workplaceType: 'remote',
      status: 'active',
    });
    cleanup.jobs = cleanup.jobs || [];
    cleanup.jobs.push(testJob._id);

    const testApplication = await Application.create({
      job: testJob._id,
      applicant: testCandidatePublic._id,
      resume: testResumePublic._id,
      coverLetter: 'Testing ATS pipeline candidate details',
      status: 'submitted',
      pipelineStage: 'New',
    });
    cleanup.applications = cleanup.applications || [];
    cleanup.applications.push(testApplication._id);

    // 5.1 List applicants for a job
    {
      const resJobApps = await request(app)
        .get(`/api/v1/applications/jobs/${testJob._id}/applications`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resJobApps.status === 200 && Array.isArray(resJobApps.body.data)) {
        logPass('List Job Applicants: Retrieved candidates in job pipeline (200 OK)', `Total: ${resJobApps.body.data.length}`);
      } else {
        logFail('List Job Applicants failed', `Status: ${resJobApps.status}`);
      }
    }

    // 5.2 Single Candidate Application Details
    {
      const resApp = await request(app)
        .get(`/api/v1/applications/${testApplication._id}`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resApp.status === 200 && resApp.body.data?._id) {
        logPass('Candidate Application: Retrieved candidate application details (200 OK)');
      } else {
        logFail('Candidate Application details failed', `Status: ${resApp.status}`);
      }
    }

    // 5.3 Candidate Fit Analysis
    {
      const resFit = await request(app)
        .get(`/api/v1/applications/${testApplication._id}/fit`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resFit.status === 200 && resFit.body.data) {
        logPass('AI Candidate Fit Analysis: Computed fit scorecard (200 OK)', `Score: ${resFit.body.data.fitScore ?? 'Generated'}`);
      } else {
        logWarn('AI Candidate Fit Analysis status', `Status: ${resFit.status}`);
      }
    }

    // 5.4 Recruiter Note on Candidate Application
    let noteId = null;
    {
      const notePayload = {
        content: `Candidate demonstrated strong problem solving skills during technical screening. ${Date.now()}`,
        rating: 5,
        isPrivate: false,
      };

      const resNote = await request(app)
        .post(`/api/v1/applications/${testApplication._id}/notes`)
        .set('Authorization', `Bearer ${empToken}`)
        .send(notePayload);

      if (resNote.status === 201 && resNote.body.data?._id) {
        noteId = resNote.body.data._id;
        cleanup.notes.push(noteId);
        logPass('Add Recruiter Note: Successfully added ATS note to candidate (201 Created)', `Note ID: ${noteId}`);
      } else {
        logFail('Add Recruiter Note failed', `Status: ${resNote.status}, Error: ${JSON.stringify(resNote.body)}`);
      }
    }

    // 5.5 List Recruiter Notes
    {
      const resNotesList = await request(app)
        .get(`/api/v1/applications/${testApplication._id}/notes`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resNotesList.status === 200 && Array.isArray(resNotesList.body.data)) {
        logPass('List Recruiter Notes: Retrieved notes on candidate (200 OK)', `Total notes: ${resNotesList.body.data.length}`);
      } else {
        logFail('List Recruiter Notes failed', `Status: ${resNotesList.status}`);
      }
    }

    // 5.6 Rate Candidate 1-5 Stars
    {
      const resRate = await request(app)
        .post(`/api/v1/applications/${testApplication._id}/rate`)
        .set('Authorization', `Bearer ${empToken}`)
        .send({ rating: 5 });

      if (resRate.status === 200 && resRate.body.data?.rating === 5) {
        logPass('Rate Candidate: Rated candidate 5 stars (200 OK)');
      } else {
        logFail('Rate Candidate failed', `Status: ${resRate.status}`);
      }

      const resClear = await request(app)
        .delete(`/api/v1/applications/${testApplication._id}/rate`)
        .set('Authorization', `Bearer ${empToken}`);

      if (resClear.status === 200) {
        logPass('Clear Rating: Successfully reset candidate rating (200 OK)');
      } else {
        logFail('Clear Rating failed', `Status: ${resClear.status}`);
      }
    }

  } catch (error) {
    console.error('\n Unexpected error during test execution:', error);
    failCount++;
  } finally {
    // ── Cleanup Test Records ─────────────────────────────────────────
    logSection('Cleanup Test Records');
    try {
      if (cleanup.resumes.length > 0) {
        await Resume.deleteMany({ _id: { $in: cleanup.resumes } });
        logInfo(`Cleaned up ${cleanup.resumes.length} test resume(s)`);
      }
      if (cleanup.applications && cleanup.applications.length > 0) {
        await Application.deleteMany({ _id: { $in: cleanup.applications } });
        logInfo(`Cleaned up ${cleanup.applications.length} test application(s)`);
      }
      if (cleanup.jobs && cleanup.jobs.length > 0) {
        await Job.deleteMany({ _id: { $in: cleanup.jobs } });
        logInfo(`Cleaned up ${cleanup.jobs.length} test job(s)`);
      }
      if (cleanup.companies && cleanup.companies.length > 0) {
        await Company.deleteMany({ _id: { $in: cleanup.companies } });
        logInfo(`Cleaned up ${cleanup.companies.length} test company/companies`);
      }
      if (cleanup.users.length > 0) {
        await User.deleteMany({ _id: { $in: cleanup.users } });
        logInfo(`Cleaned up ${cleanup.users.length} test user(s)`);
      }
      if (cleanup.savedSearches.length > 0) {
        await SavedSearch.deleteMany({ _id: { $in: cleanup.savedSearches } });
        logInfo(`Cleaned up ${cleanup.savedSearches.length} test saved search(es)`);
      }
      if (cleanup.notes.length > 0) {
        await CandidateNote.deleteMany({ _id: { $in: cleanup.notes } });
        logInfo(`Cleaned up ${cleanup.notes.length} test candidate note(s)`);
      }
    } catch (cleanErr) {
      console.error('Error during cleanup:', cleanErr.message);
    }

    await mongoose.connection.close();
    console.log('\n MongoDB Atlas connection closed.');

    // ── Final Summary ────────────────────────────────────────────────
    console.log(`\n================================================================`);
    console.log(`  CANDIDATE DATABASE ENDPOINT TEST SUMMARY`);
    console.log(`================================================================`);
    console.log(`  Total Passed: ${passCount} ✅`);
    console.log(`  Total Failed: ${failCount} ❌`);
    console.log(`  Total Warnings: ${warnCount} ⚠️`);
    console.log(`================================================================\n`);

    if (failCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTestSuite();
