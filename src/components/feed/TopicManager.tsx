import { useState } from 'react';
import { Plus, Trash2, Edit2, TrendingUp, AlertTriangle, Building2, Hash, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/state';
import { AITopic } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

interface TopicManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TOPIC_TYPES: { value: AITopic['type']; label: string; icon: typeof TrendingUp }[] = [
  { value: 'topic', label: 'Topic', icon: TrendingUp },
  { value: 'company', label: 'Company', icon: Building2 },
  { value: 'keyword', label: 'Keyword', icon: Hash },
  { value: 'trend', label: 'Trend', icon: Sparkles },
  { value: 'threat', label: 'Threat', icon: AlertTriangle },
];

export function TopicManager({ open, onOpenChange }: TopicManagerProps) {
  const { aiTopics, addTopic, updateTopic, deleteTopic } = useAppStore();
  
  const [editingTopic, setEditingTopic] = useState<AITopic | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AITopic['type']>('topic');
  const [mustContain, setMustContain] = useState('');
  const [shouldContain, setShouldContain] = useState('');
  const [mustNotContain, setMustNotContain] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('topic');
    setMustContain('');
    setShouldContain('');
    setMustNotContain('');
    setEditingTopic(null);
    setShowForm(false);
  };

  const handleEdit = (topic: AITopic) => {
    setEditingTopic(topic);
    setName(topic.name);
    setDescription(topic.description);
    setType(topic.type);
    setMustContain(topic.criteria.mustContain.join(', '));
    setShouldContain(topic.criteria.shouldContain.join(', '));
    setMustNotContain(topic.criteria.mustNotContain.join(', '));
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a topic name');
      return;
    }

    const criteria = {
      mustContain: mustContain.split(',').map(s => s.trim()).filter(Boolean),
      shouldContain: shouldContain.split(',').map(s => s.trim()).filter(Boolean),
      mustNotContain: mustNotContain.split(',').map(s => s.trim()).filter(Boolean),
    };

    if (editingTopic) {
      updateTopic(editingTopic.id, {
        name: name.trim(),
        description: description.trim(),
        type,
        criteria,
      });
      toast.success('Topic updated');
    } else {
      addTopic({
        name: name.trim(),
        description: description.trim(),
        type,
        criteria,
      });
      toast.success('Topic created');
    }

    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteTopic(id);
    toast.success('Topic deleted');
  };

  const getTypeIcon = (topicType: AITopic['type']) => {
    const typeInfo = TOPIC_TYPES.find(t => t.value === topicType);
    return typeInfo?.icon || TrendingUp;
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetForm();
      onOpenChange(value);
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Topics
          </DialogTitle>
          <DialogDescription>
            Create topics to prioritize articles that matter to you
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {!showForm ? (
            <div className="space-y-4">
              <Button onClick={() => setShowForm(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create New Topic
              </Button>

              {aiTopics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No topics yet</p>
                  <p className="text-sm">Create topics to prioritize articles by theme</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {aiTopics.map(topic => {
                    const Icon = getTypeIcon(topic.type);
                    return (
                      <div
                        key={topic.id}
                        className="p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{topic.name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {topic.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {topic.description || 'No description'}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {topic.criteria.mustContain.slice(0, 5).map(keyword => (
                                <Badge key={keyword} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {topic.criteria.mustContain.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{topic.criteria.mustContain.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(topic)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(topic.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="topicName">Topic Name</Label>
                  <Input
                    id="topicName"
                    placeholder="e.g., Cybersecurity Breaches"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as AITopic['type'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPIC_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className="w-4 h-4" />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this topic covers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mustContain">
                  Must Contain Keywords
                  <span className="text-muted-foreground font-normal ml-1">(comma separated)</span>
                </Label>
                <Input
                  id="mustContain"
                  placeholder="breach, hack, vulnerability, exploit"
                  value={mustContain}
                  onChange={(e) => setMustContain(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shouldContain">
                  Should Contain Keywords
                  <span className="text-muted-foreground font-normal ml-1">(optional, boost relevance)</span>
                </Label>
                <Input
                  id="shouldContain"
                  placeholder="data, security, attack, ransomware"
                  value={shouldContain}
                  onChange={(e) => setShouldContain(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mustNotContain">
                  Must NOT Contain
                  <span className="text-muted-foreground font-normal ml-1">(exclude articles)</span>
                </Label>
                <Input
                  id="mustNotContain"
                  placeholder="marketing, sponsored"
                  value={mustNotContain}
                  onChange={(e) => setMustNotContain(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  {editingTopic ? 'Update Topic' : 'Create Topic'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
