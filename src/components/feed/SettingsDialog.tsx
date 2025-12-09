import { useState } from 'react';
import { 
  Settings, 
  Key, 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  Sparkles,
  Loader2,
  Check,
  AlertTriangle,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { useAppStore } from '@/lib/state';
import { testAIConnection } from '@/lib/ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const {
    profiles,
    currentProfileId,
    aiPreferences,
    updateAIPreferences,
    updateProfile,
    clearAICache,
    exportData,
    importData,
    resetData,
  } = useAppStore();

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const currentProfile = profiles.find(p => p.id === currentProfileId);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const result = await testAIConnection(aiPreferences);
    setTestResult(result);
    setIsTesting(false);

    if (result.success) {
      toast.success('Connection successful!');
    } else {
      toast.error(result.error || 'Connection failed');
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  const handleImport = () => {
    if (!importFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const data = JSON.parse(content);
        importData(data);
        toast.success('Data imported successfully');
        window.location.reload();
      } catch (error) {
        toast.error('Invalid backup file');
      }
    };
    reader.readAsText(importFile);
  };

  const handleReset = () => {
    resetData();
  };

  const handleClearAICache = () => {
    clearAICache();
    toast.success('AI cache cleared');
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    if (currentProfile) {
      updateProfile(currentProfileId!, {
        settings: { ...currentProfile.settings, theme }
      });
    }

    // Apply theme
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
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              {/* General Settings */}
              <TabsContent value="general" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <h3 className="font-medium">Appearance</h3>
                  
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <div className="flex gap-2">
                      {[
                        { value: 'light', icon: Sun, label: 'Light' },
                        { value: 'dark', icon: Moon, label: 'Dark' },
                        { value: 'system', icon: Monitor, label: 'System' },
                      ].map(({ value, icon: Icon, label }) => (
                        <Button
                          key={value}
                          variant={currentProfile?.settings.theme === value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleThemeChange(value as 'light' | 'dark' | 'system')}
                          className="flex-1"
                        >
                          <Icon className="w-4 h-4 mr-1" />
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Default View</Label>
                    <Select 
                      value={currentProfile?.settings.defaultView || 'today'}
                      onValueChange={(value) => {
                        if (currentProfile) {
                          updateProfile(currentProfileId!, {
                            settings: { 
                              ...currentProfile.settings, 
                              defaultView: value as 'today' | 'priority' | 'all'
                            }
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="all">All Articles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Font Size</Label>
                    <Select 
                      value={currentProfile?.settings.fontSize || 'medium'}
                      onValueChange={(value) => {
                        if (currentProfile) {
                          updateProfile(currentProfileId!, {
                            settings: { 
                              ...currentProfile.settings, 
                              fontSize: value as 'small' | 'medium' | 'large'
                            }
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Feed Settings</h3>
                  
                  <div className="space-y-2">
                    <Label>Auto-refresh interval (minutes)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      value={currentProfile?.settings.fetchInterval || 20}
                      onChange={(e) => {
                        if (currentProfile) {
                          updateProfile(currentProfileId!, {
                            settings: { 
                              ...currentProfile.settings, 
                              fetchInterval: parseInt(e.target.value) || 20
                            }
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max articles per source</Label>
                    <Input
                      type="number"
                      min={50}
                      max={1000}
                      value={currentProfile?.settings.maxArticlesPerSource || 500}
                      onChange={(e) => {
                        if (currentProfile) {
                          updateProfile(currentProfileId!, {
                            settings: { 
                              ...currentProfile.settings, 
                              maxArticlesPerSource: parseInt(e.target.value) || 500
                            }
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* AI Settings */}
              <TabsContent value="ai" className="space-y-6 mt-0">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Security Notice</p>
                      <p className="text-amber-700 dark:text-amber-300 mt-1">
                        Your API key is stored locally in your browser. Only use this on trusted devices.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">OpenAI API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="sk-..."
                      value={aiPreferences.apiKey}
                      onChange={(e) => updateAIPreferences({ apiKey: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">API Base URL</Label>
                    <Input
                      id="baseUrl"
                      placeholder="https://api.openai.com/v1"
                      value={aiPreferences.baseUrl}
                      onChange={(e) => updateAIPreferences({ baseUrl: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select 
                      value={aiPreferences.model}
                      onValueChange={(value) => updateAIPreferences({ model: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recommended)</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting || !aiPreferences.apiKey}
                    className="w-full"
                  >
                    {isTesting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : testResult?.success ? (
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                    ) : (
                      <Key className="w-4 h-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">AI Features</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Topic Prioritization</Label>
                      <p className="text-sm text-muted-foreground">
                        AI classifies articles by your topics
                      </p>
                    </div>
                    <Switch
                      checked={aiPreferences.enableTopicPrioritization}
                      onCheckedChange={(checked) => 
                        updateAIPreferences({ enableTopicPrioritization: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Deduplication</Label>
                      <p className="text-sm text-muted-foreground">
                        Hide duplicate articles
                      </p>
                    </div>
                    <Switch
                      checked={aiPreferences.enableDeduplication}
                      onCheckedChange={(checked) => 
                        updateAIPreferences({ enableDeduplication: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Summaries</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically summarize long articles
                      </p>
                    </div>
                    <Switch
                      checked={aiPreferences.enableAutoSummaries}
                      onCheckedChange={(checked) => 
                        updateAIPreferences({ enableAutoSummaries: checked })
                      }
                    />
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleClearAICache}
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Clear AI Cache
                  </Button>
                </div>
              </TabsContent>

              {/* Data Settings */}
              <TabsContent value="data" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <h3 className="font-medium">Backup & Restore</h3>
                  
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>

                  <div className="space-y-2">
                    <Label>Import Backup</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept=".json"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={handleImport}
                        disabled={!importFile}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-destructive">Danger Zone</h3>
                  
                  <Button
                    variant="destructive"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset All Data
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your feeds, articles, settings, and AI preferences. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground">
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
