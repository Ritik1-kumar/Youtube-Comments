// src/app/page.jsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Lightbulb, ChartLine, Rocket  } from 'lucide-react'
import HeroSection from "@/components/hero-section";
import Features from "@/components/features-4";
import PricingComparator from "@/components/pricing-comparator";
import ContentSection from "@/components/content-1";
import PricingPage from "@/app/pricing/page"
import ContentSectionReverse from "@/components/content-7";
import CallToAction from "@/components/call-to-action";

export default function HomePage() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    );
  }

  return (
    <div>
        <main className="overflow-x-hidden">
          <HeroSection />

          <Features />

          <PricingComparator />

          <ContentSection />

          <PricingPage />

          <ContentSectionReverse />

          <CallToAction />

        </main>

      {/* <div className="container mx-auto py-12 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold">Analyze YouTube Comments with AI</h2>
          <p className="text-xl text-muted-foreground">
            Get valuable insights from your YouTube video comments with our advanced analysis tools.
          </p>

          {currentUser ? (
            <div className="flex justify-center gap-4 mt-4">
            <Link href="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
            <Link href="/youtube-analyzer">
              <Button size="lg" variant="outline">Analyze</Button>
            </Link>
            <Link href="/analysis-history">
              <Button size="lg" variant="outline">History</Button>
            </Link>
            </div>
          ) : (
            <div className="flex justify-center gap-4 mt-4">
              <Link href="/signup">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">Log in</Button>
              </Link>
              <Link href="/youtube-analyzer">
                <Button size="lg" variant="outline">Analyze</Button>
              </Link>
              <Link href="/analysis-history">
                <Button size="lg" variant="outline">History</Button>
              </Link>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <FeatureCard 
            title="Sentiment Analysis" 
            description="Understand the emotional tone of comments and identify positive and negative feedback."
          />
          <FeatureCard 
            title="Key Topics" 
            description="Discover the most discussed topics and themes in your video comments."
          />
          <FeatureCard 
            title="Engagement Metrics" 
            description="Track user engagement and identify trends in viewer interactions."
          />
        </div>
      </div> */}
    </div>
  );
}

// function FeatureCard({ title, description }) {
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>{title}</CardTitle>
//       </CardHeader>
//       <CardContent>
//         <p>{description}</p>
//       </CardContent>
//     </Card>
//   );
// }