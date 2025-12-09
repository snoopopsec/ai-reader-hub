// Application state management
import { create } from 'zustand';
import { 
  AppData, 
  Profile, 
  Source, 
  Folder, 
  Article, 
  ArticleMetadata, 
  AITopic,
  MuteRule,
  AIPreferences,
  loadData, 
  saveData, 
  generateId,
  clearAICache as clearAICacheStorage
} from './storage';

export type ViewType = 'today' | 'priority' | 'all' | 'saved' | 'folder' | 'source' | 'topic' | 'search' | 'muted';

interface AppState extends AppData {
  // UI State
  currentView: ViewType;
  currentFolderId: string | null;
  currentSourceId: string | null;
  currentTopicId: string | null;
  currentArticleId: string | null;
  searchQuery: string;
  isLoading: boolean;
  sidebarCollapsed: boolean;
  
  // Actions
  init: () => void;
  
  // Profile actions
  createProfile: (name: string) => void;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  switchProfile: (id: string) => void;
  
  // Source actions
  addSource: (source: Omit<Source, 'id' | 'createdAt' | 'lastFetchedAt' | 'fetchError'>) => Source;
  updateSource: (id: string, updates: Partial<Source>) => void;
  deleteSource: (id: string) => void;
  setSourceError: (id: string, error: string | null) => void;
  
  // Folder actions
  addFolder: (name: string, color: string) => Folder;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  
  // Article actions
  addArticles: (articles: Article[]) => void;
  getArticleMetadata: (id: string) => ArticleMetadata;
  updateArticleMetadata: (id: string, updates: Partial<ArticleMetadata>) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  toggleSaved: (id: string) => void;
  markAllAsRead: (articleIds: string[]) => void;
  
  // AI Topic actions
  addTopic: (topic: Omit<AITopic, 'id' | 'createdAt' | 'positiveExamples' | 'negativeExamples'>) => AITopic;
  updateTopic: (id: string, updates: Partial<AITopic>) => void;
  deleteTopic: (id: string) => void;
  addTopicFeedback: (topicId: string, articleId: string, positive: boolean) => void;
  
  // Mute rule actions
  addMuteRule: (rule: Omit<MuteRule, 'id'>) => MuteRule;
  updateMuteRule: (id: string, updates: Partial<MuteRule>) => void;
  deleteMuteRule: (id: string) => void;
  
  // AI Preferences
  updateAIPreferences: (updates: Partial<AIPreferences>) => void;
  clearAICache: () => void;
  
  // Navigation
  setView: (view: ViewType, id?: string) => void;
  setCurrentArticle: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
  
  // Data
  importData: (data: AppData) => void;
  exportData: () => string;
  resetData: () => void;
}

// Default article metadata
function getDefaultMetadata(articleId: string): ArticleMetadata {
  return {
    id: articleId,
    isRead: false,
    isSaved: false,
    isMuted: false,
    priorityScore: 0,
    labels: [],
    aiLabels: [],
    lastViewedAt: null,
    duplicateGroupId: null,
    isPrimary: true,
    aiSummaryShort: null,
    aiSummaryDetailed: null,
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  schemaVersion: 1,
  profiles: [],
  currentProfileId: null,
  sources: [],
  folders: [],
  articles: [],
  articlesMetadata: {},
  aiTopics: [],
  muteRules: [],
  aiPreferences: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    enableTopicPrioritization: true,
    enableDeduplication: true,
    enableAutoSummaries: false,
  },
  
  // UI State
  currentView: 'today',
  currentFolderId: null,
  currentSourceId: null,
  currentTopicId: null,
  currentArticleId: null,
  searchQuery: '',
  isLoading: false,
  sidebarCollapsed: false,

  // Initialize from storage
  init: () => {
    const data = loadData();
    const profile = data.profiles.find(p => p.id === data.currentProfileId);
    set({
      ...data,
      currentView: profile?.settings.defaultView || 'today',
    });
  },

  // Profile actions
  createProfile: (name) => {
    const newProfile: Profile = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      settings: {
        defaultView: 'today',
        theme: 'system',
        fontSize: 'medium',
        layoutDensity: 'comfortable',
        fetchInterval: 20,
        maxArticlesPerSource: 500,
      },
    };
    
    set(state => {
      const newState = {
        profiles: [...state.profiles, newProfile],
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  updateProfile: (id, updates) => {
    set(state => {
      const newState = {
        profiles: state.profiles.map(p => 
          p.id === id ? { ...p, ...updates } : p
        ),
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  deleteProfile: (id) => {
    set(state => {
      const remaining = state.profiles.filter(p => p.id !== id);
      const newState = {
        profiles: remaining,
        currentProfileId: state.currentProfileId === id 
          ? remaining[0]?.id || null 
          : state.currentProfileId,
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  switchProfile: (id) => {
    set(state => {
      const newState = { currentProfileId: id };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  // Source actions
  addSource: (source) => {
    const newSource: Source = {
      ...source,
      id: generateId(),
      createdAt: new Date().toISOString(),
      lastFetchedAt: null,
      fetchError: null,
    };
    
    set(state => {
      const newState = {
        sources: [...state.sources, newSource],
      };
      saveData({ ...state, ...newState });
      return newState;
    });
    
    return newSource;
  },

  updateSource: (id, updates) => {
    set(state => {
      const newState = {
        sources: state.sources.map(s => 
          s.id === id ? { ...s, ...updates } : s
        ),
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  deleteSource: (id) => {
    set(state => {
      const newState = {
        sources: state.sources.filter(s => s.id !== id),
        articles: state.articles.filter(a => a.sourceId !== id),
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  setSourceError: (id, error) => {
    get().updateSource(id, { fetchError: error });
  },

  // Folder actions
  addFolder: (name, color) => {
    const maxOrder = Math.max(0, ...get().folders.map(f => f.order));
    const newFolder: Folder = {
      id: generateId(),
      name,
      color,
      order: maxOrder + 1,
    };
    
    set(state => {
      const newState = {
        folders: [...state.folders, newFolder],
      };
      saveData({ ...state, ...newState });
      return newState;
    });
    
    return newFolder;
  },

  updateFolder: (id, updates) => {
    set(state => {
      const newState = {
        folders: state.folders.map(f => 
          f.id === id ? { ...f, ...updates } : f
        ),
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  deleteFolder: (id) => {
    set(state => {
      const newState = {
        folders: state.folders.filter(f => f.id !== id),
        sources: state.sources.map(s => 
          s.folderId === id ? { ...s, folderId: null } : s
        ),
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  // Article actions
  addArticles: (newArticles) => {
    set(state => {
      // Merge new articles, avoiding duplicates
      const existingIds = new Set(state.articles.map(a => a.id));
      const uniqueNew = newArticles.filter(a => !existingIds.has(a.id));
      
      // Limit articles per source
      const profile = state.profiles.find(p => p.id === state.currentProfileId);
      const maxPerSource = profile?.settings.maxArticlesPerSource || 500;
      
      const allArticles = [...uniqueNew, ...state.articles];
      
      // Group by source and limit
      const bySource = new Map<string, Article[]>();
      for (const article of allArticles) {
        if (!bySource.has(article.sourceId)) {
          bySource.set(article.sourceId, []);
        }
        bySource.get(article.sourceId)!.push(article);
      }
      
      const limitedArticles: Article[] = [];
      for (const articles of bySource.values()) {
        // Sort by date and take newest
        articles.sort((a, b) => 
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        limitedArticles.push(...articles.slice(0, maxPerSource));
      }
      
      const newState = {
        articles: limitedArticles,
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  getArticleMetadata: (id) => {
    const state = get();
    return state.articlesMetadata[id] || getDefaultMetadata(id);
  },

  updateArticleMetadata: (id, updates) => {
    set(state => {
      const existing = state.articlesMetadata[id] || getDefaultMetadata(id);
      const newState = {
        articlesMetadata: {
          ...state.articlesMetadata,
          [id]: { ...existing, ...updates },
        },
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  markAsRead: (id) => {
    get().updateArticleMetadata(id, { 
      isRead: true, 
      lastViewedAt: new Date().toISOString() 
    });
  },

  markAsUnread: (id) => {
    get().updateArticleMetadata(id, { isRead: false });
  },

  toggleSaved: (id) => {
    const metadata = get().getArticleMetadata(id);
    get().updateArticleMetadata(id, { isSaved: !metadata.isSaved });
  },

  markAllAsRead: (articleIds) => {
    set(state => {
      const updates: Record<string, ArticleMetadata> = {};
      const now = new Date().toISOString();
      
      for (const id of articleIds) {
        const existing = state.articlesMetadata[id] || getDefaultMetadata(id);
        updates[id] = { ...existing, isRead: true, lastViewedAt: now };
      }
      
      const newState = {
        articlesMetadata: { ...state.articlesMetadata, ...updates },
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  // AI Topic actions
  addTopic: (topic) => {
    const newTopic: AITopic = {
      ...topic,
      id: generateId(),
      createdAt: new Date().toISOString(),
      positiveExamples: [],
      negativeExamples: [],
    };
    
    set(state => {
      const newState = {
        aiTopics: [...state.aiTopics, newTopic],
      };
      saveData({ ...state, ...newState });
      return newState;
    });
    
    return newTopic;
  },

  updateTopic: (id, updates) => {
    set(state => {
      const newState = {
        aiTopics: state.aiTopics.map(t => 
          t.id === id ? { ...t, ...updates } : t
        ),
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  deleteTopic: (id) => {
    set(state => {
      const newState = {
        aiTopics: state.aiTopics.filter(t => t.id !== id),
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  addTopicFeedback: (topicId, articleId, positive) => {
    const state = get();
    const topic = state.aiTopics.find(t => t.id === topicId);
    if (!topic) return;
    
    const updates: Partial<AITopic> = positive
      ? { positiveExamples: [...topic.positiveExamples.slice(-9), articleId] }
      : { negativeExamples: [...topic.negativeExamples.slice(-9), articleId] };
    
    get().updateTopic(topicId, updates);
  },

  // Mute rule actions
  addMuteRule: (rule) => {
    const newRule: MuteRule = {
      ...rule,
      id: generateId(),
    };
    
    set(state => {
      const newState = {
        muteRules: [...state.muteRules, newRule],
      };
      saveData({ ...state, ...newState });
      return newState;
    });
    
    return newRule;
  },

  updateMuteRule: (id, updates) => {
    set(state => {
      const newState = {
        muteRules: state.muteRules.map(r => 
          r.id === id ? { ...r, ...updates } : r
        ),
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  deleteMuteRule: (id) => {
    set(state => {
      const newState = {
        muteRules: state.muteRules.filter(r => r.id !== id),
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  // AI Preferences
  updateAIPreferences: (updates) => {
    set(state => {
      const newState = {
        aiPreferences: { ...state.aiPreferences, ...updates },
      };
      saveData({ ...state, ...newState });
      return newState;
    });
  },

  clearAICache: () => {
    set(state => {
      const clearedState = clearAICacheStorage(state);
      saveData(clearedState);
      return { articlesMetadata: clearedState.articlesMetadata };
    });
  },

  // Navigation
  setView: (view, id) => {
    set({
      currentView: view,
      currentFolderId: view === 'folder' ? id || null : null,
      currentSourceId: view === 'source' ? id || null : null,
      currentTopicId: view === 'topic' ? id || null : null,
      currentArticleId: null,
    });
  },

  setCurrentArticle: (id) => {
    set({ currentArticleId: id });
    if (id) {
      get().markAsRead(id);
    }
  },

  setSearchQuery: (query) => {
    set({ 
      searchQuery: query,
      currentView: query ? 'search' : get().currentView,
    });
  },

  toggleSidebar: () => {
    set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  // Data management
  importData: (data) => {
    saveData(data);
    set(data);
  },

  exportData: () => {
    const state = get();
    return JSON.stringify({
      schemaVersion: state.schemaVersion,
      profiles: state.profiles,
      currentProfileId: state.currentProfileId,
      sources: state.sources,
      folders: state.folders,
      articles: state.articles,
      articlesMetadata: state.articlesMetadata,
      aiTopics: state.aiTopics,
      muteRules: state.muteRules,
      aiPreferences: state.aiPreferences,
    }, null, 2);
  },

  resetData: () => {
    localStorage.removeItem('feedlyCloneData');
    window.location.reload();
  },
}));
