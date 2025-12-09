// Storage abstraction layer for localStorage/IndexedDB
// Using localStorage for simplicity, with IndexedDB as future enhancement

const STORAGE_KEY = 'feedlyCloneData';
const SCHEMA_VERSION = 1;

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
  settings: ProfileSettings;
}

export interface ProfileSettings {
  defaultView: 'today' | 'priority' | 'all';
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  fetchInterval: number; // minutes
  maxArticlesPerSource: number;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  siteUrl: string;
  type: 'rss' | 'atom' | 'json' | 'website';
  folderId: string | null;
  tags: string[];
  createdAt: string;
  lastFetchedAt: string | null;
  fetchError: string | null;
  favicon?: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  order: number;
}

export interface Article {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  contentHtml: string;
  contentText: string;
  summary: string;
  publishedAt: string;
  author: string | null;
  categories: string[];
  imageUrl?: string;
}

export interface ArticleMetadata {
  id: string;
  isRead: boolean;
  isSaved: boolean;
  isMuted: boolean;
  priorityScore: number;
  labels: string[];
  aiLabels: string[];
  lastViewedAt: string | null;
  duplicateGroupId: string | null;
  isPrimary: boolean;
  aiSummaryShort: string | null;
  aiSummaryDetailed: string | null;
}

export interface AITopic {
  id: string;
  name: string;
  description: string;
  type: 'topic' | 'company' | 'keyword' | 'trend' | 'threat';
  criteria: {
    mustContain: string[];
    shouldContain: string[];
    mustNotContain: string[];
  };
  positiveExamples: string[];
  negativeExamples: string[];
  createdAt: string;
}

export interface MuteRule {
  id: string;
  keywords: string[];
  sourceIds: string[];
  description: string;
  isActive: boolean;
}

export interface AIPreferences {
  apiKey: string;
  baseUrl: string;
  model: string;
  enableTopicPrioritization: boolean;
  enableDeduplication: boolean;
  enableAutoSummaries: boolean;
}

export interface AppData {
  schemaVersion: number;
  profiles: Profile[];
  currentProfileId: string | null;
  sources: Source[];
  folders: Folder[];
  articles: Article[];
  articlesMetadata: Record<string, ArticleMetadata>;
  aiTopics: AITopic[];
  muteRules: MuteRule[];
  aiPreferences: AIPreferences;
}

const defaultAIPreferences: AIPreferences = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  enableTopicPrioritization: true,
  enableDeduplication: true,
  enableAutoSummaries: false,
};

const defaultProfileSettings: ProfileSettings = {
  defaultView: 'today',
  theme: 'system',
  fontSize: 'medium',
  layoutDensity: 'comfortable',
  fetchInterval: 20,
  maxArticlesPerSource: 500,
};

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultData(): AppData {
  const defaultProfileId = generateId();
  
  // Default folders
  const folders: Folder[] = [
    { id: generateId(), name: 'Tech', color: '#10b981', order: 0 },
    { id: generateId(), name: 'Security', color: '#ef4444', order: 1 },
    { id: generateId(), name: 'World News', color: '#3b82f6', order: 2 },
  ];

  // Default sources (example RSS feeds)
  const sources: Source[] = [
    {
      id: generateId(),
      title: 'Hacker News',
      url: 'https://hnrss.org/frontpage',
      siteUrl: 'https://news.ycombinator.com',
      type: 'rss',
      folderId: folders[0].id,
      tags: ['tech', 'startups'],
      createdAt: new Date().toISOString(),
      lastFetchedAt: null,
      fetchError: null,
    },
    {
      id: generateId(),
      title: 'TechCrunch',
      url: 'https://techcrunch.com/feed/',
      siteUrl: 'https://techcrunch.com',
      type: 'rss',
      folderId: folders[0].id,
      tags: ['tech', 'news'],
      createdAt: new Date().toISOString(),
      lastFetchedAt: null,
      fetchError: null,
    },
    {
      id: generateId(),
      title: 'Krebs on Security',
      url: 'https://krebsonsecurity.com/feed/',
      siteUrl: 'https://krebsonsecurity.com',
      type: 'rss',
      folderId: folders[1].id,
      tags: ['security', 'cybersecurity'],
      createdAt: new Date().toISOString(),
      lastFetchedAt: null,
      fetchError: null,
    },
    {
      id: generateId(),
      title: 'BBC News',
      url: 'https://feeds.bbci.co.uk/news/rss.xml',
      siteUrl: 'https://www.bbc.com/news',
      type: 'rss',
      folderId: folders[2].id,
      tags: ['news', 'world'],
      createdAt: new Date().toISOString(),
      lastFetchedAt: null,
      fetchError: null,
    },
  ];

  // Default AI Topics
  const aiTopics: AITopic[] = [
    {
      id: generateId(),
      name: 'Cybersecurity Breaches',
      description: 'Data breaches, hacks, and security incidents',
      type: 'threat',
      criteria: {
        mustContain: ['breach', 'hack', 'vulnerability', 'exploit'],
        shouldContain: ['data', 'security', 'attack', 'ransomware'],
        mustNotContain: [],
      },
      positiveExamples: [],
      negativeExamples: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: 'AI Research',
      description: 'Artificial intelligence and machine learning developments',
      type: 'topic',
      criteria: {
        mustContain: ['AI', 'artificial intelligence', 'machine learning', 'LLM'],
        shouldContain: ['model', 'neural', 'GPT', 'training'],
        mustNotContain: [],
      },
      positiveExamples: [],
      negativeExamples: [],
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    profiles: [
      {
        id: defaultProfileId,
        name: 'My Feed',
        createdAt: new Date().toISOString(),
        settings: defaultProfileSettings,
      },
    ],
    currentProfileId: defaultProfileId,
    sources,
    folders,
    articles: [],
    articlesMetadata: {},
    aiTopics,
    muteRules: [],
    aiPreferences: defaultAIPreferences,
  };
}

function migrateData(data: AppData): AppData {
  // Add migration logic here as schema evolves
  if (data.schemaVersion < SCHEMA_VERSION) {
    // Perform migrations
    data.schemaVersion = SCHEMA_VERSION;
  }
  return data;
}

export function loadData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const defaultData = getDefaultData();
      saveData(defaultData);
      return defaultData;
    }
    
    let data = JSON.parse(stored) as AppData;
    data = migrateData(data);
    return data;
  } catch (error) {
    console.error('Error loading data:', error);
    const defaultData = getDefaultData();
    saveData(defaultData);
    return defaultData;
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

export function exportData(): string {
  const data = loadData();
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString) as AppData;
    if (typeof data.schemaVersion !== 'number') {
      throw new Error('Invalid data format');
    }
    saveData(migrateData(data));
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

export function resetData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function clearAICache(data: AppData): AppData {
  const clearedMetadata: Record<string, ArticleMetadata> = {};
  
  for (const [id, meta] of Object.entries(data.articlesMetadata)) {
    clearedMetadata[id] = {
      ...meta,
      aiLabels: [],
      priorityScore: 0,
      aiSummaryShort: null,
      aiSummaryDetailed: null,
      duplicateGroupId: null,
      isPrimary: true,
    };
  }
  
  return {
    ...data,
    articlesMetadata: clearedMetadata,
  };
}
