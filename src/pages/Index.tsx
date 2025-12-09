import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/state';
import { FeedReader } from '@/components/feed/FeedReader';
import { OnboardingWizard } from '@/components/feed/OnboardingWizard';

const Index = () => {
  const { init, sources, profiles } = useAppStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    init();
    setIsInitialized(true);
  }, [init]);

  useEffect(() => {
    if (isInitialized) {
      // Show onboarding if no sources exist (fresh install)
      const hasCompletedSetup = localStorage.getItem('feedflow_onboarding_complete');
      if (!hasCompletedSetup && sources.length <= 4) {
        setShowOnboarding(true);
      }
    }
  }, [isInitialized, sources.length]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('feedflow_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading FeedFlow...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return <FeedReader />;
};

export default Index;
