require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Resume = require('../src/models/Resume');
const Company = require('../src/models/Company');
const Application = require('../src/models/Application');
const Notification = require('../src/models/Notification');

const searchService = require('../src/services/search.service');
const jobService = require('../src/services/job.service');
const applicationService = require('../src/services/application.service');
const authService = require('../src/services/auth.service');

async function runTests() {
  console.log('--- Connecting to MongoDB ---');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected successfully.\n');

  const cleanupIds = {
    users: [],
    companies: [],
    jobs: [],
    resumes: [],
    applications: [],
    notifications: [],
  };

  try {
    // =========================================================================
    // TEST 1: Resume Search Visibility Leak
    // =========================================================================
    console.log('====================================================');
    console.log('TEST 1: Resume Search Visibility Leak');
    console.log('====================================================');

    const publicCandidate = await User.create({
      firstName: 'Public',
      lastName: 'Candidate',
      email: `public_cand_${Date.now()}@test.com`,
      passwordHash: 'Password123!',
      role: 'jobseeker',
      profileVisibility: 'public',
      status: 'active',
    });
    cleanupIds.users.push(publicCandidate._id);

    const privateCandidate = await User.create({
      firstName: 'Private',
      lastName: 'Candidate',
      email: `private_cand_${Date.now()}@test.com`,
      passwordHash: 'Password123!',
      role: 'jobseeker',
      profileVisibility: 'private',
      status: 'active',
    });
    cleanupIds.users.push(privateCandidate._id);

    const uniqueSkill = `SkillAudit_${Date.now()}`;

    const publicResume = await Resume.create({
      user: publicCandidate._id,
      title: 'Public Candidate Resume',
      fileUrl: 'https://res.cloudinary.com/test/public.pdf',
      publicId: 'resumes/public_test',
      fileType: 'pdf',
      parsedData: {
        skills: [uniqueSkill, 'Node.js'],
        personalInfo: { location: 'New York, NY' },
        rawText: `Experienced developer with ${uniqueSkill}`,
      },
    });
    cleanupIds.resumes.push(publicResume._id);

    const privateResume = await Resume.create({
      user: privateCandidate._id,
      title: 'Private Candidate Resume',
      fileUrl: 'https://res.cloudinary.com/test/private.pdf',
      publicId: 'resumes/private_test',
      fileType: 'pdf',
      parsedData: {
        skills: [uniqueSkill, 'Node.js'],
        personalInfo: { location: 'New York, NY' },
        rawText: `Experienced hidden developer with ${uniqueSkill}`,
      },
    });
    cleanupIds.resumes.push(privateResume._id);

    const searchResult = await searchService.searchResumes({
      skills: uniqueSkill,
      mode: 'keyword',
    });

    console.log(`Search for skill "${uniqueSkill}" returned ${searchResult.docs.length} resume(s).`);
    const returnedResumeIds = searchResult.docs.map((d) => d._id.toString());

    if (returnedResumeIds.includes(publicResume._id.toString())) {
      console.log('✔ Public resume correctly found in resume search.');
    } else {
      throw new Error('Public resume was NOT returned in search!');
    }

    if (!returnedResumeIds.includes(privateResume._id.toString())) {
      console.log('✔ Private candidate resume was BLOCKED from resume search.');
    } else {
      throw new Error('SECURITY LEAK: Private candidate resume was returned in recruiter search!');
    }

    // =========================================================================
    // TEST 2: Sanitize job.screeningQuestions
    // =========================================================================
    console.log('\n====================================================');
    console.log('TEST 2: Sanitize job.screeningQuestions');
    console.log('====================================================');

    const employerUser = await User.create({
      firstName: 'Employer',
      lastName: 'Owner',
      email: `employer_${Date.now()}@test.com`,
      passwordHash: 'Password123!',
      role: 'employer',
      status: 'active',
    });
    cleanupIds.users.push(employerUser._id);

    const company = await Company.create({
      name: `Test Tech Company ${Date.now()}`,
      owner: employerUser._id,
      industry: 'Technology',
      countryCode: 'US',
      verificationStatus: 'approved',
      teamMembers: [{ user: employerUser._id, role: 'owner' }],
    });
    cleanupIds.companies.push(company._id);

    const job = await Job.create({
      company: company._id,
      postedBy: employerUser._id,
      title: `Senior Backend Engineer ${Date.now()}`,
      description: 'Exciting backend opportunity',
      employmentType: 'full-time',
      workplaceType: 'remote',
      status: 'active',
      screeningQuestions: [
        {
          question: 'Do you have 5+ years of Node.js?',
          type: 'yes_no',
          required: true,
          idealAnswer: 'Yes',
        },
        {
          question: 'What is the event loop?',
          type: 'text',
          required: false,
          idealAnswer: 'Single threaded async event queue',
        },
      ],
    });
    cleanupIds.jobs.push(job._id);

    // Fetch as anonymous
    const anonJob = await jobService.getJobById(job._id, false, null);
    if (anonJob.screeningQuestions[0].idealAnswer === undefined) {
      console.log('✔ Anonymous visitor: idealAnswer is sanitized.');
    } else {
      throw new Error(`SECURITY LEAK: idealAnswer leaked to anonymous user: ${anonJob.screeningQuestions[0].idealAnswer}`);
    }

    // Fetch as jobseeker
    const seekerJob = await jobService.getJobById(job._id, false, publicCandidate);
    if (seekerJob.screeningQuestions[0].idealAnswer === undefined) {
      console.log('✔ Job seeker: idealAnswer is sanitized.');
    } else {
      throw new Error(`SECURITY LEAK: idealAnswer leaked to jobseeker: ${seekerJob.screeningQuestions[0].idealAnswer}`);
    }

    // Fetch as employer owner
    const ownerJob = await jobService.getJobById(job._id, false, employerUser);
    if (ownerJob.screeningQuestions[0].idealAnswer === 'Yes') {
      console.log('✔ Company owner: idealAnswer is preserved for hiring team.');
    } else {
      throw new Error('Company owner was incorrectly stripped of idealAnswer!');
    }

    // =========================================================================
    // TEST 3: Application Withdrawal & Seeker Detail
    // =========================================================================
    console.log('\n====================================================');
    console.log('TEST 3: Application Withdrawal & Seeker Detail');
    console.log('====================================================');

    const app = await Application.create({
      job: job._id,
      applicant: publicCandidate._id,
      resume: publicResume._id,
      coverLetter: 'I am excited to apply.',
      status: 'submitted',
      pipelineStage: 'New',
      rating: 4,
      statusHistory: [
        {
          status: 'submitted',
          changedBy: publicCandidate._id,
          note: 'Submitted by applicant',
        },
      ],
    });
    cleanupIds.applications.push(app._id);
    await Job.findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } });

    // 3.1 Seeker Detail
    const seekerApp = await applicationService.getApplicationById(app._id, publicCandidate);
    if (seekerApp.rating === undefined) {
      console.log('✔ Seeker application detail: internal rating is redacted.');
    } else {
      throw new Error('Internal employer rating leaked to seeker!');
    }

    if (seekerApp.statusHistory[0].changedBy === undefined) {
      console.log('✔ Seeker application detail: statusHistory internal changedBy/notes sanitized.');
    } else {
      throw new Error('Internal changedBy leaked in statusHistory!');
    }

    // 3.2 Withdraw Application
    const withdrawnApp = await applicationService.withdrawApplication(app._id, publicCandidate._id, {
      reason: 'Accepted an offer elsewhere',
    });

    if (withdrawnApp.status === 'withdrawn') {
      console.log('✔ Application status changed to "withdrawn".');
    } else {
      throw new Error(`Expected status 'withdrawn' but got ${withdrawnApp.status}`);
    }

    const updatedJob = await Job.findById(job._id);
    console.log(`Job applicationCount updated to: ${updatedJob.applicationCount}`);

    const employerNotification = await Notification.findOne({
      user: employerUser._id,
      relatedId: app._id,
      type: 'application_status_update',
    });
    if (employerNotification) {
      console.log('✔ Employer received notification for application withdrawal.');
      cleanupIds.notifications.push(employerNotification._id);
    } else {
      throw new Error('Employer did not receive withdrawal notification!');
    }

    // Try to withdraw again - should throw
    try {
      await applicationService.withdrawApplication(app._id, publicCandidate._id);
      throw new Error('Second withdrawal should have failed!');
    } catch (err) {
      if (err.statusCode === 400) {
        console.log('✔ Duplicate withdrawal correctly rejected with 400 Bad Request.');
      } else {
        throw err;
      }
    }

    // =========================================================================
    // TEST 4: Change Password Endpoint
    // =========================================================================
    console.log('\n====================================================');
    console.log('TEST 4: Change Password Endpoint');
    console.log('====================================================');

    const pwUser = await User.create({
      firstName: 'Password',
      lastName: 'Tester',
      email: `pw_test_${Date.now()}@test.com`,
      passwordHash: 'OldPassword123!',
      role: 'jobseeker',
      status: 'active',
      authProvider: 'local',
    });
    cleanupIds.users.push(pwUser._id);

    // 4.1 Test wrong current password
    try {
      await authService.changePassword(pwUser._id, 'WrongOldPassword!', 'BrandNewPassword123!');
      throw new Error('Invalid current password was accepted!');
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('Current password is incorrect')) {
        console.log('✔ Invalid current password correctly rejected.');
      } else {
        throw err;
      }
    }

    // 4.2 Test correct change password
    await authService.changePassword(pwUser._id, 'OldPassword123!', 'BrandNewPassword123!');
    console.log('✔ Password changed successfully.');

    // 4.3 Verify login with new password
    const reloadedUser = await User.findById(pwUser._id).select('+passwordHash');
    const isNewValid = await reloadedUser.comparePassword('BrandNewPassword123!');
    const isOldValid = await reloadedUser.comparePassword('OldPassword123!');

    if (isNewValid && !isOldValid) {
      console.log('✔ New password verified; old password no longer works.');
    } else {
      throw new Error('Password hash comparison failed after change!');
    }

    console.log('\n====================================================');
    console.log('ALL 4 HIGH-PRIORITY SECURITY & COMPLIANCE TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    console.log('--- Cleaning up test artifacts from database ---');
    await Promise.all([
      User.deleteMany({ _id: { $in: cleanupIds.users } }),
      Company.deleteMany({ _id: { $in: cleanupIds.companies } }),
      Job.deleteMany({ _id: { $in: cleanupIds.jobs } }),
      Resume.deleteMany({ _id: { $in: cleanupIds.resumes } }),
      Application.deleteMany({ _id: { $in: cleanupIds.applications } }),
      Notification.deleteMany({ _id: { $in: cleanupIds.notifications } }),
    ]);
    console.log('Clean up completed.');
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
