const mongoose = require('mongoose');
const User = require('../src/models/User');
const Company = require('../src/models/Company');
const Job = require('../src/models/Job');
const Pipeline = require('../src/models/Pipeline');
const Taxonomy = require('../src/models/Taxonomy');
const SystemConfig = require('../src/models/SystemConfig');
const config = require('../src/config');
const logger = require('../src/config/logger');

async function seedDatabase() {
  try {
    logger.info('Connecting to MongoDB for database seeding...');
    await mongoose.connect(config.mongodb.uri);

    logger.info('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Job.deleteMany({}),
      Pipeline.deleteMany({}),
      Taxonomy.deleteMany({}),
      SystemConfig.deleteMany({}),
    ]);

    logger.info('Seeding admin user...');
    const admin = await User.create({
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@hireengine.internal',
      passwordHash: 'AdminPass123!',
      role: 'admin',
      isEmailVerified: true,
      countryCode: 'US',
    });

    logger.info('Seeding Indian employer and company...');
    const employerIN = await User.create({
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'recruiter.in@techcorp.in',
      passwordHash: 'Employer123!',
      role: 'employer',
      isEmailVerified: true,
      countryCode: 'IN',
    });

    const companyIN = await Company.create({
      owner: employerIN._id,
      name: 'TechCorp India Pvt Ltd',
      countryCode: 'IN',
      verificationStatus: 'approved',
      registrationDetails: {
        gstNumber: '22AAAAA0000A1Z5',
        panNumber: 'ABCDE1234F',
        registeredAddress: {
          street: '123 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
        },
      },
    });

    employerIN.company = companyIN._id;
    await employerIN.save();
    await Pipeline.createDefaultPipeline(companyIN._id);

    logger.info('Seeding US employer and company...');
    const employerUS = await User.create({
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'recruiter.us@cyberdyne.com',
      passwordHash: 'Employer123!',
      role: 'employer',
      isEmailVerified: true,
      countryCode: 'US',
    });

    const companyUS = await Company.create({
      owner: employerUS._id,
      name: 'Cyberdyne Systems Inc',
      countryCode: 'US',
      verificationStatus: 'approved',
      registrationDetails: {
        einNumber: '12-3456789',
        stateOfIncorporation: 'CA',
        businessType: 'corporation',
        registeredAddress: {
          street: '100 Silicon Way',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
        },
      },
    });

    employerUS.company = companyUS._id;
    await employerUS.save();
    await Pipeline.createDefaultPipeline(companyUS._id);

    logger.info('Seeding job seeker...');
    const seeker = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      passwordHash: 'Candidate123!',
      role: 'jobseeker',
      isEmailVerified: true,
      countryCode: 'US',
      skills: ['Node.js', 'Express.js', 'MongoDB', 'Python'],
    });

    logger.info('Seeding jobs...');
    await Job.create([
      {
        company: companyIN._id,
        postedBy: employerIN._id,
        title: 'Senior Backend Developer (Node.js)',
        description: 'We are looking for an experienced Node.js developer to scale our microservices backend platform.',
        skills: ['Node.js', 'Express.js', 'MongoDB', 'Redis'],
        employmentType: 'full-time',
        workplaceType: 'remote',
        status: 'active',
        salaryRange: { min: 1800000, max: 2800000, currency: 'INR', period: 'annually' },
        location: { city: 'Bengaluru', country: 'India', coordinates: { type: 'Point', coordinates: [77.5946, 12.9716] } },
      },
      {
        company: companyUS._id,
        postedBy: employerUS._id,
        title: 'Full Stack AI Software Engineer',
        description: 'Join Cyberdyne Systems to build high performance AI matching models and scalable backend microservices.',
        skills: ['Python', 'Node.js', 'MongoDB', 'AWS', 'TensorFlow'],
        employmentType: 'full-time',
        workplaceType: 'hybrid',
        status: 'active',
        isSponsored: true,
        salaryRange: { min: 140000, max: 190000, currency: 'USD', period: 'annually' },
        location: { city: 'San Francisco', state: 'CA', country: 'United States', coordinates: { type: 'Point', coordinates: [-122.4194, 37.7749] } },
      },
    ]);

    logger.info('Seeding taxonomy...');
    await Taxonomy.insertMany([
      { type: 'skill', name: 'Node.js', aliases: ['Node', 'NodeJS'] },
      { type: 'skill', name: 'MongoDB', aliases: ['Mongo', 'NoSQL'] },
      { type: 'skill', name: 'Express.js', aliases: ['Express'] },
      { type: 'category', name: 'Software Development' },
      { type: 'category', name: 'Data Science & AI' },
    ]);

    logger.info('Database seeding completed successfully!');
    logger.info('Demo credentials:');
    logger.info('  Admin   : admin@monsterjobs.internal / AdminPass123!');
    logger.info('  Employer: recruiter.in@techcorp.in / Employer123!');
    logger.info('  Candidate: john.doe@example.com / Candidate123!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

seedDatabase();
