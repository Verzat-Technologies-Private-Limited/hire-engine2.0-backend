/**
 * Seed 5 jobs with valid coordinates for verzat@gmail.com
 *
 * Coordinates: Pune Tech Hubs (GeoJSON format: [longitude, latitude])
 * - Hinjewadi Phase 1 (Rajiv Gandhi Infotech Park): [73.7280, 18.5913]
 * - Baner Tech Corridor: [73.7806, 18.5590]
 * - Kharadi IT Park (EON Free Zone): [73.9474, 18.5529]
 * - Magarpatta Cybercity: [73.9298, 18.5158]
 * - Shivajinagar Central Business Hub: [73.8567, 18.5204]
 *
 * Usage:
 *   node scripts/seed-verzat-jobs.js
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = require('../src/config');
const logger = require('../src/config/logger');
const User = require('../src/models/User');
const Company = require('../src/models/Company');
const Job = require('../src/models/Job');
const Pipeline = require('../src/models/Pipeline');
const { generateJobEmbedding } = require('../src/services/embedding.service');

const TARGET_EMAIL = 'verzat@gmail.com';

const PUNE_JOBS = [
  {
    title: 'Senior Full Stack Developer (Node.js & React)',
    description:
      'We are looking for a Senior Full Stack Developer to build high-performance microservices and intuitive web interfaces at Verzat Technologies. You will collaborate with product designers, architect scalable REST/GraphQL APIs, and optimize MongoDB pipelines.',
    responsibilities:
      '- Architect and scale backend microservices in Node.js and TypeScript.\n- Build responsive, modern user interfaces using React, Next.js, and TailwindCSS.\n- Design and optimize MongoDB schemas and aggregation pipelines.\n- Lead code reviews, automated unit testing, and CI/CD deployment pipelines.',
    qualifications:
      '- 4+ years of professional full-stack development experience.\n- Strong proficiency in Node.js, Express, React, TypeScript, and MongoDB.\n- Experience with Redis caching, Docker containerization, and AWS services (S3, EC2).\n- Excellent problem-solving and architectural design capabilities.',
    skills: ['Node.js', 'React.js', 'TypeScript', 'MongoDB', 'Redis', 'Docker', 'AWS', 'REST API'],
    category: 'Software Development',
    experienceLevel: 'senior',
    experienceYears: { min: 4, max: 8 },
    education: 'bachelor',
    employmentType: 'full-time',
    workplaceType: 'hybrid',
    status: 'active',
    isSponsored: true,
    sponsorBudget: {
      dailyBudget: 100,
      totalBudget: 1000,
      spent: 0,
      currency: 'INR',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    salaryRange: {
      min: 1800000,
      max: 2800000,
      currency: 'INR',
      period: 'annually',
      isVisible: true,
    },
    location: {
      address: 'Phase 1, Rajiv Gandhi Infotech Park, Hinjewadi',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411057',
      coordinates: {
        type: 'Point',
        coordinates: [73.7280, 18.5913], // [lng, lat]
      },
    },
    benefits: ['Comprehensive Health Insurance', 'Flexible Hybrid Work', 'Performance Bonus', 'Learning & Certification Budget'],
    screeningQuestions: [
      {
        question: 'Do you have at least 4 years of experience with Node.js and React?',
        type: 'yes_no',
        required: true,
        idealAnswer: 'yes',
      },
      {
        question: 'What is your current notice period?',
        type: 'multiple_choice',
        options: ['Immediate', '15 Days', '30 Days', '60+ Days'],
        required: true,
      },
    ],
  },
  {
    title: 'Lead DevOps & Cloud Platform Engineer',
    description:
      'Join Verzat Technologies as a Lead DevOps Engineer to oversee our cloud infrastructure, automated Kubernetes deployments, and zero-downtime release pipelines.',
    responsibilities:
      '- Manage production Kubernetes clusters (EKS/GKE) and cloud networking infrastructure.\n- Implement Infrastructure as Code (IaC) using Terraform and Ansible.\n- Maintain end-to-end CI/CD pipelines with GitHub Actions and ArgoCD.\n- Implement system observability with Prometheus, Grafana, and ELK stack.',
    qualifications:
      '- 5+ years of DevOps / Cloud Infrastructure experience.\n- Deep mastery of Kubernetes, Docker, Terraform, and AWS/GCP.\n- Strong scripting skills in Python, Bash, or Go.\n- Experience with SOC2 compliance and zero-trust security postures.',
    skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD', 'GitHub Actions', 'Prometheus', 'Linux'],
    category: 'DevOps & Cloud Infrastructure',
    experienceLevel: 'lead',
    experienceYears: { min: 5, max: 9 },
    education: 'bachelor',
    employmentType: 'full-time',
    workplaceType: 'hybrid',
    status: 'active',
    isSponsored: false,
    salaryRange: {
      min: 2400000,
      max: 3500000,
      currency: 'INR',
      period: 'annually',
      isVisible: true,
    },
    location: {
      address: 'Balewadi High Street, Baner',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411045',
      coordinates: {
        type: 'Point',
        coordinates: [73.7806, 18.5590], // [lng, lat]
      },
    },
    benefits: ['Annual Wellness Stipend', 'Health Insurance for Family', 'Stock Options / ESOPs', 'WFH Setup Allowance'],
    screeningQuestions: [
      {
        question: 'Have you managed multi-region Kubernetes clusters in production?',
        type: 'yes_no',
        required: true,
        idealAnswer: 'yes',
      },
    ],
  },
  {
    title: 'AI / Machine Learning Engineer (NLP & LLMs)',
    description:
      'We are expanding our AI engineering squad at Verzat Technologies. You will build, fine-tune, and deploy state-of-the-art Large Language Models (LLMs), semantic vector search, and agentic workflows.',
    responsibilities:
      '- Build RAG (Retrieval-Augmented Generation) pipelines and embeddings search services.\n- Fine-tune open-source models (Llama, Mistral) and integrate Gemini/OpenAI APIs.\n- Optimize inference latencies and vector database storage (Pinecone / MongoDB Atlas Vector Search).\n- Collaborate with backend engineers to integrate intelligent agent capabilities.',
    qualifications:
      '- 3+ years of experience in Machine Learning and Python ecosystem (PyTorch, Hugging Face, LangChain).\n- Hands-on experience with Vector Databases, Embeddings, and Prompt Engineering.\n- Solid background in linear algebra, probability, and transformer architectures.\n- Experience deploying ML models via FastAPI and Docker.',
    skills: ['Python', 'PyTorch', 'LangChain', 'FastAPI', 'Vector Search', 'NLP', 'OpenAI', 'Gemini API'],
    category: 'AI & Data Science',
    experienceLevel: 'mid',
    experienceYears: { min: 3, max: 6 },
    education: 'bachelor',
    employmentType: 'full-time',
    workplaceType: 'onsite',
    status: 'active',
    isSponsored: true,
    sponsorBudget: {
      dailyBudget: 80,
      totalBudget: 800,
      spent: 0,
      currency: 'INR',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    salaryRange: {
      min: 1600000,
      max: 2600000,
      currency: 'INR',
      period: 'annually',
      isVisible: true,
    },
    location: {
      address: 'EON Free Zone, Kharadi',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411014',
      coordinates: {
        type: 'Point',
        coordinates: [73.9474, 18.5529], // [lng, lat]
      },
    },
    benefits: ['Cutting-edge GPU compute access', 'Flexible Hours', 'Health Insurance', 'Gym Membership'],
    screeningQuestions: [
      {
        question: 'Do you have production experience building RAG systems or fine-tuning LLMs?',
        type: 'yes_no',
        required: true,
        idealAnswer: 'yes',
      },
    ],
  },
  {
    title: 'Senior React Native Mobile Engineer',
    description:
      'Verzat Technologies is seeking a Senior React Native Developer to spearhead our cross-platform iOS and Android mobile apps. You will build smooth, native-feeling mobile user experiences with offline sync capabilities.',
    responsibilities:
      '- Develop fluid cross-platform mobile apps in React Native and TypeScript.\n- Implement state management using Redux Toolkit / Zustand and offline cache mechanisms.\n- Integrate native modules, push notifications (FCM), and biometric authentication.\n- Publish and manage app releases on Google Play Store and Apple App Store.',
    qualifications:
      '- 4+ years of React Native and mobile application development experience.\n- Deep understanding of React component lifecycles, hooks, and native bridges.\n- Experience with mobile performance optimization and debugging tools.\n- Familiarity with CI/CD for mobile apps (Fastlane, Expo Application Services).',
    skills: ['React Native', 'TypeScript', 'Redux', 'iOS', 'Android', 'REST API', 'Jest'],
    category: 'Mobile Development',
    experienceLevel: 'senior',
    experienceYears: { min: 4, max: 7 },
    education: 'bachelor',
    employmentType: 'full-time',
    workplaceType: 'hybrid',
    status: 'active',
    isSponsored: false,
    salaryRange: {
      min: 1700000,
      max: 2500000,
      currency: 'INR',
      period: 'annually',
      isVisible: true,
    },
    location: {
      address: 'Cybercity, Magarpatta City, Hadapsar',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411028',
      coordinates: {
        type: 'Point',
        coordinates: [73.9298, 18.5158], // [lng, lat]
      },
    },
    benefits: ['Hybrid Work Model', 'Annual Technology Allowance', 'Medical Insurance', 'Paid Parental Leave'],
    screeningQuestions: [
      {
        question: 'Have you published apps on both Google Play Store and Apple App Store?',
        type: 'yes_no',
        required: true,
        idealAnswer: 'yes',
      },
    ],
  },
  {
    title: 'Product Designer (UI / UX & Design Systems)',
    description:
      'We are looking for a talented Product Designer to lead user experience design and UI systems for our enterprise recruitment platform. You will craft user journeys, interactive Figma prototypes, and design systems.',
    responsibilities:
      '- Create user personas, user journey maps, wireframes, and interactive Figma prototypes.\n- Maintain and evolve our multi-brand design system with reusable component libraries.\n- Conduct qualitative and quantitative user research and usability testing sessions.\n- Work closely with frontend engineers to ensure pixel-perfect design implementation.',
    qualifications:
      '- 3+ years of experience designing complex web and mobile SaaS products.\n- Mastery of Figma, Auto-layout, Variables, and prototyping tools.\n- Strong portfolio demonstrating problem-solving, micro-interactions, and visual hierarchy.\n- Excellent communication skills to articulate design decisions.',
    skills: ['Figma', 'UI/UX Design', 'Design Systems', 'Prototyping', 'User Research', 'Wireframing'],
    category: 'Design & Creative',
    experienceLevel: 'mid',
    experienceYears: { min: 3, max: 6 },
    education: 'bachelor',
    employmentType: 'full-time',
    workplaceType: 'hybrid',
    status: 'active',
    isSponsored: false,
    salaryRange: {
      min: 1200000,
      max: 2000000,
      currency: 'INR',
      period: 'annually',
      isVisible: true,
    },
    location: {
      address: 'FC Road, Shivajinagar',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411005',
      coordinates: {
        type: 'Point',
        coordinates: [73.8567, 18.5204], // [lng, lat]
      },
    },
    benefits: ['MacBook Pro & 4K Monitor Provided', 'Flexible Hours', 'Health Insurance', 'Conference / Workshop Sponsorship'],
    screeningQuestions: [
      {
        question: 'Do you have an online portfolio showcasing SaaS product designs?',
        type: 'yes_no',
        required: true,
        idealAnswer: 'yes',
      },
    ],
  },
];

async function seedVerzatJobs() {
  try {
    logger.info('🔗 Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);

    // 1. Find the target user
    const user = await User.findOne({ email: TARGET_EMAIL.toLowerCase() });
    if (!user) {
      throw new Error(`User with email "${TARGET_EMAIL}" not found in database.`);
    }

    logger.info(`👤 Found user: ${user.email} (ID: ${user._id})`);

    // 2. Ensure company exists or link
    let company;
    if (user.company) {
      company = await Company.findById(user.company);
    }

    if (!company) {
      logger.info('🏢 Finding company owned by user or creating default...');
      company = await Company.findOne({ owner: user._id });
    }

    if (!company) {
      company = await Company.create({
        owner: user._id,
        name: 'Verzat Technologies Pvt Ltd',
        countryCode: 'IN',
        verificationStatus: 'approved',
        address: {
          street: 'Phase 1, Rajiv Gandhi Infotech Park, Hinjewadi',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411057',
          country: 'India',
          coordinates: {
            type: 'Point',
            coordinates: [73.7280, 18.5913],
          },
        },
      });
      user.company = company._id;
      await user.save();
    } else {
      // Update company coordinates if null or [0,0]
      if (
        !company.address?.coordinates?.coordinates ||
        (company.address.coordinates.coordinates[0] === 0 && company.address.coordinates.coordinates[1] === 0)
      ) {
        await Company.updateOne(
          { _id: company._id },
          {
            $set: {
              'address.city': 'Pune',
              'address.state': 'Maharashtra',
              'address.country': 'India',
              'address.coordinates': {
                type: 'Point',
                coordinates: [73.7280, 18.5913],
              },
            },
          }
        );
        logger.info('📍 Updated company address coordinates to Pune [73.7280, 18.5913]');
      }
    }

    // Ensure default pipeline exists
    const existingPipeline = await Pipeline.findOne({ company: company._id });
    if (!existingPipeline) {
      await Pipeline.createDefaultPipeline(company._id);
      logger.info('📋 Created default candidate pipeline for company');
    }

    logger.info(`🏢 Company: "${company.name}" (ID: ${company._id})\n`);

    // 3. Clear any prior seeded jobs for this user
    const deletedCount = await Job.deleteMany({ postedBy: user._id });
    if (deletedCount.deletedCount > 0) {
      logger.info(`🧹 Cleaned up ${deletedCount.deletedCount} existing jobs for ${user.email}`);
    }

    // 4. Create 5 jobs
    const createdJobs = [];
    for (const jobData of PUNE_JOBS) {
      const fullJobData = {
        ...jobData,
        company: company._id,
        postedBy: user._id,
      };

      const job = await Job.create(fullJobData);
      createdJobs.push(job);
      logger.info(`✅ Created Job: "${job.title}"`);
      logger.info(`   - Location: ${job.location.address}, ${job.location.city}`);
      logger.info(`   - Coordinates: [${job.location.coordinates.coordinates.join(', ')}] (lng, lat)`);
      logger.info(`   - ID: ${job._id} | Slug: ${job.slug}\n`);

      // Generate embedding if Gemini API key available
      if (config.gemini?.apiKey) {
        try {
          await generateJobEmbedding(job._id);
          logger.info(`   ✨ Vector embedding generated for "${job.title}"`);
        } catch (embedErr) {
          logger.warn(`   ⚠️ Vector embedding skipped: ${embedErr.message}`);
        }
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 Successfully seeded ${createdJobs.length} jobs for ${TARGET_EMAIL}!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    createdJobs.forEach((j, idx) => {
      console.log(`\n${idx + 1}. [${j._id}] ${j.title}`);
      console.log(`   📍 Area: ${j.location.address}`);
      console.log(`   🧭 GeoJSON: [${j.location.coordinates.coordinates.join(', ')}]`);
      console.log(`   💰 Salary: ₹${j.salaryRange.min.toLocaleString('en-IN')} - ₹${j.salaryRange.max.toLocaleString('en-IN')} / ${j.salaryRange.period}`);
      console.log(`   💼 Workplace: ${j.workplaceType} | Employment: ${j.employmentType}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    logger.info('🔌 Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to seed jobs:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

seedVerzatJobs();
