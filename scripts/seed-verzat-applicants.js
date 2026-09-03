/**
 * Seed realistic applicants, resumes, and applications for jobs posted by verzat@gmail.com.
 *
 * Usage:
 *   node scripts/seed-verzat-applicants.js
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = require('../src/config');
const logger = require('../src/config/logger');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Resume = require('../src/models/Resume');
const Application = require('../src/models/Application');
const CandidateNote = require('../src/models/CandidateNote');

const TARGET_EMAIL = 'verzat@gmail.com';

// Realistic Job Seeker profiles with valid coordinates around Pune & Maharashtra
const APPLICANTS_DATA = [
  {
    firstName: 'Aarav',
    lastName: 'Mehta',
    email: 'aarav.mehta.dev@gmail.com',
    phone: '+91 98201 12345',
    headline: 'Senior Full Stack Developer | Node.js, React & Microservices',
    summary:
      '5+ years building scalable high-traffic web applications with Node.js, Express, React, TypeScript, and MongoDB. Passionate about clean code, clean architecture, and developer tooling.',
    skills: ['Node.js', 'React.js', 'TypeScript', 'MongoDB', 'Redis', 'Docker', 'AWS', 'GraphQL'],
    location: {
      address: 'Pimple Saudagar',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411027',
      coordinates: { type: 'Point', coordinates: [73.7924, 18.5987] },
    },
    resumeData: {
      title: 'Aarav_Mehta_FullStack_Resume.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/aarav_mehta_resume.pdf',
      publicId: 'resumes/aarav_mehta_resume',
      fileType: 'pdf',
      fileSize: 124000,
      totalYearsOfExperience: 5,
      experience: [
        {
          company: 'Infosys Ltd',
          title: 'Senior Software Engineer',
          location: 'Pune, India',
          startDate: '2022-03',
          endDate: 'Present',
          current: true,
          description: 'Architected Node.js microservices handling 2M+ daily requests. Mentored 4 junior engineers.',
          highlights: ['Reduced API p99 latency by 35% using Redis caching', 'Built reusable React design system components'],
        },
        {
          company: 'Persistent Systems',
          title: 'Software Engineer',
          location: 'Pune, India',
          startDate: '2019-07',
          endDate: '2022-02',
          current: false,
          description: 'Full stack development with MERN stack and AWS deployments.',
        },
      ],
      education: [
        {
          institution: 'Pune Institute of Computer Technology (PICT)',
          degree: 'Bachelor of Engineering',
          field: 'Computer Engineering',
          graduationYear: 2019,
        },
      ],
      certifications: [{ name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services', year: 2023 }],
    },
  },
  {
    firstName: 'Priya',
    lastName: 'Deshmukh',
    email: 'priya.deshmukh.tech@gmail.com',
    phone: '+91 97654 23456',
    headline: 'Full Stack JavaScript Engineer | Node.js, Next.js & MongoDB',
    summary:
      '4 years of experience crafting modern, responsive web applications and secure backend APIs. Strong proficiency in TypeScript, React, and RESTful architectures.',
    skills: ['Node.js', 'React.js', 'Next.js', 'TypeScript', 'MongoDB', 'PostgreSQL', 'TailwindCSS'],
    location: {
      address: 'Kothrud',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411038',
      coordinates: { type: 'Point', coordinates: [73.8116, 18.5074] },
    },
    resumeData: {
      title: 'Priya_Deshmukh_Resume.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/priya_deshmukh_resume.pdf',
      publicId: 'resumes/priya_deshmukh_resume',
      fileType: 'pdf',
      fileSize: 118000,
      totalYearsOfExperience: 4,
      experience: [
        {
          company: 'Zensar Technologies',
          title: 'Full Stack Developer',
          location: 'Pune, India',
          startDate: '2020-09',
          endDate: 'Present',
          current: true,
          description: 'Developed e-commerce platforms using Next.js and Node.js microservices.',
        },
      ],
      education: [
        {
          institution: 'College of Engineering Pune (COEP)',
          degree: 'B.Tech',
          field: 'Information Technology',
          graduationYear: 2020,
        },
      ],
    },
  },
  {
    firstName: 'Rohan',
    lastName: 'Joshi',
    email: 'rohan.joshi.lead@gmail.com',
    phone: '+91 98210 34567',
    headline: 'Lead Full Stack Architect | Node.js, Distributed Systems & AWS',
    summary:
      '6.5 years designing distributed cloud architectures and leading cross-functional engineering teams. Extensive track record in SaaS product delivery.',
    skills: ['Node.js', 'React.js', 'TypeScript', 'Distributed Systems', 'MongoDB', 'Kafka', 'AWS', 'Kubernetes'],
    location: {
      address: 'Viman Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411014',
      coordinates: { type: 'Point', coordinates: [73.9143, 18.5679] },
    },
    resumeData: {
      title: 'Rohan_Joshi_Staff_Resume.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/rohan_joshi_resume.pdf',
      publicId: 'resumes/rohan_joshi_resume',
      fileType: 'pdf',
      fileSize: 135000,
      totalYearsOfExperience: 6.5,
      experience: [
        {
          company: 'Cisco Systems',
          title: 'Senior Software Engineer',
          location: 'Pune, India',
          startDate: '2021-01',
          endDate: 'Present',
          current: true,
          description: 'Led a team of 6 engineers building multi-tenant microservices architecture.',
        },
      ],
      education: [
        {
          institution: 'VJTI Mumbai',
          degree: 'B.Tech',
          field: 'Computer Science',
          graduationYear: 2018,
        },
      ],
    },
  },
  {
    firstName: 'Vikram',
    lastName: 'Patil',
    email: 'vikram.patil.devops@gmail.com',
    phone: '+91 99701 45678',
    headline: 'Lead Cloud & DevOps Engineer | AWS, Kubernetes, Terraform & SRE',
    summary:
      '7 years orchestrating multi-region cloud infrastructure, enterprise Kubernetes clusters, automated CI/CD pipelines, and high-availability systems on AWS.',
    skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD', 'GitHub Actions', 'Prometheus', 'Grafana', 'Python'],
    location: {
      address: 'Wakad',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411057',
      coordinates: { type: 'Point', coordinates: [73.7663, 18.5987] },
    },
    resumeData: {
      title: 'Vikram_Patil_DevOps_Lead.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/vikram_patil_devops.pdf',
      publicId: 'resumes/vikram_patil_devops',
      fileType: 'pdf',
      fileSize: 142000,
      totalYearsOfExperience: 7,
      experience: [
        {
          company: 'Barclays Global Service Centre',
          title: 'Lead Cloud Infrastructure Engineer',
          location: 'Pune, India',
          startDate: '2020-04',
          endDate: 'Present',
          current: true,
          description: 'Managed 50+ EKS production clusters across 3 AWS regions with 99.99% uptime SLA.',
        },
      ],
      education: [
        {
          institution: 'Maharashtra Institute of Technology (MIT Pune)',
          degree: 'B.E.',
          field: 'Computer Engineering',
          graduationYear: 2017,
        },
      ],
      certifications: [
        { name: 'Certified Kubernetes Administrator (CKA)', issuer: 'Cloud Native Computing Foundation (CNCF)', year: 2022 },
        { name: 'AWS Certified DevOps Engineer – Professional', issuer: 'Amazon Web Services', year: 2023 },
      ],
    },
  },
  {
    firstName: 'Aditya',
    lastName: 'Shinde',
    email: 'aditya.shinde.cloud@gmail.com',
    phone: '+91 97632 56789',
    headline: 'Senior DevOps / SRE Engineer | Kubernetes, Helm, ArgoCD & IaC',
    summary:
      '5+ years specializing in GitOps workflows (ArgoCD), Terraform modular infrastructure, zero-trust security postures, and cost optimization.',
    skills: ['Kubernetes', 'Terraform', 'ArgoCD', 'AWS', 'Docker', 'Linux', 'Bash', 'Prometheus'],
    location: {
      address: 'Aundh',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411007',
      coordinates: { type: 'Point', coordinates: [73.8052, 18.558] },
    },
    resumeData: {
      title: 'Aditya_Shinde_DevOps.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/aditya_shinde_devops.pdf',
      publicId: 'resumes/aditya_shinde_devops',
      fileType: 'pdf',
      fileSize: 128000,
      totalYearsOfExperience: 5,
      experience: [
        {
          company: 'Tech Mahindra',
          title: 'Senior DevOps Engineer',
          location: 'Pune, India',
          startDate: '2021-06',
          endDate: 'Present',
          current: true,
          description: 'Implemented GitOps pipelines with ArgoCD and automated cloud provisioning via Terraform.',
        },
      ],
      education: [
        {
          institution: 'Vishwakarma Institute of Technology (VIT Pune)',
          degree: 'B.Tech',
          field: 'Electronics & Telecommunication',
          graduationYear: 2019,
        },
      ],
    },
  },
  {
    firstName: 'Siddharth',
    lastName: 'Rao',
    email: 'siddharth.rao.ai@gmail.com',
    phone: '+91 99220 67890',
    headline: 'AI / Machine Learning Engineer | Generative AI, LLMs & Vector Search',
    summary:
      '4 years deploying generative AI solutions, RAG pipelines, fine-tuning open-source LLMs (Llama 3, Mistral), and implementing high-speed vector search with Pinecone and MongoDB Atlas.',
    skills: ['Python', 'PyTorch', 'LangChain', 'FastAPI', 'Vector Search', 'NLP', 'Gemini API', 'OpenAI', 'Docker'],
    location: {
      address: 'Kalyani Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411006',
      coordinates: { type: 'Point', coordinates: [73.9025, 18.5463] },
    },
    resumeData: {
      title: 'Siddharth_Rao_AI_Engineer.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/siddharth_rao_ai.pdf',
      publicId: 'resumes/siddharth_rao_ai',
      fileType: 'pdf',
      fileSize: 139000,
      totalYearsOfExperience: 4,
      experience: [
        {
          company: 'Rakuten Symphony India',
          title: 'Senior AI Engineer',
          location: 'Pune, India',
          startDate: '2022-02',
          endDate: 'Present',
          current: true,
          description: 'Designed agentic LLM workflows and semantic search services using FastAPI, PyTorch, and LangChain.',
        },
      ],
      education: [
        {
          institution: 'Symbiosis Institute of Technology (SIT Pune)',
          degree: 'B.Tech',
          field: 'Computer Science & Artificial Intelligence',
          graduationYear: 2020,
        },
      ],
    },
  },
  {
    firstName: 'Tanvi',
    lastName: 'Kulkarni',
    email: 'tanvi.kulkarni.ml@gmail.com',
    phone: '+91 98500 78901',
    headline: 'Machine Learning & NLP Specialist | PyTorch, HuggingFace & Transformers',
    summary:
      '3.5 years of experience applying NLP, text classification, semantic embeddings, and LLM integrations to solve automated data extraction and customer intelligence problems.',
    skills: ['Python', 'PyTorch', 'HuggingFace', 'LangChain', 'Transformers', 'FastAPI', 'SQL', 'Scikit-Learn'],
    location: {
      address: 'Bavdhan',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411021',
      coordinates: { type: 'Point', coordinates: [73.7749, 18.5136] },
    },
    resumeData: {
      title: 'Tanvi_Kulkarni_ML_Resume.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/tanvi_kulkarni_ml.pdf',
      publicId: 'resumes/tanvi_kulkarni_ml',
      fileType: 'pdf',
      fileSize: 122000,
      totalYearsOfExperience: 3.5,
      experience: [
        {
          company: 'Cybage Software',
          title: 'Machine Learning Engineer',
          location: 'Pune, India',
          startDate: '2021-08',
          endDate: 'Present',
          current: true,
          description: 'Trained transformer models for multi-label classification and sentiment analysis.',
        },
      ],
      education: [
        {
          institution: 'Cummins College of Engineering for Women',
          degree: 'B.Tech',
          field: 'Information Technology',
          graduationYear: 2021,
        },
      ],
    },
  },
  {
    firstName: 'Sameer',
    lastName: 'Sawant',
    email: 'sameer.sawant.mobile@gmail.com',
    phone: '+91 97640 89012',
    headline: 'Senior React Native Developer | Cross-Platform Mobile Architect',
    summary:
      '5 years specializing in React Native, Redux Toolkit, offline synchronization, and native module bridging across iOS and Android app stores.',
    skills: ['React Native', 'TypeScript', 'Redux', 'iOS', 'Android', 'REST API', 'Jest', 'Firebase'],
    location: {
      address: 'Magarpatta City',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411028',
      coordinates: { type: 'Point', coordinates: [73.9298, 18.5158] },
    },
    resumeData: {
      title: 'Sameer_Sawant_ReactNative.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/sameer_sawant_mobile.pdf',
      publicId: 'resumes/sameer_sawant_mobile',
      fileType: 'pdf',
      fileSize: 126000,
      totalYearsOfExperience: 5,
      experience: [
        {
          company: 'Veritas Technologies',
          title: 'Senior Mobile Engineer',
          location: 'Pune, India',
          startDate: '2021-03',
          endDate: 'Present',
          current: true,
          description: 'Shipped 3 enterprise mobile apps with 500k+ downloads on App Store & Google Play.',
        },
      ],
      education: [
        {
          institution: 'D.Y. Patil College of Engineering',
          degree: 'B.E.',
          field: 'Computer Engineering',
          graduationYear: 2019,
        },
      ],
    },
  },
  {
    firstName: 'Ritu',
    lastName: 'Verma',
    email: 'ritu.verma.mobile@gmail.com',
    phone: '+91 98810 90123',
    headline: 'Mobile Application Engineer | React Native, Flutter & TypeScript',
    summary:
      '4 years developing high-performance mobile user interfaces, push notifications, and automated UI testing with Detox and Jest.',
    skills: ['React Native', 'TypeScript', 'JavaScript', 'Mobile UI/UX', 'REST API', 'GraphQL', 'Detox'],
    location: {
      address: 'Hadapsar',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411028',
      coordinates: { type: 'Point', coordinates: [73.9352, 18.5029] },
    },
    resumeData: {
      title: 'Ritu_Verma_Mobile_Resume.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/ritu_verma_resume.pdf',
      publicId: 'resumes/ritu_verma_resume',
      fileType: 'pdf',
      fileSize: 115000,
      totalYearsOfExperience: 4,
      experience: [
        {
          company: 'Globant India',
          title: 'Mobile Engineer',
          location: 'Pune, India',
          startDate: '2020-11',
          endDate: 'Present',
          current: true,
          description: 'Built React Native fintech app with biometric authentication and offline transaction queue.',
        },
      ],
      education: [
        {
          institution: 'MIT World Peace University',
          degree: 'B.Tech',
          field: 'Computer Science',
          graduationYear: 2020,
        },
      ],
    },
  },
  {
    firstName: 'Pooja',
    lastName: 'More',
    email: 'pooja.more.design@gmail.com',
    phone: '+91 99600 01234',
    headline: 'Lead Product Designer | UI/UX, Design Systems & User Research',
    summary:
      '4.5 years creating beautiful, intuitive SaaS products and scalable multi-brand design systems in Figma. Strong emphasis on accessibility (WCAG) and UX research.',
    skills: ['Figma', 'UI/UX Design', 'Design Systems', 'Prototyping', 'User Research', 'Wireframing', 'WCAG'],
    location: {
      address: 'Senapati Bapat Road',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411016',
      coordinates: { type: 'Point', coordinates: [73.8327, 18.5314] },
    },
    resumeData: {
      title: 'Pooja_More_Product_Design_Portfolio.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/pooja_more_design.pdf',
      publicId: 'resumes/pooja_more_design',
      fileType: 'pdf',
      fileSize: 154000,
      totalYearsOfExperience: 4.5,
      experience: [
        {
          company: 'Mindstix Software Labs',
          title: 'Lead UI/UX Designer',
          location: 'Pune, India',
          startDate: '2021-05',
          endDate: 'Present',
          current: true,
          description: 'Led end-to-end UX for 4 enterprise B2B SaaS products and established an organization-wide Figma design system.',
        },
      ],
      education: [
        {
          institution: 'MIT Institute of Design (MIT ID Pune)',
          degree: 'Bachelor of Design',
          field: 'User Experience & Interaction Design',
          graduationYear: 2019,
        },
      ],
    },
  },
  {
    firstName: 'Varun',
    lastName: 'Bapat',
    email: 'varun.bapat.ux@gmail.com',
    phone: '+91 98220 12340',
    headline: 'Product & Visual Designer | Figma, Interactive Prototyping & Motion',
    summary:
      '3+ years crafting engaging digital products, micro-interactions, responsive web applications, and data dashboards.',
    skills: ['Figma', 'UI/UX Design', 'Interactive Prototyping', 'Micro-interactions', 'Design Systems', 'Adobe Creative Suite'],
    location: {
      address: 'Model Colony, Shivajinagar',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411016',
      coordinates: { type: 'Point', coordinates: [73.8378, 18.5362] },
    },
    resumeData: {
      title: 'Varun_Bapat_Design_Resume.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/varun_bapat_design.pdf',
      publicId: 'resumes/varun_bapat_design',
      fileType: 'pdf',
      fileSize: 140000,
      totalYearsOfExperience: 3,
      experience: [
        {
          company: 'Cognizant Technology Solutions',
          title: 'UI/UX Designer',
          location: 'Pune, India',
          startDate: '2021-10',
          endDate: 'Present',
          current: true,
          description: 'Designed analytics dashboards and responsive client portals.',
        },
      ],
      education: [
        {
          institution: 'Symbiosis Centre for Media and Communication',
          degree: 'B.Des',
          field: 'Visual Communication',
          graduationYear: 2021,
        },
      ],
    },
  },
  {
    firstName: 'Neha',
    lastName: 'Kulkarni',
    email: 'neha.kulkarni.dev@gmail.com',
    phone: '+91 98230 45612',
    headline: 'Frontend & Node.js Developer | React, Tailwind & Express',
    summary: '3 years of frontend-focused full-stack development. Skilled in building clean React components and Express APIs.',
    skills: ['React.js', 'JavaScript', 'Node.js', 'Express', 'HTML/CSS', 'TailwindCSS', 'Git'],
    location: {
      address: 'Baner',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411045',
      coordinates: { type: 'Point', coordinates: [73.7806, 18.559] },
    },
    resumeData: {
      title: 'Neha_Kulkarni_Resume.pdf',
      fileUrl: 'https://res.cloudinary.com/hire-engine/raw/upload/v1/resumes/neha_kulkarni_resume.pdf',
      publicId: 'resumes/neha_kulkarni_resume',
      fileType: 'pdf',
      fileSize: 110000,
      totalYearsOfExperience: 3,
      experience: [
        {
          company: 'Capgemini India',
          title: 'Software Engineer',
          location: 'Pune, India',
          startDate: '2021-09',
          endDate: 'Present',
          current: true,
          description: 'Developed frontend web portals with React and integrated REST endpoints.',
        },
      ],
      education: [
        {
          institution: 'Pune University',
          degree: 'B.Sc.',
          field: 'Computer Science',
          graduationYear: 2021,
        },
      ],
    },
  },
];

// Mapping jobs to candidates and specific application state/pipeline stages
function getApplicationsForJob(job, applicantMap) {
  const title = job.title.toLowerCase();

  if (title.includes('full stack')) {
    return [
      {
        applicantKey: 'aarav.mehta.dev@gmail.com',
        status: 'interview',
        pipelineStage: 'Interview',
        rating: 5,
        appliedDaysAgo: 5,
        isEasyApply: false,
        coverLetter:
          'Dear Hiring Team at Verzat Technologies,\n\nI have been developing full-stack Node.js and React applications for over 5 years. I have extensive experience optimizing MongoDB databases and building clean microservices. I would love the opportunity to bring my technical and mentorship skills to Verzat.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
          { questionIndex: 1, question: job.screeningQuestions[1]?.question || '', answer: '15 Days' },
        ],
      },
      {
        applicantKey: 'priya.deshmukh.tech@gmail.com',
        status: 'screening',
        pipelineStage: 'Screening',
        rating: 4,
        appliedDaysAgo: 3,
        isEasyApply: true,
        coverLetter:
          'Hello, I am a passionate MERN stack developer with 4 years of experience delivering scalable web apps. I look forward to discussing how my experience aligns with your open Full Stack role.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
          { questionIndex: 1, question: job.screeningQuestions[1]?.question || '', answer: '30 Days' },
        ],
      },
      {
        applicantKey: 'rohan.joshi.lead@gmail.com',
        status: 'offer',
        pipelineStage: 'Offer',
        rating: 5,
        appliedDaysAgo: 8,
        isEasyApply: false,
        coverLetter:
          'Greetings! With 6.5 years designing distributed architectures and leading JS engineering teams, I am excited about the opportunity to contribute to Verzat Technologies growth.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
          { questionIndex: 1, question: job.screeningQuestions[1]?.question || '', answer: 'Immediate' },
        ],
      },
      {
        applicantKey: 'neha.kulkarni.dev@gmail.com',
        status: 'submitted',
        pipelineStage: 'New',
        rating: null,
        appliedDaysAgo: 1,
        isEasyApply: true,
        coverLetter: 'Hi, I am excited to apply for the Senior Full Stack role and expand my microservices expertise.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
          { questionIndex: 1, question: job.screeningQuestions[1]?.question || '', answer: '30 Days' },
        ],
      },
    ];
  }

  if (title.includes('devops')) {
    return [
      {
        applicantKey: 'vikram.patil.devops@gmail.com',
        status: 'interview',
        pipelineStage: 'Interview',
        rating: 5,
        appliedDaysAgo: 6,
        isEasyApply: false,
        coverLetter:
          'Dear Verzat Team,\n\nI have 7 years of deep production experience with AWS EKS, Terraform, and automated GitOps pipelines. I look forward to leading your cloud infrastructure team.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
        ],
      },
      {
        applicantKey: 'aditya.shinde.cloud@gmail.com',
        status: 'hired',
        pipelineStage: 'Hired',
        rating: 5,
        appliedDaysAgo: 12,
        isEasyApply: false,
        coverLetter:
          'Hello, I am a certified DevOps engineer with 5 years experience scaling cloud environments and zero-trust security postures.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
        ],
      },
      {
        applicantKey: 'aarav.mehta.dev@gmail.com',
        status: 'submitted',
        pipelineStage: 'New',
        rating: null,
        appliedDaysAgo: 2,
        isEasyApply: true,
        coverLetter: 'Interested in DevOps opportunities with strong Docker and AWS infrastructure experience.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
        ],
      },
    ];
  }

  if (title.includes('ai') || title.includes('machine learning')) {
    return [
      {
        applicantKey: 'siddharth.rao.ai@gmail.com',
        status: 'offer',
        pipelineStage: 'Offer',
        rating: 5,
        appliedDaysAgo: 7,
        isEasyApply: false,
        coverLetter:
          'Dear Team,\n\nI specialize in RAG pipelines, fine-tuning LLMs, and high-performance vector search in Python and PyTorch. I am thrilled by the AI direction at Verzat Technologies.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
        ],
      },
      {
        applicantKey: 'tanvi.kulkarni.ml@gmail.com',
        status: 'screening',
        pipelineStage: 'Screening',
        rating: 4,
        appliedDaysAgo: 4,
        isEasyApply: true,
        coverLetter:
          'Hello, I bring 3.5 years of NLP, embeddings, and machine learning model deployment experience in production environments.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
        ],
      },
    ];
  }

  if (title.includes('react native') || title.includes('mobile')) {
    return [
      {
        applicantKey: 'sameer.sawant.mobile@gmail.com',
        status: 'interview',
        pipelineStage: 'Interview',
        rating: 5,
        appliedDaysAgo: 5,
        isEasyApply: false,
        coverLetter:
          'Dear Hiring Manager,\n\nI have shipped multiple top-tier React Native applications on both iOS and Android stores with offline support. I would love to drive your mobile product initiatives.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
        ],
      },
      {
        applicantKey: 'ritu.verma.mobile@gmail.com',
        status: 'submitted',
        pipelineStage: 'New',
        rating: null,
        appliedDaysAgo: 2,
        isEasyApply: true,
        coverLetter: 'Applying for the Senior React Native role. Excited to build responsive mobile user interfaces.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
        ],
      },
    ];
  }

  if (title.includes('designer') || title.includes('ui')) {
    return [
      {
        applicantKey: 'pooja.more.design@gmail.com',
        status: 'interview',
        pipelineStage: 'Interview',
        rating: 5,
        appliedDaysAgo: 6,
        isEasyApply: false,
        coverLetter:
          'Hello Verzat Team,\n\nI lead design systems and SaaS user research with 4.5 years experience in Figma and micro-interactions. My portfolio is available at poojamore.design.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
        ],
      },
      {
        applicantKey: 'varun.bapat.ux@gmail.com',
        status: 'offer',
        pipelineStage: 'Offer',
        rating: 5,
        appliedDaysAgo: 9,
        isEasyApply: false,
        coverLetter:
          'Greetings! I craft sleek visual interfaces and interactive prototypes that elevate user delight and conversion.',
        screeningAnswers: [
          { questionIndex: 0, question: job.screeningQuestions[0]?.question || '', answer: 'yes' },
        ],
      },
    ];
  }

  return [];
}

async function seedApplicants() {
  try {
    logger.info('🔗 Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);

    // 1. Get employer user
    const employer = await User.findOne({ email: TARGET_EMAIL.toLowerCase() });
    if (!employer) {
      throw new Error(`User with email "${TARGET_EMAIL}" not found.`);
    }

    // 2. Fetch all active jobs posted by this employer
    const jobs = await Job.find({ postedBy: employer._id, status: 'active' });
    if (!jobs.length) {
      throw new Error(`No active jobs found for employer ${TARGET_EMAIL}. Please run seed-verzat-jobs.js first.`);
    }

    logger.info(`📋 Found ${jobs.length} jobs posted by ${employer.email}\n`);

    // 3. Upsert Job Seeker Users & Resumes
    const applicantMap = new Map(); // email -> { user, resume }
    const defaultPasswordHash = await bcrypt.hash('Candidate123!', 10);

    for (const data of APPLICANTS_DATA) {
      let user = await User.findOne({ email: data.email });
      if (!user) {
        user = await User.create({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          passwordHash: defaultPasswordHash,
          role: 'jobseeker',
          isEmailVerified: true,
          phone: data.phone,
          headline: data.headline,
          summary: data.summary,
          skills: data.skills,
          countryCode: 'IN',
          location: data.location,
        });
        logger.info(`👤 Created Job Seeker: ${user.firstName} ${user.lastName} (${user.email})`);
      } else {
        logger.info(`👤 Existing Job Seeker: ${user.firstName} ${user.lastName} (${user.email})`);
      }

      // Upsert Resume
      let resume = await Resume.findOne({ user: user._id });
      if (!resume) {
        resume = await Resume.create({
          user: user._id,
          title: data.resumeData.title,
          fileUrl: data.resumeData.fileUrl,
          publicId: data.resumeData.publicId,
          fileType: data.resumeData.fileType,
          fileSize: data.resumeData.fileSize,
          originalFileName: data.resumeData.title,
          isDefault: true,
          parsedData: {
            personalInfo: {
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              phone: data.phone,
              location: `${data.location.city}, ${data.location.state}`,
            },
            headline: data.headline,
            summary: data.summary,
            skills: data.skills,
            experience: data.resumeData.experience,
            education: data.resumeData.education,
            certifications: data.resumeData.certifications || [],
            totalYearsOfExperience: data.resumeData.totalYearsOfExperience,
            rawText: `${data.headline} ${data.summary} ${data.skills.join(' ')}`,
          },
        });
        logger.info(`   📄 Created Resume: "${resume.title}"`);
      }

      applicantMap.set(data.email, { user, resume });
    }

    console.log('\n--- Seeding Applications ---');

    // 4. Clear any old applications for these jobs to ensure clean slate
    const jobIds = jobs.map((j) => j._id);
    await Application.deleteMany({ job: { $in: jobIds } });

    let totalApplicationsCreated = 0;

    for (const job of jobs) {
      const appConfigs = getApplicationsForJob(job, applicantMap);
      let jobAppCount = 0;

      for (const config of appConfigs) {
        const applicantInfo = applicantMap.get(config.applicantKey);
        if (!applicantInfo) continue;

        const appliedDate = new Date(Date.now() - config.appliedDaysAgo * 24 * 60 * 60 * 1000);

        const application = await Application.create({
          job: job._id,
          applicant: applicantInfo.user._id,
          resume: applicantInfo.resume._id,
          coverLetter: config.coverLetter,
          screeningAnswers: config.screeningAnswers,
          status: config.status,
          pipelineStage: config.pipelineStage,
          rating: config.rating,
          isEasyApply: config.isEasyApply,
          appliedAt: appliedDate,
          viewedAt: config.status !== 'submitted' ? new Date(appliedDate.getTime() + 3600000) : null,
          statusHistory: [
            {
              status: 'submitted',
              changedAt: appliedDate,
              note: 'Application received',
            },
            ...(config.status !== 'submitted'
              ? [
                  {
                    status: config.status,
                    changedBy: employer._id,
                    changedAt: new Date(appliedDate.getTime() + 86400000),
                    note: `Moved to ${config.pipelineStage} by recruiter`,
                  },
                ]
              : []),
          ],
        });

        // Add a recruiter note if interviewed or offered
        if (config.status === 'interview' || config.status === 'offer' || config.status === 'hired') {
          await CandidateNote.create({
            application: application._id,
            job: job._id,
            author: employer._id,
            content: `Strong candidate background for ${job.title}. Passed technical deep dive with flying colors.`,
          });
        }

        jobAppCount++;
        totalApplicationsCreated++;
      }

      // Atomically update Job metrics
      await Job.findByIdAndUpdate(job._id, {
        applicationCount: jobAppCount,
        viewCount: jobAppCount * 14 + 18,
        clickCount: jobAppCount * 6 + 9,
      });

      logger.info(`✅ Seeded ${jobAppCount} applicants for "${job.title}"`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 Successfully seeded ${totalApplicationsCreated} applicants across 5 jobs!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Summary per job
    for (const job of jobs) {
      const apps = await Application.find({ job: job._id })
        .populate('applicant', 'firstName lastName email location')
        .populate('resume', 'title');

      console.log(`📌 Job: "${job.title}" (${apps.length} applicants)`);
      apps.forEach((a, i) => {
        console.log(
          `   ${i + 1}. ${a.applicant.firstName} ${a.applicant.lastName} (${a.applicant.email})`
        );
        console.log(`      Stage: ${a.pipelineStage} | Status: ${a.status} | Rating: ${a.rating ? '★'.repeat(a.rating) : 'Unrated'}`);
        console.log(`      Location: ${a.applicant.location.city} [${a.applicant.location.coordinates?.coordinates?.join(', ')}]`);
      });
      console.log('');
    }

    await mongoose.disconnect();
    logger.info('🔌 Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to seed applicants:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

seedApplicants();
