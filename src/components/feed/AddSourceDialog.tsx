import { useState } from 'react';
import { Loader2, Rss, Globe, Search, CheckCircle } from 'lucide-react';
import { useAppStore } from '@/lib/state';
import { validateFeedUrl, discoverFeedUrl } from '@/lib/feeds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSourceDialog({ open, onOpenChange }: AddSourceDialogProps) {
  const { folders, addSource, sources } = useAppStore();
  
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    title?: string;
    type?: 'rss' | 'atom' | 'json' | 'website';
    siteUrl?: string;
    error?: string;
  } | null>(null);

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setFolderId(null);
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!url.trim()) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await validateFeedUrl(url.trim());
      setValidationResult(result);
      
      if (result.valid && result.title) {
        setTitle(result.title);
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        error: 'Failed to validate URL',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDiscover = async () => {
    if (!url.trim()) return;

    setIsDiscovering(true);
    setValidationResult(null);

    try {
      const feedUrl = await discoverFeedUrl(url.trim());
      
      if (feedUrl) {
        setUrl(feedUrl);
        const result = await validateFeedUrl(feedUrl);
        setValidationResult(result);
        
        if (result.valid && result.title) {
          setTitle(result.title);
        }
        
        toast.success('Feed discovered!');
      } else {
        toast.error('No feed found on this website');
      }
    } catch (error) {
      toast.error('Failed to discover feed');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAdd = () => {
    if (!validationResult?.valid || !title.trim()) return;

    // Check for duplicate
    if (sources.some(s => s.url === url.trim())) {
      toast.error('This feed is already added');
      return;
    }

    addSource({
      title: title.trim(),
      url: url.trim(),
      siteUrl: validationResult.siteUrl || url.trim(),
      type: validationResult.type || 'rss',
      folderId,
      tags: [],
    });

    toast.success('Source added successfully');
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetForm();
      onOpenChange(value);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
          <DialogDescription>
            Add an RSS, Atom, or JSON feed to your collection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">Feed or Website URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                placeholder="https://example.com/feed"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setValidationResult(null);
                }}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={isValidating || !url.trim()}
                className="flex-1"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Rss className="w-4 h-4 mr-1" />
                )}
                Validate Feed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscover}
                disabled={isDiscovering || !url.trim()}
                className="flex-1"
              >
                {isDiscovering ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-1" />
                )}
                Discover Feed
              </Button>
            </div>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-3 rounded-lg text-sm ${
              validationResult.valid 
                ? 'bg-primary/10 text-primary' 
                : 'bg-destructive/10 text-destructive'
            }`}>
              {validationResult.valid ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Valid {validationResult.type?.toUpperCase()} feed</span>
                </div>
              ) : (
                <span>{validationResult.error}</span>
              )}
            </div>
          )}

          {/* Title */}
          {validationResult?.valid && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Feed title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Folder */}
              <div className="space-y-2">
                <Label>Folder (optional)</Label>
                <Select value={folderId || ''} onValueChange={(v) => setFolderId(v || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No folder</SelectItem>
                    {folders.map(folder => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: folder.color }}
                          />
                          {folder.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => {
              resetForm();
              onOpenChange(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdd}
              disabled={!validationResult?.valid || !title.trim()}
            >
              Add Source
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
