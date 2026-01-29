/**
 * Subscription Description Generator
 * Generates automated subscription descriptions based on vendor/provider name
 */

const OpenAI = require('openai');

// Initialize OpenAI client if API key is available
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Generate subscription description for a vendor/provider
 * @param {string} provider - Vendor/provider name
 * @param {Array} tools - Linked tools (optional)
 * @returns {Promise<string>} - Generated description (2 lines)
 */
async function generateSubscriptionDescription(provider, tools = []) {
  if (!provider) {
    return '';
  }

  // If OpenAI is available, use it to generate description
  if (openaiClient) {
    try {
      const toolsInfo = tools.length > 0
        ? tools.map(t => typeof t === 'object' ? t.name : t).join(', ')
        : '';

      const prompt = `Generate a brief 2-line subscription description for the service/vendor "${provider}".

Requirements:
- First line: What the service/tool is used for (e.g., "AI-powered language model and API service for natural language processing")
- Second line: Which specific tool/service this is (e.g., "OpenAI provides GPT models, embeddings, and AI assistants")
- Keep each line concise (max 80 characters per line)
- Be specific about the service's purpose
${toolsInfo ? `- This invoice is linked to tools: ${toolsInfo}` : ''}

Format as two lines separated by a newline. Example:
AI-powered language model and API service for natural language processing
OpenAI provides GPT models, embeddings, and AI assistants

Vendor: ${provider}
${toolsInfo ? `Linked Tools: ${toolsInfo}` : ''}

Generate description:`;

      const response = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a technical writer specializing in software service descriptions. Generate concise, accurate descriptions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const description = response.choices[0]?.message?.content?.trim() || '';
      return description;
    } catch (error) {
      console.error('Error generating description with OpenAI:', error.message);
      // Fall back to mapping
    }
  }

  // Fallback: Use predefined mappings for common vendors
  return getDescriptionFromMapping(provider, tools);
}

/**
 * Get description from predefined mapping
 * @param {string} provider - Vendor/provider name
 * @param {Array} tools - Linked tools
 * @returns {string} - Description
 */
function getDescriptionFromMapping(provider, tools = []) {
  const providerLower = provider.toLowerCase();
  
  // Common vendor mappings
  const mappings = {
    'openai': {
      line1: 'AI-powered language model and API service for natural language processing',
      line2: 'OpenAI provides GPT models, embeddings, and AI assistants for applications'
    },
    'aws': {
      line1: 'Cloud computing platform providing infrastructure and services',
      line2: 'Amazon Web Services offers compute, storage, database, and networking solutions'
    },
    'azure': {
      line1: 'Microsoft cloud platform for building and deploying applications',
      line2: 'Azure provides cloud services, AI, analytics, and enterprise solutions'
    },
    'google cloud': {
      line1: 'Google Cloud Platform for cloud computing and data analytics',
      line2: 'GCP offers compute, storage, machine learning, and big data services'
    },
    'github': {
      line1: 'Code hosting platform for version control and collaboration',
      line2: 'GitHub provides Git repositories, CI/CD, and project management tools'
    },
    'stripe': {
      line1: 'Payment processing platform for online businesses',
      line2: 'Stripe handles payments, subscriptions, and financial transactions'
    },
    'vercel': {
      line1: 'Cloud platform for deploying frontend applications and serverless functions',
      line2: 'Vercel provides hosting, edge functions, and deployment automation'
    },
    'netlify': {
      line1: 'Web hosting and deployment platform for static sites and JAMstack',
      line2: 'Netlify offers hosting, CI/CD, forms, and edge functions'
    },
    'mongodb': {
      line1: 'NoSQL database platform for modern applications',
      line2: 'MongoDB provides document database, Atlas cloud service, and data tools'
    },
    'postgresql': {
      line1: 'Open-source relational database management system',
      line2: 'PostgreSQL offers advanced SQL features and extensibility'
    },
    'redis': {
      line1: 'In-memory data structure store used as database and cache',
      line2: 'Redis provides high-performance caching, messaging, and data storage'
    },
    'docker': {
      line1: 'Containerization platform for packaging and deploying applications',
      line2: 'Docker enables container creation, management, and orchestration'
    },
    'kubernetes': {
      line1: 'Container orchestration platform for managing containerized applications',
      line2: 'Kubernetes automates deployment, scaling, and management of containers'
    },
    'slack': {
      line1: 'Team communication and collaboration platform',
      line2: 'Slack provides messaging, file sharing, and team workspace tools'
    },
    'zoom': {
      line1: 'Video conferencing and online meeting platform',
      line2: 'Zoom offers video calls, webinars, and virtual meeting rooms'
    },
    'notion': {
      line1: 'All-in-one workspace for notes, docs, and project management',
      line2: 'Notion provides note-taking, databases, and collaboration tools'
    },
    'figma': {
      line1: 'Collaborative design and prototyping tool for UI/UX',
      line2: 'Figma enables design creation, prototyping, and team collaboration'
    },
    'adobe': {
      line1: 'Creative software suite for design, photography, and video editing',
      line2: 'Adobe provides Photoshop, Illustrator, Premiere, and Creative Cloud services'
    },
    'salesforce': {
      line1: 'Customer relationship management and business application platform',
      line2: 'Salesforce offers CRM, sales automation, and cloud business solutions'
    },
    'hubspot': {
      line1: 'Inbound marketing and sales platform for customer management',
      line2: 'HubSpot provides CRM, marketing automation, and sales tools'
    }
  };

  // Check for exact or partial matches
  for (const [key, value] of Object.entries(mappings)) {
    if (providerLower.includes(key)) {
      return `${value.line1}\n${value.line2}`;
    }
  }

  // If tools are linked, use tool information
  if (tools && tools.length > 0) {
    const toolNames = tools.map(t => typeof t === 'object' ? t.name : t).join(', ');
    return `Subscription service for ${provider}\nLinked to tools: ${toolNames}`;
  }

  // Generic fallback
  return `Subscription service for ${provider}\nMonthly/annual billing for ${provider} services`;
}

module.exports = {
  generateSubscriptionDescription,
  getDescriptionFromMapping
};
