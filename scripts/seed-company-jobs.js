const mongoose = require('mongoose');
const Company = require('../src/models/Company');
const Job = require('../src/models/Job');
const User = require('../src/models/User');
const config = require('../src/config');
const logger = require('../src/config/logger');
const { generateJobEmbedding } = require('../src/services/embedding.service');

async function seedCompanyJobs(targetCompanyId) {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);

    const companyId = targetCompanyId || process.argv[2] || '6a86cf587786bcfe2cd3f23c';
    logger.info(`Looking up company: ${companyId}`);

    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error(`Company with ID "${companyId}" not found in database.`);
    }

    const owner = await User.findById(company.owner);
    if (!owner) {
      throw new Error(`Owner user (${company.owner}) not found for company "${company.name}".`);
    }

    logger.info(`Found company "${company.name}" (Country: ${company.countryCode}, Owner: ${owner.email})`);

    const sampleJobs = [
      {
        company: company._id,
        postedBy: owner._id,
        title: 'Senior Full Stack Engineer (Node.js & React)',
        description:
          'We are looking for an experienced Senior Full Stack Engineer to lead the development of high-performance web applications and backend microservices at Verzat Technology. You will architect scalable solutions, lead technical discussions, and mentor junior engineers.',
        responsibilities:
          '- Architect, build, and maintain efficient, reusable, and reliable Node.js microservices.\n- Develop responsive front-end interfaces using React.js, TypeScript, and modern CSS systems.\n- Optimize database queries and schema designs across MongoDB and Redis.\n- Collaborate with product managers, designers, and cross-functional teams to deliver end-to-end features.',
        qualifications:
          "- 4+ years of hands-on experience with Node.js, Express, and React.js ecosystem.\n- Strong proficiency in JavaScript/TypeScript, async programming, and REST/GraphQL APIs.\n- Solid understanding of MongoDB, Mongoose, indexing, and aggregation pipelines.\n- Experience with Docker, CI/CD pipelines, and cloud platforms (AWS/GCP).",
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
          dailyBudget: 50,
          totalBudget: 500,
          spent: 0,
          currency: company.countryCode === 'IN' ? 'INR' : 'USD',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        salaryRange: {
          min: company.countryCode === 'IN' ? 1800000 : 120000,
          max: company.countryCode === 'IN' ? 2800000 : 160000,
          currency: company.countryCode === 'IN' ? 'INR' : 'USD',
          period: 'annually',
          isVisible: true,
        },
        location: {
          address: company.address?.street || 'MG Road Business District',
          city: company.address?.city || 'Bengaluru',
          state: company.address?.state || 'Karnataka',
          country: company.address?.country || 'India',
          postalCode: company.address?.postalCode || '560001',
          coordinates: {
            type: 'Point',
            coordinates: [77.5946, 12.9716],
          },
        },
        benefits: ['Health Insurance', 'Performance Bonus', 'Flexible Working Hours', 'Learning Stipend'],
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
        company: company._id,
        postedBy: owner._id,
        title: 'DevOps & Cloud Infrastructure Engineer',
        description:
          'Join Verzat Technology as a Cloud DevOps Engineer to scale our automated CI/CD infrastructure, Kubernetes clusters, and monitoring stacks. You will automate cloud provisioning and maintain 99.99% system uptime.',
        responsibilities:
          '- Design and deploy scalable Kubernetes clusters and containerized applications on AWS.\n- Build and maintain automated CI/CD pipelines using GitHub Actions and ArgoCD.\n- Implement infrastructure as code (IaC) using Terraform and Ansible.\n- Set up comprehensive monitoring, logging, and alerting systems with Prometheus, Grafana, and ELK.',
        qualifications:
          '- 3+ years of professional DevOps/SRE experience in production environments.\n- Proficiency with AWS core services (EKS, EC2, S3, RDS, CloudFront, IAM).\n- Strong scripting skills in Bash, Python, or Go.\n- Deep understanding of containerization (Docker) and orchestration (Kubernetes).',
        skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD', 'GitHub Actions', 'Prometheus', 'Linux'],
        category: 'DevOps & Cloud Infrastructure',
        experienceLevel: 'mid',
        experienceYears: { min: 3, max: 6 },
        education: 'bachelor',
        employmentType: 'full-time',
        workplaceType: 'remote',
        status: 'active',
        isSponsored: false,
        salaryRange: {
          min: company.countryCode === 'IN' ? 1500000 : 100000,
          max: company.countryCode === 'IN' ? 2400000 : 140000,
          currency: company.countryCode === 'IN' ? 'INR' : 'USD',
          period: 'annually',
          isVisible: true,
        },
        location: {
          address: 'Remote',
          city: company.address?.city || 'Bengaluru',
          state: company.address?.state || 'Karnataka',
          country: company.address?.country || 'India',
          postalCode: company.address?.postalCode || '560001',
          coordinates: {
            type: 'Point',
            coordinates: [77.5946, 12.9716],
          },
        },
        benefits: ['Remote Work Allowance', 'Health Insurance', 'Annual Tech Budget', 'Paid Time Off'],
        screeningQuestions: [
          {
            question: 'Have you managed production Kubernetes clusters on AWS/GCP?',
            type: 'yes_no',
            required: true,
            idealAnswer: 'yes',
          },
        ],
      },
      {
        company: company._id,
        postedBy: owner._id,
        title: 'AI / Machine Learning Engineer',
        description:
          'Verzat Technology is expanding our AI capabilities! We are seeking an AI/ML Engineer to build LLM workflows, intelligent agent pipelines, vector search integrations, and custom NLP models.',
        responsibilities:
          '- Develop and optimize LLM-powered applications using Gemini API, OpenAI, and LangChain.\n- Build embedding generation, retrieval-augmented generation (RAG), and vector similarity search pipelines.\n- Fine-tune custom NLP/ML models and deploy low-latency inference APIs with FastAPI.\n- Evaluate model accuracy, latency, and token efficiency for enterprise workflows.',
        qualifications:
          '- 2+ years of experience developing machine learning and generative AI solutions.\n- Strong proficiency with Python, PyTorch/TensorFlow, and FastAPI.\n- Experience working with vector databases (Pinecone, Qdrant, Milvus, or MongoDB Atlas Vector Search).\n- Solid background in NLP, prompt engineering, embeddings, and RAG architectures.',
        skills: ['Python', 'FastAPI', 'PyTorch', 'LangChain', 'Gemini API', 'Vector Search', 'NLP', 'RAG'],
        category: 'Data Science & AI',
        experienceLevel: 'mid',
        experienceYears: { min: 2, max: 5 },
        education: 'bachelor',
        employmentType: 'full-time',
        workplaceType: 'hybrid',
        status: 'active',
        isSponsored: true,
        salaryRange: {
          min: company.countryCode === 'IN' ? 1600000 : 110000,
          max: company.countryCode === 'IN' ? 2600000 : 155000,
          currency: company.countryCode === 'IN' ? 'INR' : 'USD',
          period: 'annually',
          isVisible: true,
        },
        location: {
          address: company.address?.street || 'Tech Park Outer Ring Road',
          city: company.address?.city || 'Bengaluru',
          state: company.address?.state || 'Karnataka',
          country: company.address?.country || 'India',
          postalCode: company.address?.postalCode || '560001',
          coordinates: {
            type: 'Point',
            coordinates: [77.5946, 12.9716],
          },
        },
        benefits: ['Health Insurance', 'Gym Membership', 'AI Conference Sponsorship', 'Stock Options'],
        screeningQuestions: [
          {
            question: 'Do you have hands-on experience building RAG or LLM agent pipelines?',
            type: 'yes_no',
            required: true,
            idealAnswer: 'yes',
          },
        ],
      },
      {
        company: company._id,
        postedBy: owner._id,
        title: 'Lead Frontend Architect (React & Next.js)',
        description:
          'We are seeking a Lead Frontend Architect to spearhead the frontend architecture across our web applications. You will set engineering standards, mentor teams, and build pixel-perfect UI experiences with high performance.',
        responsibilities:
          '- Architect high-scale, accessible, and fast web applications using Next.js and React.\n- Create and maintain modern component libraries, design systems, and state management strategies.\n- Drive Core Web Vitals optimization, bundle size reductions, and SEO best practices.\n- Lead architectural reviews, code reviews, and tech roadmap planning.',
        qualifications:
          '- 6+ years of specialized frontend development experience with modern JavaScript frameworks.\n- Mastery of React, Next.js (App Router / SSR / ISR), TypeScript, and CSS/Tailwind.\n- Deep understanding of web performance, browser rendering pipeline, and security (XSS, CSRF, CSP).\n- Proven experience leading and mentoring engineering teams.',
        skills: ['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux Toolkit', 'Performance Optimization', 'Web Architecture'],
        category: 'Software Development',
        experienceLevel: 'lead',
        experienceYears: { min: 6, max: 10 },
        education: 'bachelor',
        employmentType: 'full-time',
        workplaceType: 'remote',
        status: 'active',
        isSponsored: false,
        salaryRange: {
          min: company.countryCode === 'IN' ? 2500000 : 150000,
          max: company.countryCode === 'IN' ? 3800000 : 200000,
          currency: company.countryCode === 'IN' ? 'INR' : 'USD',
          period: 'annually',
          isVisible: true,
        },
        location: {
          address: 'Remote',
          city: company.address?.city || 'Bengaluru',
          state: company.address?.state || 'Karnataka',
          country: company.address?.country || 'India',
          postalCode: company.address?.postalCode || '560001',
          coordinates: {
            type: 'Point',
            coordinates: [77.5946, 12.9716],
          },
        },
        benefits: ['Remote Work Stipend', 'Health Insurance for Family', 'ESOP / Equity Options', 'Unlimited PTO'],
        screeningQuestions: [
          {
            question: 'Have you led a frontend team and architected enterprise-scale Next.js apps?',
            type: 'yes_no',
            required: true,
            idealAnswer: 'yes',
          },
        ],
      },
      {
        company: company._id,
        postedBy: owner._id,
        title: 'QA Automation Engineer (Playwright & API Testing)',
        description:
          'Verzat Technology is hiring a QA Automation Engineer to build automated test suites for our web platforms, APIs, and microservices. You will ensure exceptional product quality across all release cycles.',
        responsibilities:
          '- Design, develop, and execute automated end-to-end and integration tests using Playwright / Cypress.\n- Create automated API test suites using Postman, Supertest, and Jest.\n- Integrate test suites into GitHub Actions CI/CD pipelines to prevent regressions.\n- Collaborate with developers to reproduce bugs, analyze test coverage, and improve system reliability.',
        qualifications:
          '- 2+ years of experience in test automation for web applications and REST APIs.\n- Strong coding skills in JavaScript/TypeScript or Python.\n- Experience with test runners (Jest, Mocha) and test automation tools (Playwright, Cypress, Selenium).\n- Knowledge of CI/CD integration and test reporting tools.',
        skills: ['Playwright', 'Cypress', 'JavaScript', 'Jest', 'Postman', 'API Testing', 'CI/CD', 'Selenium'],
        category: 'Quality Assurance',
        experienceLevel: 'mid',
        experienceYears: { min: 2, max: 5 },
        education: 'bachelor',
        employmentType: 'full-time',
        workplaceType: 'hybrid',
        status: 'active',
        isSponsored: false,
        salaryRange: {
          min: company.countryCode === 'IN' ? 900000 : 70000,
          max: company.countryCode === 'IN' ? 1500000 : 100000,
          currency: company.countryCode === 'IN' ? 'INR' : 'USD',
          period: 'annually',
          isVisible: true,
        },
        location: {
          address: company.address?.street || 'Business Center',
          city: company.address?.city || 'Bengaluru',
          state: company.address?.state || 'Karnataka',
          country: company.address?.country || 'India',
          postalCode: company.address?.postalCode || '560001',
          coordinates: {
            type: 'Point',
            coordinates: [77.5946, 12.9716],
          },
        },
        benefits: ['Health Insurance', 'Annual Wellness Allowance', 'Career Growth Plan', 'Hybrid Work Flexibility'],
        screeningQuestions: [
          {
            question: 'Do you have practical experience writing test automation with Playwright or Cypress?',
            type: 'yes_no',
            required: true,
            idealAnswer: 'yes',
          },
        ],
      },
    ];

    logger.info(`Creating ${sampleJobs.length} jobs for ${company.name}...`);

    const createdJobs = [];
    for (const jobData of sampleJobs) {
      const job = await Job.create(jobData);
      createdJobs.push(job);
      logger.info(`  ✅ Created Job: "${job.title}" [ID: ${job._id}, Slug: ${job.slug}]`);

      // Try generating embedding if configured
      if (config.gemini?.apiKey) {
        try {
          await generateJobEmbedding(job._id);
          logger.info(`     ✨ Generated vector embedding for "${job.title}"`);
        } catch (embedErr) {
          logger.warn(`     ⚠️ Could not generate embedding: ${embedErr.message}`);
        }
      }
    }

    logger.info(`\n🎉 Successfully seeded ${createdJobs.length} new jobs linked to company "${company.name}" (${company._id})!`);
    console.log('\n--- Seeded Jobs Summary ---');
    createdJobs.forEach((j, idx) => {
      console.log(`${idx + 1}. [${j._id}] ${j.title}`);
      console.log(`   - Employment: ${j.employmentType} | Workplace: ${j.workplaceType} | Status: ${j.status}`);
      console.log(`   - Salary: ${j.salaryRange.min.toLocaleString()} - ${j.salaryRange.max.toLocaleString()} ${j.salaryRange.currency}/${j.salaryRange.period}`);
      console.log(`   - Slug: ${j.slug}`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed jobs', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

const targetCompany = process.argv[2];
seedCompanyJobs(targetCompany);
