import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  X, 
  Star, 
  ExternalLink, 
  Sparkles, 
  MessageSquare,
  BookOpen,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Check,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/state';
import { Article } from '@/lib/storage';
import { aiSummarizeArticle, aiExplainArticle, aiExplainTopic } from '@/lib/ai';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ArticleDetail() {
  const {
    currentArticleId,
    articles,
    articlesMetadata,
    sources,
    aiTopics,
    aiPreferences,
    setCurrentArticle,
    toggleSaved,
    updateArticleMetadata,
    addTopicFeedback,
    markAsRead,
    markAsUnread,
  } = useAppStore();

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [showAskAI, setShowAskAI] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const article = articles.find(a => a.id === currentArticleId);
  const metadata = currentArticleId ? articlesMetadata[currentArticleId] : null;
  const source = article ? sources.find(s => s.id === article.sourceId) : null;

  if (!article || !currentArticleId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select an article to read</p>
          <p className="text-sm">Click on any article from the list</p>
        </div>
      </div>
    );
  }

  const isRead = metadata?.isRead || false;
  const isSaved = metadata?.isSaved || false;
  const aiSummaryShort = metadata?.aiSummaryShort;
  const aiSummaryDetailed = metadata?.aiSummaryDetailed;
  const aiLabels = metadata?.aiLabels || [];
  const priorityScore = metadata?.priorityScore || 0;

  const handleSummarize = async () => {
    if (!aiPreferences.apiKey) {
      toast.error('Please add your OpenAI API key in Settings');
      return;
    }

    setIsSummarizing(true);
    try {
      const { short, detailed } = await aiSummarizeArticle(
        aiPreferences,
        article.title,
        article.contentText || article.summary
      );
      
      updateArticleMetadata(currentArticleId, {
        aiSummaryShort: short,
        aiSummaryDetailed: detailed,
      });
      
      toast.success('Summary generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to summarize');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleExplain = async (mode: 'beginner' | 'risks-opportunities') => {
    if (!aiPreferences.apiKey) {
      toast.error('Please add your OpenAI API key in Settings');
      return;
    }

    setIsExplaining(true);
    setExplanation(null);
    try {
      const result = await aiExplainArticle(
        aiPreferences,
        article.title,
        article.contentText || article.summary,
        mode
      );
      setExplanation(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to explain');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    if (!aiPreferences.apiKey) {
      toast.error('Please add your OpenAI API key in Settings');
      return;
    }

    setIsAsking(true);
    setAiAnswer(null);
    try {
      const result = await aiExplainTopic(
        aiPreferences,
        question,
        [{ title: article.title, summary: article.summary }]
      );
      setAiAnswer(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to get answer');
    } finally {
      setIsAsking(false);
    }
  };

  const handleTopicFeedback = (topicName: string, positive: boolean) => {
    const topic = aiTopics.find(t => t.name === topicName);
    if (topic) {
      addTopicFeedback(topic.id, currentArticleId, positive);
      toast.success(positive ? 'Thanks! More like this' : 'Got it, less like this');
    }
  };

  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });
  const fullDate = format(new Date(article.publishedAt), 'MMMM d, yyyy • h:mm a');

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentArticle(null)}
          className="text-muted-foreground hover:text-foreground lg:hidden"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleSaved(currentArticleId)}
          >
            <Star className={cn("w-5 h-5", isSaved && "fill-saved text-saved")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => isRead ? markAsUnread(currentArticleId) : markAsRead(currentArticleId)}
          >
            <Check className={cn("w-5 h-5", isRead && "text-primary")} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(article.url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Open
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentArticle(null)}
            className="hidden lg:flex"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Article meta */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span className="font-medium text-foreground">{source?.title}</span>
            <span>•</span>
            <span title={fullDate}>{timeAgo}</span>
            {article.author && (
              <>
                <span>•</span>
                <span>By {article.author}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
            {article.title}
          </h1>

          {/* AI Labels & Priority */}
          {(aiLabels.length > 0 || priorityScore > 50) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {priorityScore > 50 && (
                <Badge className="bg-priority/10 text-priority border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  High Priority ({priorityScore}%)
                </Badge>
              )}
              {aiLabels.map(label => (
                <div key={label} className="flex items-center gap-1">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                    {label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleTopicFeedback(label, true)}
                    title="More like this"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleTopicFeedback(label, false)}
                    title="Less like this"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Categories */}
          {article.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {article.categories.map(cat => (
                <Badge key={cat} variant="outline" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
          )}

          {/* AI Summary */}
          {(aiSummaryShort || aiSummaryDetailed) && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">AI Summary</span>
              </div>
              {aiSummaryShort && (
                <p className="text-sm font-medium mb-2">{aiSummaryShort}</p>
              )}
              {aiSummaryDetailed && (
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {aiSummaryDetailed}
                </div>
              )}
            </div>
          )}

          {/* AI Explanation */}
          {explanation && (
            <div className="bg-accent border border-border rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">AI Explanation</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setExplanation(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-sm whitespace-pre-line">
                {explanation}
              </div>
            </div>
          )}

          {/* Image */}
          {article.imageUrl && (
            <div className="mb-6 rounded-xl overflow-hidden">
              <img 
                src={article.imageUrl} 
                alt=""
                className="w-full h-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Content */}
          <div 
            className="article-content prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.contentHtml || article.summary }}
          />

          {/* AI Actions */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Tools
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSummarize}
                disabled={isSummarizing}
              >
                {isSummarizing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                {aiSummaryShort ? 'Re-summarize' : 'Summarize'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExplain('beginner')}
                disabled={isExplaining}
              >
                {isExplaining ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4 mr-1" />
                )}
                Explain simply
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExplain('risks-opportunities')}
                disabled={isExplaining}
              >
                {isExplaining ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mr-1" />
                )}
                Risks & Opportunities
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAskAI(true)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Ask AI
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Ask AI Dialog */}
      <Dialog open={showAskAI} onOpenChange={setShowAskAI}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ask AI about this article</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="What would you like to know about this article?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handleAskQuestion}
              disabled={isAsking || !question.trim()}
              className="w-full"
            >
              {isAsking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask Question
                </>
              )}
            </Button>
            {aiAnswer && (
              <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-line">
                {aiAnswer}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
