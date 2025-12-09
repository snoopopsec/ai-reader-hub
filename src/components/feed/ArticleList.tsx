import { useMemo, useState } from 'react';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { 
  MoreHorizontal, 
  Star, 
  Check, 
  Sparkles,
  Copy,
  ExternalLink,
  Filter,
  Search,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, ViewType } from '@/lib/state';
import { Article, ArticleMetadata } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ArticleListProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function ArticleList({ onRefresh, isRefreshing }: ArticleListProps) {
  const {
    currentView,
    currentFolderId,
    currentSourceId,
    currentTopicId,
    currentArticleId,
    searchQuery,
    articles,
    articlesMetadata,
    sources,
    folders,
    aiTopics,
    setCurrentArticle,
    setSearchQuery,
    toggleSaved,
    markAsRead,
    markAsUnread,
    markAllAsRead,
  } = useAppStore();

  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  // Get the title for current view
  const viewTitle = useMemo(() => {
    switch (currentView) {
      case 'today': return 'Today';
      case 'priority': return 'Priority';
      case 'all': return 'All Articles';
      case 'saved': return 'Saved';
      case 'muted': return 'Muted';
      case 'search': return `Search: "${searchQuery}"`;
      case 'folder': {
        const folder = folders.find(f => f.id === currentFolderId);
        return folder?.name || 'Folder';
      }
      case 'source': {
        const source = sources.find(s => s.id === currentSourceId);
        return source?.title || 'Source';
      }
      case 'topic': {
        const topic = aiTopics.find(t => t.id === currentTopicId);
        return topic?.name || 'Topic';
      }
      default: return 'Articles';
    }
  }, [currentView, currentFolderId, currentSourceId, currentTopicId, searchQuery, folders, sources, aiTopics]);

  // Filter articles based on current view
  const filteredArticles = useMemo(() => {
    let result = [...articles];
    const query = localSearch.toLowerCase() || searchQuery.toLowerCase();

    // Filter by view
    switch (currentView) {
      case 'today': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        result = result.filter(a => new Date(a.publishedAt) >= today);
        break;
      }
      case 'priority':
        result = result.filter(a => {
          const meta = articlesMetadata[a.id];
          return meta && meta.priorityScore > 30;
        });
        break;
      case 'saved':
        result = result.filter(a => articlesMetadata[a.id]?.isSaved);
        break;
      case 'muted':
        result = result.filter(a => articlesMetadata[a.id]?.isMuted);
        break;
      case 'folder': {
        const folderSourceIds = sources
          .filter(s => s.folderId === currentFolderId)
          .map(s => s.id);
        result = result.filter(a => folderSourceIds.includes(a.sourceId));
        break;
      }
      case 'source':
        result = result.filter(a => a.sourceId === currentSourceId);
        break;
      case 'topic': {
        const topic = aiTopics.find(t => t.id === currentTopicId);
        if (topic) {
          result = result.filter(a => {
            const meta = articlesMetadata[a.id];
            return meta?.aiLabels?.includes(topic.name);
          });
        }
        break;
      }
      case 'search':
        // Search handled below
        break;
    }

    // Apply search filter
    if (query) {
      result = result.filter(a => {
        const source = sources.find(s => s.id === a.sourceId);
        return (
          a.title.toLowerCase().includes(query) ||
          a.summary.toLowerCase().includes(query) ||
          source?.title.toLowerCase().includes(query) ||
          a.categories.some(c => c.toLowerCase().includes(query))
        );
      });
    }

    // Filter unread only
    if (showUnreadOnly && currentView !== 'saved') {
      result = result.filter(a => !articlesMetadata[a.id]?.isRead);
    }

    // Filter out muted (except in muted view)
    if (currentView !== 'muted') {
      result = result.filter(a => !articlesMetadata[a.id]?.isMuted);
    }

    // Filter duplicates (show only primary)
    result = result.filter(a => {
      const meta = articlesMetadata[a.id];
      return !meta?.duplicateGroupId || meta.isPrimary;
    });

    // Sort by date (newest first), then by priority
    result.sort((a, b) => {
      const metaA = articlesMetadata[a.id];
      const metaB = articlesMetadata[b.id];
      
      // Priority first if in priority view
      if (currentView === 'priority') {
        const scoreA = metaA?.priorityScore || 0;
        const scoreB = metaB?.priorityScore || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return result;
  }, [
    articles, 
    articlesMetadata, 
    currentView, 
    currentFolderId, 
    currentSourceId, 
    currentTopicId,
    searchQuery,
    localSearch,
    showUnreadOnly,
    sources,
    aiTopics
  ]);

  // Group articles by date
  const groupedArticles = useMemo(() => {
    const groups: { label: string; articles: Article[] }[] = [];
    let currentGroup: { label: string; articles: Article[] } | null = null;

    for (const article of filteredArticles) {
      const date = new Date(article.publishedAt);
      let label: string;

      if (isToday(date)) {
        label = 'Today';
      } else if (isYesterday(date)) {
        label = 'Yesterday';
      } else {
        label = format(date, 'MMMM d, yyyy');
      }

      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, articles: [] };
        groups.push(currentGroup);
      }
      currentGroup.articles.push(article);
    }

    return groups;
  }, [filteredArticles]);

  const unreadCount = filteredArticles.filter(a => !articlesMetadata[a.id]?.isRead).length;

  const handleMarkAllRead = () => {
    const unreadIds = filteredArticles
      .filter(a => !articlesMetadata[a.id]?.isRead)
      .map(a => a.id);
    markAllAsRead(unreadIds);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-foreground">{viewTitle}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={cn(
                "text-muted-foreground",
                showUnreadOnly && "text-primary bg-primary/10"
              )}
            >
              <Filter className="w-4 h-4 mr-1" />
              {showUnreadOnly ? 'Unread' : 'All'}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-foreground"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>
      </div>

      {/* Article list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {groupedArticles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No articles found</p>
              <p className="text-sm">Try adjusting your filters or add more sources</p>
            </div>
          ) : (
            groupedArticles.map(group => (
              <div key={group.label}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.articles.map(article => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      metadata={articlesMetadata[article.id]}
                      source={sources.find(s => s.id === article.sourceId)}
                      isSelected={article.id === currentArticleId}
                      onSelect={() => setCurrentArticle(article.id)}
                      onToggleSaved={() => toggleSaved(article.id)}
                      onToggleRead={() => {
                        const meta = articlesMetadata[article.id];
                        if (meta?.isRead) {
                          markAsUnread(article.id);
                        } else {
                          markAsRead(article.id);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ArticleCardProps {
  article: Article;
  metadata?: ArticleMetadata;
  source?: { title: string; favicon?: string };
  isSelected: boolean;
  onSelect: () => void;
  onToggleSaved: () => void;
  onToggleRead: () => void;
}

function ArticleCard({ 
  article, 
  metadata, 
  source, 
  isSelected, 
  onSelect,
  onToggleSaved,
  onToggleRead
}: ArticleCardProps) {
  const isRead = metadata?.isRead || false;
  const isSaved = metadata?.isSaved || false;
  const priorityScore = metadata?.priorityScore || 0;
  const aiLabels = metadata?.aiLabels || [];
  const aiSummary = metadata?.aiSummaryShort;

  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative p-4 rounded-xl cursor-pointer transition-all",
        isSelected 
          ? "bg-primary/10 ring-1 ring-primary/30" 
          : "hover:bg-secondary/80",
        isRead && !isSelected && "opacity-60"
      )}
    >
      {/* Unread indicator */}
      {!isRead && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-unread-indicator" />
      )}

      <div className="flex gap-4">
        {/* Thumbnail */}
        {article.imageUrl && (
          <div className="shrink-0 w-24 h-20 rounded-lg overflow-hidden bg-muted">
            <img 
              src={article.imageUrl} 
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Source & time */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="font-medium">{source?.title || 'Unknown'}</span>
            <span>•</span>
            <span>{timeAgo}</span>
            {aiLabels.length > 0 && (
              <>
                <span>•</span>
                {aiLabels.slice(0, 2).map(label => (
                  <Badge 
                    key={label} 
                    variant="secondary" 
                    className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary"
                  >
                    {label}
                  </Badge>
                ))}
              </>
            )}
          </div>

          {/* Title */}
          <h4 className={cn(
            "text-sm font-medium line-clamp-2 mb-1",
            isRead ? "text-muted-foreground" : "text-foreground"
          )}>
            {article.title}
          </h4>

          {/* Summary */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {aiSummary || article.summary}
          </p>

          {/* Priority indicator */}
          {priorityScore > 50 && (
            <div className="flex items-center gap-1 mt-2">
              <Sparkles className="w-3 h-3 text-priority" />
              <span className="text-[10px] font-medium text-priority">High Priority</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSaved();
            }}
          >
            <Star className={cn("w-4 h-4", isSaved && "fill-saved text-saved")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onToggleRead();
            }}
          >
            <Check className={cn("w-4 h-4", isRead && "text-primary")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.open(article.url, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open original
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(article.url)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
