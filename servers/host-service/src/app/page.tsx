import { 
  LandingHero, 
  FeaturesGrid, 
  CodeExample, 
  LiveDemo 
} from "@/components/landing"

/**
 * Curia Host Service Landing Page
 * 
 * Professional landing page showcasing the Web3 forum embed platform
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <LandingHero />
      <FeaturesGrid />
      <CodeExample />
      <LiveDemo />
    </main>
  );
} 