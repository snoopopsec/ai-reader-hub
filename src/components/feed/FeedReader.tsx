import { useEffect, useState, useCallback, useRef } from 'react';
import { Menu } from 'lucide-react';
import { useAppStore } from '@/lib/state';
import { fetchFeed } from '@/lib/feeds';
import { aiClassifyArticles, aiDetectDuplicates } from '@/lib/ai';
import { Sidebar } from './Sidebar';
import { ArticleList } from './ArticleList';
import { ArticleDetail } from './ArticleDetail';
import { AddSourceDialog } from './AddSourceDialog';
import { SettingsDialog } from './SettingsDialog';
import { TopicManager } from './TopicManager';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function FeedReader() {
  const {
    sources,
    profiles,
    currentProfileId,
    aiTopics,
    aiPreferences,
    currentArticleId,
    sidebarCollapsed,
    addArticles,
    updateSource,
    updateArticleMetadata,
    toggleSidebar,
  } = useAppStore();

  const [showAddSource, setShowAddSource] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentProfile = profiles.find(p => p.id === currentProfileId);

  // Apply theme on mount
  useEffect(() => {
    const theme = currentProfile?.settings.theme || 'system';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [currentProfile?.settings.theme]);

  // Fetch all feeds
  const refreshFeeds = useCallback(async () => {
    if (sources.length === 0) return;
    
    setIsRefreshing(true);
    const allNewArticles: Parameters<typeof addArticles>[0] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const source of sources) {
      try {
        const { articles, error } = await fetchFeed(source);
        
        if (error) {
          updateSource(source.id, { 
            fetchError: error,
            lastFetchedAt: new Date().toISOString(),
          });
          errorCount++;
        } else {
          updateSource(source.id, { 
            fetchError: null,
            lastFetchedAt: new Date().toISOString(),
          });
          allNewArticles.push(...articles);
          successCount++;
        }
      } catch (error) {
        updateSource(source.id, { 
          fetchError: 'Fetch failed',
          lastFetchedAt: new Date().toISOString(),
        });
        errorCount++;
      }
    }

    if (allNewArticles.length > 0) {
      addArticles(allNewArticles);
    }

    // Run AI classification if enabled
    if (aiPreferences.apiKey && aiPreferences.enableTopicPrioritization && aiTopics.length > 0) {
      try {
        const articlesToClassify = allNewArticles.slice(0, 50).map(a => ({
          id: a.id,
          title: a.title,
          summary: a.summary,
        }));

        const classifications = await aiClassifyArticles(aiPreferences, articlesToClassify, aiTopics);
        
        for (const [articleId, result] of Object.entries(classifications)) {
          updateArticleMetadata(articleId, {
            aiLabels: result.labels,
            priorityScore: result.score,
          });
        }
      } catch (error) {
        console.error('AI classification failed:', error);
      }
    }

    // Run deduplication if enabled
    if (aiPreferences.apiKey && aiPreferences.enableDeduplication) {
      try {
        const articlesToCheck = allNewArticles.slice(0, 100).map(a => ({
          id: a.id,
          title: a.title,
          url: a.url,
        }));

        const duplicates = await aiDetectDuplicates(aiPreferences, articlesToCheck);
        
        for (const group of duplicates) {
          for (let i = 0; i < group.ids.length; i++) {
            updateArticleMetadata(group.ids[i], {
              duplicateGroupId: group.ids[0],
              isPrimary: group.ids[i] === group.primaryId,
            });
          }
        }
      } catch (error) {
        console.error('Deduplication failed:', error);
      }
    }

    setIsRefreshing(false);

    if (successCount > 0 && errorCount === 0) {
      toast.success(`Refreshed ${successCount} feeds`);
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`Refreshed ${successCount} feeds, ${errorCount} failed`);
    } else if (errorCount > 0) {
      toast.error(`Failed to refresh ${errorCount} feeds`);
    }
  }, [sources, aiPreferences, aiTopics, addArticles, updateSource, updateArticleMetadata]);

  // Initial fetch
  useEffect(() => {
    refreshFeeds();
  }, []); // Only on mount

  // Auto-refresh
  useEffect(() => {
    const interval = (currentProfile?.settings.fetchInterval || 20) * 60 * 1000;
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(() => {
      refreshFeeds();
    }, interval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [currentProfile?.settings.fetchInterval, refreshFeeds]);

  // Close mobile sidebar when selecting article
  useEffect(() => {
    if (currentArticleId) {
      setMobileSidebarOpen(false);
    }
  }, [currentArticleId]);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 lg:relative lg:z-0 transition-transform duration-300 lg:translate-x-0",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar
          onAddSource={() => setShowAddSource(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-semibold">FeedFlow</span>
        </div>

        {/* Article list */}
        <div className={cn(
          "flex-1 min-w-0 border-r border-border",
          currentArticleId ? "hidden lg:flex lg:w-[400px] lg:shrink-0" : "flex"
        )}>
          <ArticleList
            onRefresh={refreshFeeds}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Article detail */}
        <div className={cn(
          "flex-1 min-w-0",
          !currentArticleId && "hidden lg:flex"
        )}>
          <ArticleDetail />
        </div>
      </div>

      {/* Dialogs */}
      <AddSourceDialog
        open={showAddSource}
        onOpenChange={setShowAddSource}
      />
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />
      <TopicManager
        open={showTopics}
        onOpenChange={setShowTopics}
      />
    </div>
  );
}
