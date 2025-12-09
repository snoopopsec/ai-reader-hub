import { useState } from 'react';
import { Rss, Sparkles, ChevronRight, Check, FolderOpen, Key } from 'lucide-react';
import { useAppStore } from '@/lib/state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STARTER_FEEDS = [
  {
    category: 'Tech',
    color: '#10b981',
    feeds: [
      { title: 'Hacker News', url: 'https://hnrss.org/frontpage', description: 'Top stories from Hacker News' },
      { title: 'TechCrunch', url: 'https://techcrunch.com/feed/', description: 'Tech news and startups' },
      { title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', description: 'Tech, science, and culture' },
      { title: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', description: 'In-depth tech journalism' },
    ]
  },
  {
    category: 'Security',
    color: '#ef4444',
    feeds: [
      { title: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', description: 'Security news and investigation' },
      { title: 'Schneier on Security', url: 'https://www.schneier.com/feed/atom/', description: 'Security analysis' },
      { title: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', description: 'Enterprise security news' },
    ]
  },
  {
    category: 'World News',
    color: '#3b82f6',
    feeds: [
      { title: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', description: 'World news from BBC' },
      { title: 'Reuters', url: 'https://www.reutersagency.com/feed/', description: 'Global news agency' },
      { title: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', description: 'US and world news' },
    ]
  },
  {
    category: 'AI & Science',
    color: '#8b5cf6',
    feeds: [
      { title: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', description: 'Tech and science research' },
      { title: 'OpenAI Blog', url: 'https://openai.com/blog/rss/', description: 'AI research updates' },
      { title: 'Quanta Magazine', url: 'https://api.quantamagazine.org/feed/', description: 'Science and math journalism' },
    ]
  },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { updateProfile, currentProfileId, addFolder, addSource, updateAIPreferences } = useAppStore();
  
  const [step, setStep] = useState(0);
  const [profileName, setProfileName] = useState('');
  const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set());
  const [apiKey, setApiKey] = useState('');

  const handleSelectFeed = (url: string) => {
    const newSelected = new Set(selectedFeeds);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedFeeds(newSelected);
  };

  const handleSelectCategory = (category: typeof STARTER_FEEDS[0]) => {
    const urls = category.feeds.map(f => f.url);
    const allSelected = urls.every(url => selectedFeeds.has(url));
    
    const newSelected = new Set(selectedFeeds);
    if (allSelected) {
      urls.forEach(url => newSelected.delete(url));
    } else {
      urls.forEach(url => newSelected.add(url));
    }
    setSelectedFeeds(newSelected);
  };

  const handleComplete = () => {
    // Update profile name
    if (profileName.trim()) {
      updateProfile(currentProfileId!, { name: profileName.trim() });
    }

    // Create folders and add selected feeds
    const folderMap: Record<string, string> = {};
    
    for (const category of STARTER_FEEDS) {
      const selectedInCategory = category.feeds.filter(f => selectedFeeds.has(f.url));
      if (selectedInCategory.length > 0) {
        const folder = addFolder(category.category, category.color);
        folderMap[category.category] = folder.id;
        
        for (const feed of selectedInCategory) {
          addSource({
            title: feed.title,
            url: feed.url,
            siteUrl: new URL(feed.url).origin,
            type: 'rss',
            folderId: folder.id,
            tags: [],
          });
        }
      }
    }

    // Save API key if provided
    if (apiKey.trim()) {
      updateAIPreferences({ apiKey: apiKey.trim() });
    }

    onComplete();
  };

  const steps = [
    {
      title: 'Welcome to FeedFlow',
      subtitle: 'Your AI-powered RSS reader',
      icon: Rss,
    },
    {
      title: 'Name Your Profile',
      subtitle: 'Personalize your reading experience',
      icon: FolderOpen,
    },
    {
      title: 'Choose Starter Feeds',
      subtitle: 'Select feeds to get started',
      icon: Rss,
    },
    {
      title: 'AI Features',
      subtitle: 'Supercharge your reading with AI',
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === step ? "bg-primary" : i < step ? "bg-primary/50" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Rss className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Welcome to FeedFlow</h1>
              <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                Your intelligent RSS reader with AI-powered prioritization, 
                summarization, and topic monitoring.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="p-4 rounded-xl bg-muted/50">
                  <Rss className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-medium">Multiple Feeds</p>
                  <p className="text-muted-foreground text-xs">RSS, Atom, JSON</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-medium">AI Powered</p>
                  <p className="text-muted-foreground text-xs">Summaries & Priority</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <FolderOpen className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-medium">Organized</p>
                  <p className="text-muted-foreground text-xs">Folders & Topics</p>
                </div>
              </div>
              <Button onClick={() => setStep(1)} size="lg" className="gap-2">
                Get Started
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 1: Profile Name */}
          {step === 1 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">What should we call you?</h2>
                <p className="text-muted-foreground">This will be your profile name</p>
              </div>
              <div className="max-w-sm mx-auto space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="profileName">Profile Name</Label>
                  <Input
                    id="profileName"
                    placeholder="My Feed"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="text-center text-lg h-12"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={() => setStep(2)} className="flex-1">
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Starter Feeds */}
          {step === 2 && (
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Choose Your Feeds</h2>
                <p className="text-muted-foreground">
                  Select some feeds to get started. You can add more later.
                </p>
              </div>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                {STARTER_FEEDS.map((category) => {
                  const selectedCount = category.feeds.filter(f => selectedFeeds.has(f.url)).length;
                  const allSelected = selectedCount === category.feeds.length;
                  
                  return (
                    <div key={category.category} className="space-y-3">
                      <button
                        onClick={() => handleSelectCategory(category)}
                        className="flex items-center gap-3 w-full text-left"
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-semibold flex-1">{category.category}</span>
                        {allSelected && <Check className="w-4 h-4 text-primary" />}
                        <span className="text-sm text-muted-foreground">
                          {selectedCount}/{category.feeds.length}
                        </span>
                      </button>
                      <div className="grid gap-2 pl-6">
                        {category.feeds.map((feed) => (
                          <label
                            key={feed.url}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedFeeds.has(feed.url)
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <Checkbox
                              checked={selectedFeeds.has(feed.url)}
                              onCheckedChange={() => handleSelectFeed(feed.url)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{feed.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {feed.description}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  {selectedFeeds.size > 0 ? `Continue with ${selectedFeeds.size} feeds` : 'Skip'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: AI Setup */}
          {step === 3 && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">AI Features</h2>
                <p className="text-muted-foreground">
                  Add your OpenAI API key to enable AI features like summarization,
                  topic prioritization, and more.
                </p>
              </div>
              <div className="max-w-md mx-auto space-y-6">
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">AI article summaries</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Topic-based prioritization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Duplicate detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Ask questions about articles</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    OpenAI API Key (optional)
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your key is stored locally. You can add it later in Settings.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleComplete} className="flex-1">
                    {apiKey ? 'Finish Setup' : 'Skip for Now'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
