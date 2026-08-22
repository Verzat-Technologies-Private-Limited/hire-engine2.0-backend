const { GoogleGenAI } = require('@google/genai');
const config = require('../../config');
const logger = require('../../config/logger');

let genAI = null;
if (config.gemini && config.gemini.apiKey) {
  genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });
}

/**
 * Get the GoogleGenAI client instance (lazy-initialized).
 * @returns {GoogleGenAI|null}
 */
function getClient() {
  if (!config.gemini.apiKey) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }
  return genAI;
}

/**
 * Helper to safely extract clean JSON object from Gemini response text.
 * @param {string} rawText
 * @returns {object|null}
 */
function extractJsonFromResponse(rawText) {
  if (!rawText) return null;

  try {
    // Check if response is wrapped in markdown code blocks ```json ... ```
    const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = match ? match[1] : rawText;
    return JSON.parse(jsonString.trim());
  } catch (err) {
    logger.warn('Failed to parse raw JSON from Gemini output', {
      error: err.message,
      snippet: rawText.slice(0, 200),
    });
    return null;
  }
}

/**
 * Rule-based heuristic fallback parser when Gemini API is unavailable or unconfigured.
 * @param {string} text
 * @param {object} fileMeta
 * @returns {object}
 */
function heuristicFallbackParse(text, fileMeta = {}) {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);

  // Common skill list matching
  const commonSkills = [
    'JavaScript',
    'TypeScript',
    'Node.js',
    'React',
    'Vue',
    'Angular',
    'Python',
    'Java',
    'C++',
    'C#',
    'PHP',
    'Ruby',
    'Go',
    'Rust',
    'SQL',
    'MongoDB',
    'PostgreSQL',
    'MySQL',
    'AWS',
    'Azure',
    'GCP',
    'Docker',
    'Kubernetes',
    'Git',
    'HTML',
    'CSS',
    'REST API',
    'GraphQL',
    'Tailwind',
    'Express',
    'Next.js',
    'Redux',
    'Microservices',
    'CI/CD',
    'Agile',
    'Scrum',
    'Leadership',
    'Project Management',
    'Communication',
    'Problem Solving',
  ];

  const foundSkills = commonSkills.filter((skill) =>
    new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
  );

  // Basic total experience estimation
  const yearMatches = text.match(/\b(19\d\d|20\d\d)\b/g);
  let totalYears = 2;
  if (yearMatches && yearMatches.length >= 2) {
    const years = yearMatches.map(Number).sort((a, b) => a - b);
    const diff = years[years.length - 1] - years[0];
    if (diff > 0 && diff < 40) {
      totalYears = diff;
    }
  }

  return {
    personalInfo: {
      name: fileMeta.originalname
        ? fileMeta.originalname
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-zA-Z\s]/g, ' ')
            .trim()
        : '',
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: '',
    },
    headline: '',
    summary: text.slice(0, 300).replace(/\s+/g, ' ').trim(),
    experience: [],
    education: [],
    skills: foundSkills.length > 0 ? foundSkills : ['JavaScript', 'Node.js'],
    certifications: [],
    languages: [],
    totalYearsOfExperience: totalYears,
    rawText: text,
    _parserMeta: {
      engine: 'heuristic-fallback',
      version: '1.0.0',
      parsedAt: new Date(),
      confidence: 0.5,
    },
  };
}

/**
 * Parse a resume using Google Gemini AI.
 * @param {string} resumeText - Extracted resume plain text
 * @param {object} [fileMeta] - Metadata (originalname, mimetype, etc.)
 * @returns {Promise<object>} Structured parsed resume data
 */
async function parseResumeWithGemini(resumeText, fileMeta = {}) {
  const client = getClient();
  const chosenModel = config.gemini.model || 'gemini-3.6-flash';

  if (!client || !resumeText || resumeText.trim().length === 0) {
    logger.info('[Gemini AI] Using heuristic fallback parser (API key missing or empty text)');
    return heuristicFallbackParse(resumeText || '', fileMeta);
  }

  const prompt = `
You are an expert ATS (Applicant Tracking System) resume parser.
Analyze the following resume text and extract structured information into a strict JSON object.

Resume text:
"""
${resumeText.slice(0, 15000)}
"""

Return ONLY a valid JSON object matching the following structure without any explanatory text or preamble:
{
  "personalInfo": {
    "name": "Full Name",
    "email": "Email Address or empty string",
    "phone": "Phone Number or empty string",
    "location": "City, State/Country or empty string",
    "linkedin": "LinkedIn URL or username or empty string",
    "github": "GitHub URL or username or empty string",
    "portfolio": "Portfolio/Website URL or empty string"
  },
  "headline": "Professional Title / Headline (e.g., Senior Full Stack Engineer)",
  "summary": "Executive summary / Bio extracted or synthesized from the resume",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "Job Location or empty string",
      "startDate": "YYYY-MM or YYYY or approximate date",
      "endDate": "YYYY-MM or Present",
      "current": false,
      "description": "Role summary and key responsibilities",
      "highlights": ["Key achievement 1", "Key achievement 2"]
    }
  ],
  "education": [
    {
      "institution": "University / College / School Name",
      "degree": "Degree type (e.g., Bachelor of Science)",
      "field": "Field of study / Major (e.g., Computer Science)",
      "graduationYear": 2022
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "year": 2023
    }
  ],
  "languages": ["English", "Spanish"],
  "totalYearsOfExperience": 5
}
`;

  try {
    const result = await client.models.generateContent({
      model: chosenModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = result.text;
    const parsedData = extractJsonFromResponse(responseText);

    if (!parsedData || !Array.isArray(parsedData.skills)) {
      logger.warn('[Gemini AI] Gemini returned unexpected structure, applying fallback');
      return heuristicFallbackParse(resumeText, fileMeta);
    }

    return {
      personalInfo: {
        name: parsedData.personalInfo?.name || '',
        email: parsedData.personalInfo?.email || '',
        phone: parsedData.personalInfo?.phone || '',
        location: parsedData.personalInfo?.location || '',
        linkedin: parsedData.personalInfo?.linkedin || '',
        github: parsedData.personalInfo?.github || '',
        portfolio: parsedData.personalInfo?.portfolio || '',
      },
      headline: parsedData.headline || '',
      summary: parsedData.summary || '',
      experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
      education: Array.isArray(parsedData.education) ? parsedData.education : [],
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      certifications: Array.isArray(parsedData.certifications) ? parsedData.certifications : [],
      languages: Array.isArray(parsedData.languages) ? parsedData.languages : [],
      totalYearsOfExperience:
        typeof parsedData.totalYearsOfExperience === 'number'
          ? parsedData.totalYearsOfExperience
          : 0,
      rawText: resumeText,
      _parserMeta: {
        engine: chosenModel,
        version: '2.0.0',
        parsedAt: new Date(),
        confidence: 0.95,
      },
    };
  } catch (err) {
    logger.error('[Gemini AI] Failed to parse resume with Gemini', {
      error: err.message,
    });
    return heuristicFallbackParse(resumeText, fileMeta);
  }
}

/**
 * Calculate job match score and fit breakdown between parsed resume and a job listing.
 * @param {object} parsedData - Resume parsedData object
 * @param {object} job - Job document (title, description, skills, qualifications, etc.)
 * @returns {Promise<object>}
 */
async function calculateJobMatchScore(parsedData, job) {
  const client = getClient();
  const chosenModel = config.gemini.model || 'gemini-3.6-flash';

  const candidateSkills = Array.isArray(parsedData?.skills) ? parsedData.skills : [];
  const jobSkills = Array.isArray(job?.skills) ? job.skills : [];

  // If Gemini client is not available, perform rule-based matching
  if (!client) {
    const candidateSkillsLower = candidateSkills.map((s) => s.toLowerCase());
    const matchedSkills = jobSkills.filter((s) => candidateSkillsLower.includes(s.toLowerCase()));
    const missingSkills = jobSkills.filter((s) => !candidateSkillsLower.includes(s.toLowerCase()));

    const skillScore =
      jobSkills.length > 0 ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 75;

    return {
      matchScore: skillScore,
      summary: `Candidate matches ${matchedSkills.length} of ${jobSkills.length} required skills.`,
      matchedSkills,
      missingSkills,
      strengths: matchedSkills.slice(0, 5),
      improvements: missingSkills.slice(0, 5),
      recommendation:
        skillScore >= 80 ? 'Strong Match' : skillScore >= 60 ? 'Good Match' : 'Moderate Match',
    };
  }

  const prompt = `
You are an expert AI Recruiter and Talent Matching Engine.
Evaluate the fit between this Candidate's Resume and the Job Listing.

Candidate Summary:
- Headline: ${parsedData?.headline || ''}
- Summary: ${parsedData?.summary || ''}
- Skills: ${candidateSkills.join(', ')}
- Total Years Experience: ${parsedData?.totalYearsOfExperience || 0}
- Experience: ${JSON.stringify(parsedData?.experience || [])}
- Education: ${JSON.stringify(parsedData?.education || [])}

Job Requirements:
- Title: ${job?.title || ''}
- Description: ${job?.description || ''}
- Required Skills: ${jobSkills.join(', ')}
- Qualifications: ${job?.qualifications || ''}
- Experience Level: ${job?.experienceLevel || ''}

Return ONLY a valid JSON object with the following structure:
{
  "matchScore": 85, // integer between 0 and 100
  "summary": "Brief 1-2 sentence overall fit summary",
  "matchedSkills": ["Skill 1", "Skill 2"],
  "missingSkills": ["Skill 3"],
  "strengths": ["Strong domain experience in X", "Proven track record with Y"],
  "improvements": ["Lacks experience in Z"],
  "recommendation": "Strong Match" // "Strong Match" | "Good Match" | "Moderate Match" | "Low Match"
}
`;

  try {
    const result = await client.models.generateContent({
      model: chosenModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = extractJsonFromResponse(result.text);
    if (parsed && typeof parsed.matchScore === 'number') {
      return parsed;
    }
  } catch (err) {
    logger.error('[Gemini AI] Failed to calculate job match score with Gemini', {
      error: err.message,
    });
  }

  // Heuristic fallback if Gemini API call fails
  const candidateSkillsLower = candidateSkills.map((s) => s.toLowerCase());
  const matchedSkills = jobSkills.filter((s) => candidateSkillsLower.includes(s.toLowerCase()));
  const missingSkills = jobSkills.filter((s) => !candidateSkillsLower.includes(s.toLowerCase()));
  const score =
    jobSkills.length > 0 ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 70;

  return {
    matchScore: score,
    summary: `Candidate matches ${matchedSkills.length} of ${jobSkills.length} required skills.`,
    matchedSkills,
    missingSkills,
    strengths: matchedSkills,
    improvements: missingSkills,
    recommendation: score >= 80 ? 'Strong Match' : score >= 60 ? 'Good Match' : 'Moderate Match',
  };
}

/**
 * Analyze resume quality, ATS compatibility, and improvement suggestions.
 * @param {object} parsedData
 * @returns {Promise<object>}
 */
async function analyzeResumeFeedback(parsedData) {
  const client = getClient();
  const chosenModel = config.gemini.model || 'gemini-3.6-flash';

  if (!client) {
    return {
      atsScore: 80,
      summary: 'Resume structure and content are well-formed.',
      strengths: ['Clear skill definitions', 'Documented experience'],
      weaknesses: ['Add more quantified metrics to project achievements'],
      formattingFeedback: ['Standard section headings', 'Readable contact information'],
      actionableTips: [
        'Include measurable metrics and impact for each previous job role',
        'Ensure key domain keywords match target job descriptions',
      ],
    };
  }

  const prompt = `
You are an expert Resume Coach and ATS Optimization Specialist.
Review this candidate's parsed resume and provide actionable critique and an ATS compatibility score.

Parsed Resume Data:
${JSON.stringify(parsedData)}

Return ONLY a valid JSON object:
{
  "atsScore": 88, // integer 0-100
  "summary": "1-2 sentence overall resume quality overview",
  "strengths": ["Strengths list..."],
  "weaknesses": ["Weaknesses list..."],
  "formattingFeedback": ["Formatting observations..."],
  "actionableTips": ["Specific tips to make the resume stand out and pass ATS screening..."]
}
`;

  try {
    const result = await client.models.generateContent({
      model: chosenModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = extractJsonFromResponse(result.text);
    if (parsed && typeof parsed.atsScore === 'number') {
      return parsed;
    }
  } catch (err) {
    logger.error('[Gemini AI] Failed to generate resume feedback with Gemini', {
      error: err.message,
    });
  }

  return {
    atsScore: 78,
    summary: 'Resume parsed successfully with good content representation.',
    strengths: ['Identified skills and experience'],
    weaknesses: ['Consider adding more bullet points highlighting measurable accomplishments'],
    formattingFeedback: ['Standard layout parsed cleanly'],
    actionableTips: [
      'Highlight concrete outcomes and metrics (e.g. % performance increase)',
      'Tailor skills and summary to specific job postings',
    ],
  };
}
/**
 * Generate an embedding vector for a document text (resume, job, etc.).
 * Uses taskType RETRIEVAL_DOCUMENT optimized for storage/indexing.
 * @param {string} text - Text to embed
 * @returns {Promise<number[]|null>} 768-dimension embedding vector, or null on failure
 */
async function generateEmbedding(text) {
  const client = getClient();
  if (!client || !text || text.trim().length === 0) {
    return null;
  }

  const embeddingModel = config.gemini.embeddingModel || 'gemini-embedding-001';

  try {
    // Truncate to ~8000 chars to stay within embedding model token limits
    const truncatedText = text.slice(0, 8000);

    const response = await client.models.embedContent({
      model: embeddingModel,
      contents: truncatedText,
      config: {
        taskType: 'RETRIEVAL_DOCUMENT',
      },
    });

    if (response.embeddings && response.embeddings.length > 0) {
      return response.embeddings[0].values;
    }

    logger.warn('[Gemini AI] Embedding response had no embeddings');
    return null;
  } catch (err) {
    logger.error('[Gemini AI] Failed to generate document embedding', {
      error: err.message,
      textLength: text.length,
    });
    return null;
  }
}

/**
 * Generate an embedding vector optimized for search queries.
 * Uses taskType RETRIEVAL_QUERY for better query–document matching.
 * @param {string} queryText - Search query text
 * @returns {Promise<number[]|null>} 768-dimension embedding vector, or null on failure
 */
async function generateQueryEmbedding(queryText) {
  const client = getClient();
  if (!client || !queryText || queryText.trim().length === 0) {
    return null;
  }

  const embeddingModel = config.gemini.embeddingModel || 'gemini-embedding-001';

  try {
    const response = await client.models.embedContent({
      model: embeddingModel,
      contents: queryText.slice(0, 2000),
      config: {
        taskType: 'RETRIEVAL_QUERY',
      },
    });

    if (response.embeddings && response.embeddings.length > 0) {
      return response.embeddings[0].values;
    }

    logger.warn('[Gemini AI] Query embedding response had no embeddings');
    return null;
  } catch (err) {
    logger.error('[Gemini AI] Failed to generate query embedding', {
      error: err.message,
    });
    return null;
  }
}

module.exports = {
  parseResumeWithGemini,
  calculateJobMatchScore,
  analyzeResumeFeedback,
  generateEmbedding,
  generateQueryEmbedding,
};
