/**
 * AI Social Media Caption Generator - Backend Server
 * 
 * Built with:
 * - Express.js for REST API routing and static file serving
 * - @anthropic-ai/sdk for official Anthropic Claude API integration
 * - dotenv for managing sensitive environment variables
 * - express-rate-limit to protect against abuse and spam
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Allowed options for input validation
const ALLOWED_PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'X (Twitter)', 'YouTube'];
const ALLOWED_TONES = ['Funny', 'Professional', 'Friendly', 'Inspirational', 'Emotional', 'Casual', 'Promotional'];
const ALLOWED_LANGUAGES = ['English', 'Tamil', 'Tanglish'];
const ALLOWED_LENGTHS = ['Short', 'Medium', 'Long'];

// Maximum allowed character length for the topic input
const MAX_TOPIC_LENGTH = 500;
const MIN_TOPIC_LENGTH = 3;

// Middleware
app.use(cors());
app.use(express.json({ limit: '30mb' })); // Support base64 image and video keyframe uploads up to 30MB

// Handle malformed JSON request bodies safely
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON formatted body sent in request.'
    });
  }
  next(err);
});

app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend static files

// Allowed image MIME types for Claude Vision
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Rate Limiter: Generous limit for multi-device / college lab testing
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120, // Allows simultaneous lab computer & mobile device testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many caption requests from this network. Please wait a few minutes before trying again.'
  }
});

/**
 * Helper function to validate caption generation payload (topic, photo/video, and options)
 */
function validateCaptionInput(data) {
  const { topic, image, platform, tone, language, length, includeHashtags } = data;

  const hasTopic = topic && typeof topic === 'string' && topic.trim().length > 0;
  const hasImage = image && typeof image === 'object' && image.data && image.mediaType;

  if (!hasTopic && !hasImage) {
    return 'Please enter a topic description or upload a photo or video to generate captions.';
  }

  if (hasTopic) {
    const trimmedTopic = topic.trim();
    if (trimmedTopic.length < MIN_TOPIC_LENGTH && !hasImage) {
      return `Topic must be at least ${MIN_TOPIC_LENGTH} characters long.`;
    }
    if (trimmedTopic.length > MAX_TOPIC_LENGTH) {
      return `Topic cannot exceed ${MAX_TOPIC_LENGTH} characters. Currently ${trimmedTopic.length} characters.`;
    }
  }

  if (hasImage) {
    if (!ALLOWED_IMAGE_TYPES.includes(image.mediaType)) {
      return `Invalid media frame format (${image.mediaType}). Allowed formats: JPG, PNG, WEBP, GIF.`;
    }
    if (typeof image.data !== 'string' || image.data.length < 50) {
      return 'Invalid media data provided.';
    }
  }

  if (!platform || !ALLOWED_PLATFORMS.includes(platform)) {
    return `Invalid platform selected. Allowed: ${ALLOWED_PLATFORMS.join(', ')}`;
  }

  if (!tone || !ALLOWED_TONES.includes(tone)) {
    return `Invalid tone selected. Allowed: ${ALLOWED_TONES.join(', ')}`;
  }

  if (!language || !ALLOWED_LANGUAGES.includes(language)) {
    return `Invalid language selected. Allowed: ${ALLOWED_LANGUAGES.join(', ')}`;
  }

  if (!length || !ALLOWED_LENGTHS.includes(length)) {
    return `Invalid length selected. Allowed: ${ALLOWED_LENGTHS.join(', ')}`;
  }

  if (typeof includeHashtags !== 'boolean') {
    return 'includeHashtags must be a boolean (true or false).';
  }

  return null; // Valid
}

/**
 * Construct system instructions for Claude based on parameters
 */
function buildSystemPrompt() {
  return `You are a world-class social media strategist and copywriter.
Your task is to generate creative, natural, highly engaging, and platform-tailored social media captions.

Guidelines:
1. Adhere strictly to the requested platform conventions:
   - Instagram: Catchy hook in the first line, visual vibe, line breaks, tasteful emojis. Great for Reels and photo posts.
   - LinkedIn: Professional yet conversational, value-oriented, thought leadership or career insight, clean formatting.
   - X (Twitter): Sharp, punchy, strictly under 280 characters, strong hook or bold takeaway.
   - YouTube: High CTR style, enticing description, hook, community engagement prompt. Perfect for Shorts and Video descriptions.
   - Facebook: Warm, community-centered, relatable story, conversation-starter question.
2. Tone: Match the requested tone precisely (e.g., Funny, Professional, Friendly, Inspirational, Emotional, Casual, Promotional).
3. Language:
   - English: Natural, fluent, contemporary English.
   - Tamil: Authentic, grammatically natural Tamil script (தமிழ்).
   - Tanglish: Colloquial conversational Tamil written phonetically using the English/Latin alphabet (e.g. "Marina beach la sunset paaka semma vibe-ah irukku!").
4. Length:
   - Short: 1-2 punchy sentences (under 30 words, or under 140 chars for X).
   - Medium: 3-5 well-structured sentences with a hook and call-to-action (around 40-80 words).
   - Long: In-depth narrative/storytelling with paragraph breaks and compelling takeaways (around 100-180 words).
5. Hashtags:
   - If hashtags are requested: Provide 3 to 6 platform-relevant, trending hashtags.
   - If hashtags are NOT requested: DO NOT include any hashtags at all.
6. Visual & Media Analysis (when a photo or video frame is provided):
   - Analyze the visual elements, subject, scenery, colors, mood, atmosphere, and aesthetic.
   - If it is a video (Reels / TikTok / YouTube Shorts), create high-energy, scroll-stopping hooks in the first sentence with video-centric engagement (e.g., "Wait for it...", "Sound on 🔊", "Save this for later!").
   - Directly weave the visual details into the caption so it feels authentic to the specific photo or video.
7. Output format:
   You MUST respond ONLY with a valid JSON object. Do not include markdown code fences (\`\`\`json), explanations, or conversational filler.
   The JSON structure must match:
   {
     "captions": [
       {
         "id": 1,
         "title": "Hook & Story",
         "text": "The main caption text here (without hashtags)",
         "hashtags": ["#tag1", "#tag2"]
       }
     ]
   }`;
}

/**
 * Construct user prompt for batch generating 3 options
 */
function buildUserPrompt(params) {
  const { topic, platform, tone, language, length, includeHashtags, hasImage, isVideo, videoName, videoDuration } = params;

  const topicText = topic && typeof topic === 'string' ? topic.trim() : '';

  let contextDescription = '';
  if (hasImage && isVideo) {
    contextDescription = `- Uploaded Video Clip: "${videoName || 'Social Video'}" (${videoDuration ? `${videoDuration}s duration` : 'video clip'}).
- Video Scene Frame: An extracted representative video keyframe is attached. Analyze the motion context, scene, atmosphere, and visual action.
${topicText ? `- User Context / Notes: "${topicText}"` : ''}
- Video Style Guide: Craft scroll-stopping, high-engagement captions specifically tailored for video reels, shorts, or feed video posts!`;
  } else if (hasImage && topicText) {
    contextDescription = `- Attached Photo: Please analyze the attached photo.\n- User Context & Notes: "${topicText}"`;
  } else if (hasImage) {
    contextDescription = `- Attached Photo: Please visually analyze the attached photo and generate captions describing the scene, mood, and vibe.`;
  } else {
    contextDescription = `- Topic / Description: "${topicText}"`;
  }

  return `Generate exactly 3 DISTINCT caption options for the following requirements:

${contextDescription}
- Platform: ${platform}
- Tone: ${tone}
- Language: ${language} (Note: if Tanglish, write colloquial conversational Tamil in English alphabet)
- Length: ${length}
- Include Hashtags: ${includeHashtags ? 'YES (return them in the hashtags array)' : 'NO (return an empty array [])'}

Provide 3 diverse angles:
Option 1: Hook-driven & Storytelling
Option 2: Punchy, Direct & Relatable
Option 3: Question / High-engagement & Community CTA

Respond ONLY with valid JSON with the format:
{
  "captions": [
    { "id": 1, "title": "Hook & Story", "text": "...", "hashtags": [...] },
    { "id": 2, "title": "Punchy & Direct", "text": "...", "hashtags": [...] },
    { "id": 3, "title": "Question & Engagement", "text": "...", "hashtags": [...] }
  ]
}`;
}

/**
 * Parse Claude's response safely into JSON
 */
function parseClaudeJsonResponse(rawText) {
  // Strip code block markers if present
  let cleanText = rawText.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  cleanText = cleanText.trim();

  try {
    const parsed = JSON.parse(cleanText);
    if (parsed && Array.isArray(parsed.captions) && parsed.captions.length > 0) {
      return parsed.captions;
    }
    // If parsed is an array directly
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    throw new Error('JSON response does not contain captions array');
  } catch (err) {
    console.error('Failed to parse AI response as JSON:', rawText);
    throw new Error('AI returned an unexpected response format. Please try again.');
  }
}

/**
 * Get configured Anthropic API key with auto-reload if missing
 */
function getAnthropicApiKey() {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_API_KEY.trim()) {
    require('dotenv').config({ override: true });
  }
  return process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.trim() : '';
}

// Starting budget balance ($5.00 virtual credit for bootcamp practice)
const INITIAL_BALANCE = 5.00;

// Anthropic Claude token pricing per 1 Million tokens
// Prompt: $0.80 / 1M tokens ($0.00080 per 1K tokens)
// Completion: $4.00 / 1M tokens ($0.00400 per 1K tokens)
const TOKEN_PRICING = {
  inputPerMillion: 0.80,
  outputPerMillion: 4.00
};

/**
 * Calculate monetary cost for given tokens
 */
function calculateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1000000) * TOKEN_PRICING.inputPerMillion;
  const outputCost = (outputTokens / 1000000) * TOKEN_PRICING.outputPerMillion;
  const totalCost = inputCost + outputCost;
  return {
    inputCost,
    outputCost,
    totalCost
  };
}

// In-memory token & balance tracking across the active server session
const tokenUsageStats = {
  startingBalance: INITIAL_BALANCE,
  remainingBalance: INITIAL_BALANCE,
  totalCost: 0,
  totalRequests: 0,
  totalTokens: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  lastRequest: null
};

/**
 * Record token usage metrics and deduct cost from the $5.00 balance
 */
function recordTokenUsage(usage, model) {
  if (!usage) return;
  const inTok = usage.inputTokens || 0;
  const outTok = usage.outputTokens || 0;
  const totTok = usage.totalTokens || (inTok + outTok);
  const cost = calculateCost(inTok, outTok);

  tokenUsageStats.totalRequests += 1;
  tokenUsageStats.totalInputTokens += inTok;
  tokenUsageStats.totalOutputTokens += outTok;
  tokenUsageStats.totalTokens += totTok;
  tokenUsageStats.totalCost += cost.totalCost;
  tokenUsageStats.remainingBalance = Math.max(0, tokenUsageStats.startingBalance - tokenUsageStats.totalCost);

  tokenUsageStats.lastRequest = {
    inputTokens: inTok,
    outputTokens: outTok,
    totalTokens: totTok,
    cost: cost.totalCost,
    model: model,
    timestamp: new Date().toLocaleTimeString()
  };
}

/**
 * Handle Anthropic Claude API call with vision support, automatic model fallback, error handling and timeout
 */
async function callAnthropicApi(systemPrompt, userPrompt, image = null) {
  const apiKey = getAnthropicApiKey();

  if (!apiKey) {
    const error = new Error('ANTHROPIC_API_KEY_MISSING');
    error.statusCode = 503;
    throw error;
  }

  const primaryModel = (process.env.ANTHROPIC_MODEL && process.env.ANTHROPIC_MODEL.trim()) || 'claude-haiku-4-5-20251001';
  const modelCandidates = [
    primaryModel,
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-5-20250929',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307'
  ];
  const uniqueModels = [...new Set(modelCandidates)];

  const anthropic = new Anthropic({
    apiKey: apiKey,
    timeout: 25000 // 25 seconds timeout
  });

  // Construct message content array (supporting multimodal text + image)
  const messageContent = [];

  if (image && image.data && image.mediaType) {
    let cleanBase64 = image.data;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, '');

    messageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mediaType,
        data: cleanBase64
      }
    });
  }

  messageContent.push({
    type: 'text',
    text: userPrompt
  });

  let lastError = null;

  // Attempt generation with primary model, fallback on 404 not_found_error
  for (const modelToTry of uniqueModels) {
    try {
      const response = await anthropic.messages.create({
        model: modelToTry,
        max_tokens: 1500,
        temperature: 0.75,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ]
      });

      if (response && response.content && response.content.length > 0) {
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        const totalTokens = inputTokens + outputTokens;

        return {
          text: response.content[0].text,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens
          },
          modelUsed: modelToTry
        };
      }
    } catch (err) {
      lastError = err;
      // If model not found (404), try next supported model
      if (err.status === 404 || (err.message && err.message.includes('not_found_error'))) {
        console.warn(`[Model Fallback]: Model '${modelToTry}' unavailable (404). Trying next model...`);
        continue;
      }
      // For any other error (e.g. 401 invalid key, 429 rate limit), throw immediately
      throw err;
    }
  }

  throw lastError || new Error('Failed to generate response with available AI models.');
}

/**
 * Convert technical errors into safe, user-friendly messages
 */
function mapErrorToUserFriendlyMessage(error) {
  console.error('[API Error Details]:', error.message || error);

  if (error.message === 'ANTHROPIC_API_KEY_MISSING') {
    return {
      status: 503,
      message: 'Anthropic API key is not configured. Please add your ANTHROPIC_API_KEY in the .env file in the project root to enable AI caption generation.'
    };
  }

  // Anthropic API error status codes
  if (error.status === 401 || (error.message && error.message.includes('401'))) {
    return {
      status: 401,
      message: 'Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY credentials in the .env file.'
    };
  }

  if (error.status === 429 || (error.message && error.message.includes('rate_limit'))) {
    return {
      status: 429,
      message: 'Anthropic Claude API rate limit exceeded. Please wait a few moments and try again.'
    };
  }

  if (error.status === 529 || error.status === 500) {
    return {
      status: 503,
      message: 'The Claude AI service is currently busy or experiencing high traffic. Please try again in a few seconds.'
    };
  }

  if (error.name === 'APIConnectionTimeoutError' || error.message.includes('timeout')) {
    return {
      status: 504,
      message: 'The AI request timed out. Please check your network connection and try again.'
    };
  }

  return {
    status: 500,
    message: error.message || 'An unexpected error occurred while generating captions. Please try again.'
  };
}

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

/**
 * Health check endpoint: verifies server status, API key status, and active token metrics
 */
app.get('/api/health', (req, res) => {
  const apiKey = getAnthropicApiKey();
  const hasApiKey = Boolean(apiKey && apiKey.trim());
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    apiKeyConfigured: hasApiKey,
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    tokenStats: tokenUsageStats
  });
});

/**
 * Helper to discover local Wi-Fi / LAN IP address for mobile & lab computer access
 */
function getLocalNetworkIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      const ifaceList = interfaces[devName];
      if (!ifaceList) continue;
      for (let i = 0; i < ifaceList.length; i++) {
        const alias = ifaceList[i];
        if (alias.family === 'IPv4' && !alias.internal && alias.address !== '127.0.0.1') {
          return alias.address;
        }
      }
    }
  } catch (e) {
    console.warn('Could not determine local network IP:', e);
  }
  return 'localhost';
}

/**
 * GET /api/network-info
 * Returns local machine and network IP / URLs for connecting mobile phones and lab computers
 */
app.get('/api/network-info', (req, res) => {
  const localIp = getLocalNetworkIp();
  res.json({
    success: true,
    port: PORT,
    localIp: localIp,
    localUrl: `http://localhost:${PORT}`,
    networkUrl: `http://${localIp}:${PORT}`
  });
});

/**
 * GET /api/token-usage
 * Returns current cumulative token consumption statistics
 */
app.get('/api/token-usage', (req, res) => {
  res.json({
    success: true,
    tokenStats: tokenUsageStats
  });
});

/**
 * POST /api/reset-token-usage
 * Allows resetting the credit balance back to $5.00 and clearing token counters
 */
app.post('/api/reset-token-usage', (req, res) => {
  tokenUsageStats.startingBalance = INITIAL_BALANCE;
  tokenUsageStats.remainingBalance = INITIAL_BALANCE;
  tokenUsageStats.totalCost = 0;
  tokenUsageStats.totalRequests = 0;
  tokenUsageStats.totalTokens = 0;
  tokenUsageStats.totalInputTokens = 0;
  tokenUsageStats.totalOutputTokens = 0;
  tokenUsageStats.lastRequest = null;

  res.json({
    success: true,
    message: 'Balance reset back to $5.00 successfully.',
    tokenStats: tokenUsageStats
  });
});

/**
 * POST /api/generate-captions
 * Generates 3 distinct caption options (supporting both text prompts and photo uploads)
 */
app.post('/api/generate-captions', apiLimiter, async (req, res) => {
  try {
    if (tokenUsageStats.remainingBalance <= 0) {
      return res.status(402).json({
        success: false,
        error: 'Your $5.00 credit balance has been exhausted ($0.000 remaining). Please click "Reset to $5.00" on the dashboard to refill your credit.'
      });
    }

    const validationError = validateCaptionInput(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const { topic, image, platform, tone, language, length, includeHashtags } = req.body;

    const isVideo = Boolean(image && image.isVideo);
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      topic,
      platform,
      tone,
      language,
      length,
      includeHashtags,
      hasImage: Boolean(image && image.data),
      isVideo,
      videoName: image?.videoName,
      videoDuration: image?.videoDuration
    });

    const aiResult = await callAnthropicApi(systemPrompt, userPrompt, image);
    const captions = parseClaudeJsonResponse(aiResult.text);

    // Record token usage stats and deduct from $5.00 balance
    recordTokenUsage(aiResult.usage, aiResult.modelUsed);
    const requestCost = calculateCost(aiResult.usage?.inputTokens || 0, aiResult.usage?.outputTokens || 0);

    // Format captions and guarantee 3 options with proper IDs
    const formattedCaptions = captions.slice(0, 3).map((item, index) => ({
      id: index + 1,
      title: item.title || `Option ${index + 1}`,
      text: (item.text || '').trim(),
      hashtags: includeHashtags && Array.isArray(item.hashtags) ? item.hashtags : []
    }));

    return res.json({
      success: true,
      platform,
      tone,
      language,
      hasImage: Boolean(image && image.data),
      isVideo,
      mediaName: image?.videoName || image?.name || null,
      captions: formattedCaptions,
      usage: {
        ...aiResult.usage,
        cost: requestCost.totalCost
      },
      sessionUsage: tokenUsageStats
    });
  } catch (error) {
    const friendly = mapErrorToUserFriendlyMessage(error);
    return res.status(friendly.status).json({
      success: false,
      error: friendly.message
    });
  }
});

/**
 * POST /api/regenerate-caption
 * Regenerates a single fresh caption option for a specific card
 */
app.post('/api/regenerate-caption', apiLimiter, async (req, res) => {
  try {
    if (tokenUsageStats.remainingBalance <= 0) {
      return res.status(402).json({
        success: false,
        error: 'Your $5.00 credit balance has been exhausted ($0.000 remaining). Please click "Reset to $5.00" on the dashboard to refill your credit.'
      });
    }

    const validationError = validateCaptionInput(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const { topic, image, platform, tone, language, length, includeHashtags, cardId, previousCaptionText } = req.body;

    const isVideo = Boolean(image && image.isVideo);
    const systemPrompt = buildSystemPrompt();
    const topicText = topic && typeof topic === 'string' ? topic.trim() : '';
    const hasImage = Boolean(image && image.data);
    let contextDesc = '';
    if (hasImage && isVideo) {
      contextDesc = `Uploaded Video Clip ("${image.videoName || 'Social Video'}", ${image.videoDuration ? `${image.videoDuration}s duration` : 'clip'}). Keyframe attached.${topicText ? ` Context notes: "${topicText}"` : ''}`;
    } else if (hasImage) {
      contextDesc = `Attached Photo: Please visually examine the attached photo.${topicText ? ` Context notes: "${topicText}"` : ''}`;
    } else {
      contextDesc = `Topic / Description: "${topicText}"`;
    }

    const userPrompt = `Generate ONE new, fresh, creative caption option for the following requirements:

- ${contextDesc}
- Platform: ${platform}
- Tone: ${tone}
- Language: ${language}
- Length: ${length}
- Include Hashtags: ${includeHashtags ? 'YES' : 'NO'}
${previousCaptionText ? `- Previous variation to avoid repeating: "${previousCaptionText.substring(0, 100)}..."` : ''}

Respond ONLY with valid JSON format:
{
  "captions": [
    {
      "id": ${Number(cardId) || 1},
      "title": "Fresh Alternative",
      "text": "The fresh caption text",
      "hashtags": ${includeHashtags ? '["#tag1", "#tag2"]' : '[]'}
    }
  ]
}`;

    const aiResult = await callAnthropicApi(systemPrompt, userPrompt, image);
    const captions = parseClaudeJsonResponse(aiResult.text);
    const singleCaption = captions[0];

    // Record token usage stats
    recordTokenUsage(aiResult.usage, aiResult.modelUsed);
    const regenCost = calculateCost(aiResult.usage?.inputTokens || 0, aiResult.usage?.outputTokens || 0);

    return res.json({
      success: true,
      caption: {
        id: Number(cardId) || 1,
        title: singleCaption.title || 'Fresh Alternative',
        text: (singleCaption.text || '').trim(),
        hashtags: includeHashtags && Array.isArray(singleCaption.hashtags) ? singleCaption.hashtags : []
      },
      usage: {
        ...aiResult.usage,
        cost: regenCost.totalCost
      },
      sessionUsage: tokenUsageStats
    });
  } catch (error) {
    const friendly = mapErrorToUserFriendlyMessage(error);
    return res.status(friendly.status).json({
      success: false,
      error: friendly.message
    });
  }
});

// Fallback 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found.'
  });
});

// Start Express server on 0.0.0.0 so all mobile devices & lab PCs on Wi-Fi / LAN can access
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalNetworkIp();
  console.log(`====================================================`);
  console.log(` AI Social Media Caption Generator Server Running!`);
  console.log(` > Local:   http://localhost:${PORT}`);
  console.log(` > Network: http://${localIp}:${PORT}  (Open on any Mobile or Lab PC)`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Anthropic Model: ${process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'}`);
  console.log(` API Key Status: ${process.env.ANTHROPIC_API_KEY ? 'Configured [OK]' : 'MISSING - Set ANTHROPIC_API_KEY in .env'}`);
  console.log(`====================================================`);
});
