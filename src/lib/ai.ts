// AI abstraction layer for ChatGPT-compatible APIs
import { AIPreferences, AITopic, Article, ArticleMetadata } from './storage';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletion {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Make an AI API call
async function callAI(
  preferences: AIPreferences,
  messages: ChatMessage[],
  maxTokens: number = 1000
): Promise<string> {
  if (!preferences.apiKey) {
    throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
  }

  const response = await fetch(`${preferences.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${preferences.apiKey}`,
    },
    body: JSON.stringify({
      model: preferences.model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data: ChatCompletion = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Summarize an article
export async function aiSummarizeArticle(
  preferences: AIPreferences,
  title: string,
  content: string
): Promise<{ short: string; detailed: string }> {
  const truncatedContent = content.substring(0, 8000); // Limit content length

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a helpful assistant that summarizes articles. Provide clear, concise summaries.`,
    },
    {
      role: 'user',
      content: `Summarize this article:

Title: ${title}

Content:
${truncatedContent}

Provide two summaries:
1. SHORT: A 1-2 sentence TL;DR
2. DETAILED: 3-5 bullet points with key information

Format your response as:
SHORT: [your short summary]
DETAILED:
• [point 1]
• [point 2]
• [point 3]`,
    },
  ];

  const response = await callAI(preferences, messages, 500);
  
  // Parse response
  const shortMatch = response.match(/SHORT:\s*(.+?)(?=DETAILED:|$)/s);
  const detailedMatch = response.match(/DETAILED:\s*(.+)/s);

  return {
    short: shortMatch?.[1]?.trim() || 'Summary unavailable',
    detailed: detailedMatch?.[1]?.trim() || 'Details unavailable',
  };
}

// Classify articles against AI topics
export async function aiClassifyArticles(
  preferences: AIPreferences,
  articles: Array<{ id: string; title: string; summary: string }>,
  topics: AITopic[]
): Promise<Record<string, { labels: string[]; score: number }>> {
  if (articles.length === 0 || topics.length === 0) {
    return {};
  }

  const topicsDescription = topics.map(t => 
    `- "${t.name}" (${t.type}): ${t.description}. Keywords: ${[...t.criteria.mustContain, ...t.criteria.shouldContain].join(', ')}`
  ).join('\n');

  // Process in batches of 10 articles
  const results: Record<string, { labels: string[]; score: number }> = {};
  const batchSize = 10;

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    
    const articlesText = batch.map((a, idx) => 
      `[${idx + 1}] "${a.title}"\n${a.summary.substring(0, 200)}`
    ).join('\n\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an AI assistant that classifies news articles into topics. Be precise and only match articles that clearly relate to the topic.`,
      },
      {
        role: 'user',
        content: `Classify these articles into the following topics:

TOPICS:
${topicsDescription}

ARTICLES:
${articlesText}

For each article, respond with the article number, matching topic names (comma-separated, or "none"), and a relevance score (0-100).
Format: [number]: topics | score

Example:
[1]: AI Research, Cybersecurity Breaches | 85
[2]: none | 0`,
      },
    ];

    try {
      const response = await callAI(preferences, messages, 500);
      
      // Parse response
      const lines = response.split('\n').filter(l => l.trim().startsWith('['));
      
      for (const line of lines) {
        const match = line.match(/\[(\d+)\]:\s*(.+?)\s*\|\s*(\d+)/);
        if (match) {
          const idx = parseInt(match[1]) - 1;
          const topicsStr = match[2].trim();
          const score = parseInt(match[3]);
          
          if (idx >= 0 && idx < batch.length) {
            const articleId = batch[idx].id;
            const labels = topicsStr.toLowerCase() === 'none' 
              ? [] 
              : topicsStr.split(',').map(t => t.trim()).filter(Boolean);
            
            results[articleId] = { labels, score };
          }
        }
      }
    } catch (error) {
      console.error('AI classification error:', error);
    }
  }

  return results;
}

// Detect duplicate articles
export async function aiDetectDuplicates(
  preferences: AIPreferences,
  articles: Array<{ id: string; title: string; url: string }>
): Promise<Array<{ ids: string[]; primaryId: string }>> {
  if (articles.length < 2) return [];

  // First, use heuristics to group potentially similar articles
  const groups: Map<string, typeof articles> = new Map();
  
  for (const article of articles) {
    // Normalize title for comparison
    const normalizedTitle = article.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .sort()
      .join(' ');
    
    // Use first 5 significant words as key
    const key = normalizedTitle.split(' ').slice(0, 5).join(' ');
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(article);
  }

  // Filter groups with potential duplicates
  const potentialDuplicates = Array.from(groups.values()).filter(g => g.length > 1);
  
  if (potentialDuplicates.length === 0) return [];

  // Use AI to confirm duplicates
  const results: Array<{ ids: string[]; primaryId: string }> = [];

  for (const group of potentialDuplicates.slice(0, 10)) { // Limit AI calls
    const articlesText = group.map((a, idx) => 
      `[${idx + 1}] "${a.title}"`
    ).join('\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You identify duplicate news articles that cover the same story. Articles are duplicates if they report on the exact same event or news.`,
      },
      {
        role: 'user',
        content: `Are these articles duplicates (covering the same story)?

${articlesText}

If they are duplicates, respond: DUPLICATES: [numbers of duplicate articles]
If they are NOT duplicates, respond: NOT_DUPLICATES

Choose the best/most comprehensive article as primary (first in your list).`,
      },
    ];

    try {
      const response = await callAI(preferences, messages, 100);
      
      if (response.includes('DUPLICATES:')) {
        const numbersMatch = response.match(/DUPLICATES:\s*([\d,\s]+)/);
        if (numbersMatch) {
          const numbers = numbersMatch[1].match(/\d+/g)?.map(n => parseInt(n)) || [];
          const ids = numbers
            .map(n => group[n - 1]?.id)
            .filter(Boolean) as string[];
          
          if (ids.length > 1) {
            results.push({ ids, primaryId: ids[0] });
          }
        }
      }
    } catch (error) {
      console.error('AI duplicate detection error:', error);
    }
  }

  return results;
}

// Check if article should be muted
export async function aiCheckMuted(
  preferences: AIPreferences,
  article: { title: string; summary: string },
  muteKeywords: string[]
): Promise<boolean> {
  // First, simple keyword check
  const lowerTitle = article.title.toLowerCase();
  const lowerSummary = article.summary.toLowerCase();
  
  for (const keyword of muteKeywords) {
    if (lowerTitle.includes(keyword.toLowerCase()) || 
        lowerSummary.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  // AI check for more nuanced muting (optional, for edge cases)
  // Skip for now to reduce API calls
  return false;
}

// Answer questions about articles
export async function aiExplainTopic(
  preferences: AIPreferences,
  question: string,
  articles: Array<{ title: string; summary: string }>
): Promise<string> {
  const articlesContext = articles.slice(0, 10).map((a, idx) => 
    `[${idx + 1}] ${a.title}\n${a.summary.substring(0, 300)}`
  ).join('\n\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a helpful assistant that answers questions based on provided news articles. 
Cite articles by their number when relevant. Be concise but thorough.
If the articles don't contain enough information to answer, say so.`,
    },
    {
      role: 'user',
      content: `Based on these articles:

${articlesContext}

Question: ${question}`,
    },
  ];

  return await callAI(preferences, messages, 800);
}

// Explain article for beginners
export async function aiExplainArticle(
  preferences: AIPreferences,
  title: string,
  content: string,
  mode: 'beginner' | 'risks-opportunities'
): Promise<string> {
  const truncatedContent = content.substring(0, 6000);

  const prompts = {
    beginner: `Explain this article as if I'm a beginner who doesn't know the technical terms. Use simple language and analogies.`,
    'risks-opportunities': `Analyze this article and identify the key risks and opportunities mentioned. Format as:

RISKS:
• [risk 1]
• [risk 2]

OPPORTUNITIES:
• [opportunity 1]
• [opportunity 2]`,
  };

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a helpful assistant that explains complex topics clearly.`,
    },
    {
      role: 'user',
      content: `Article: ${title}

${truncatedContent}

${prompts[mode]}`,
    },
  ];

  return await callAI(preferences, messages, 600);
}

// Test API connection
export async function testAIConnection(preferences: AIPreferences): Promise<{ success: boolean; error?: string }> {
  try {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Say "Connection successful!" and nothing else.' },
    ];
    
    const response = await callAI(preferences, messages, 20);
    return { success: response.toLowerCase().includes('success') || response.length > 0 };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}
