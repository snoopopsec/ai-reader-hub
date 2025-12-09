import { useState } from 'react';
import { 
  Newspaper, 
  Star, 
  Folder, 
  Rss, 
  Settings, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  Sparkles,
  Calendar,
  TrendingUp,
  VolumeX,
  Search,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, ViewType } from '@/lib/state';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  onAddSource: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ onAddSource, onOpenSettings }: SidebarProps) {
  const { 
    currentView, 
    currentFolderId, 
    currentSourceId,
    currentTopicId,
    folders, 
    sources, 
    articles,
    articlesMetadata,
    aiTopics,
    profiles,
    currentProfileId,
    setView,
    sidebarCollapsed,
    toggleSidebar
  } = useAppStore();

  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [topicsExpanded, setTopicsExpanded] = useState(true);

  const currentProfile = profiles.find(p => p.id === currentProfileId);

  // Count unread articles
  const getUnreadCount = (sourceIds?: string[]) => {
    return articles.filter(a => {
      if (sourceIds && !sourceIds.includes(a.sourceId)) return false;
      const meta = articlesMetadata[a.id];
      return !meta?.isRead;
    }).length;
  };

  const getTodayCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return articles.filter(a => {
      const meta = articlesMetadata[a.id];
      if (meta?.isRead) return false;
      return new Date(a.publishedAt) >= today;
    }).length;
  };

  const getPriorityCount = () => {
    return articles.filter(a => {
      const meta = articlesMetadata[a.id];
      return meta?.priorityScore > 50 && !meta?.isRead;
    }).length;
  };

  const getSavedCount = () => {
    return Object.values(articlesMetadata).filter(m => m.isSaved).length;
  };

  const totalUnread = getUnreadCount();
  const todayCount = getTodayCount();
  const priorityCount = getPriorityCount();
  const savedCount = getSavedCount();

  // Group sources by folder
  const sourcesWithoutFolder = sources.filter(s => !s.folderId);
  const sourcesByFolder = folders.reduce((acc, folder) => {
    acc[folder.id] = sources.filter(s => s.folderId === folder.id);
    return acc;
  }, {} as Record<string, typeof sources>);

  const NavItem = ({ 
    icon: Icon, 
    label, 
    count, 
    isActive, 
    onClick,
    color
  }: { 
    icon: typeof Newspaper; 
    label: string; 
    count?: number;
    isActive: boolean;
    onClick: () => void;
    color?: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive 
          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color }} />
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge 
          variant="secondary" 
          className="bg-sidebar-accent text-sidebar-foreground text-xs px-1.5 py-0"
        >
          {count > 99 ? '99+' : count}
        </Badge>
      )}
    </button>
  );

  const SourceItem = ({ source }: { source: typeof sources[0] }) => {
    const unread = getUnreadCount([source.id]);
    const isActive = currentView === 'source' && currentSourceId === source.id;
    
    return (
      <button
        onClick={() => setView('source', source.id)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
          isActive 
            ? "bg-sidebar-accent text-sidebar-accent-foreground" 
            : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
        )}
      >
        {source.favicon ? (
          <img src={source.favicon} alt="" className="w-4 h-4 rounded" />
        ) : (
          <Rss className="w-4 h-4 shrink-0" />
        )}
        <span className="flex-1 text-left truncate">{source.title}</span>
        {unread > 0 && (
          <span className="text-xs text-sidebar-muted">{unread}</span>
        )}
      </button>
    );
  };

  if (sidebarCollapsed) {
    return (
      <div className="w-14 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleSidebar}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex-1" />
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onOpenSettings}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Rss className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">FeedFlow</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleSidebar}
            className="text-sidebar-muted hover:text-sidebar-foreground lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {currentProfile && (
          <div className="text-xs text-sidebar-muted">
            {currentProfile.name}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          <NavItem
            icon={Calendar}
            label="Today"
            count={todayCount}
            isActive={currentView === 'today'}
            onClick={() => setView('today')}
          />
          <NavItem
            icon={Sparkles}
            label="Priority"
            count={priorityCount}
            isActive={currentView === 'priority'}
            onClick={() => setView('priority')}
          />
          <NavItem
            icon={Newspaper}
            label="All Articles"
            count={totalUnread}
            isActive={currentView === 'all'}
            onClick={() => setView('all')}
          />
          <NavItem
            icon={Star}
            label="Saved"
            count={savedCount}
            isActive={currentView === 'saved'}
            onClick={() => setView('saved')}
          />
        </div>

        {/* AI Topics */}
        {aiTopics.length > 0 && (
          <Collapsible 
            open={topicsExpanded} 
            onOpenChange={setTopicsExpanded}
            className="mt-6"
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-sidebar-muted uppercase tracking-wider hover:text-sidebar-foreground">
              {topicsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              AI Topics
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {aiTopics.map(topic => (
                <NavItem
                  key={topic.id}
                  icon={TrendingUp}
                  label={topic.name}
                  isActive={currentView === 'topic' && currentTopicId === topic.id}
                  onClick={() => setView('topic', topic.id)}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Folders */}
        <Collapsible 
          open={foldersExpanded} 
          onOpenChange={setFoldersExpanded}
          className="mt-6"
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-sidebar-muted uppercase tracking-wider hover:text-sidebar-foreground">
            {foldersExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Folders
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-1">
            {folders.map(folder => {
              const folderSources = sourcesByFolder[folder.id] || [];
              const folderUnread = getUnreadCount(folderSources.map(s => s.id));
              const isActive = currentView === 'folder' && currentFolderId === folder.id;
              
              return (
                <Collapsible key={folder.id} defaultOpen>
                  <CollapsibleTrigger asChild>
                    <button
                      onClick={() => setView('folder', folder.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <Folder className="w-4 h-4" style={{ color: folder.color }} />
                      <span className="flex-1 text-left truncate">{folder.name}</span>
                      {folderUnread > 0 && (
                        <span className="text-xs text-sidebar-muted">{folderUnread}</span>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4 space-y-0.5 mt-1">
                    {folderSources.map(source => (
                      <SourceItem key={source.id} source={source} />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
            
            {/* Sources without folder */}
            {sourcesWithoutFolder.length > 0 && (
              <div className="space-y-0.5 mt-2">
                {sourcesWithoutFolder.map(source => (
                  <SourceItem key={source.id} source={source} />
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Muted */}
        <div className="mt-6">
          <NavItem
            icon={VolumeX}
            label="Muted"
            isActive={currentView === 'muted'}
            onClick={() => setView('muted')}
          />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onAddSource}
        >
          <Plus className="w-4 h-4" />
          Add Source
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onOpenSettings}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
