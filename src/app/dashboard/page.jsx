// src/app/dashboard/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Youtube, ChevronRight, History } from "lucide-react";
import { checkSearchAvailability } from "@/lib/stripe";

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [userPlan, setUserPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentAnalyses, setRecentAnalyses] = useState([]);

  useEffect(() => {
    const fetchUserPlanAndAnalyses = async (user) => {
      if (currentUser) {
        try {
          // Fetch user plan information
          const planInfo = await checkSearchAvailability(currentUser.uid);
          setUserPlan(planInfo);
          
          const response = await fetch(`/api/analysis-history/all`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentUser.uid}`
            }
          });
          if (!response.ok) {
            throw new Error('Failed to fetch history');
          }
          const analyses = await response.json();
            setRecentAnalyses(analyses.slice(0, 5));
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUserPlanAndAnalyses(currentUser);
  }, [currentUser]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto pb-12 px-4 pt-28 md:pb-32 lg:pb-40 lg:pt-46">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex gap-2">
              <Link href="/analysis-history">
                <Button variant="outline">Analysis History</Button>
              </Link>
              <Link href="/youtube-analyzer">
                <Button>
                  <Youtube className="mr-2 h-4 w-4" />
                  New Analysis
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WelcomeCard user={currentUser} />
            <SubscriptionCard userPlan={userPlan} />
            <StatsCard userPlan={userPlan} analyses={recentAnalyses} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Analyses
                </CardTitle>
                <CardDescription>
                  Your most recent YouTube comment analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {console.log(recentAnalyses)}
                {recentAnalyses.length > 0 ? (
                  <div className="space-y-4">
                    {recentAnalyses.map((analysis) => (
                      <Link
                        key={analysis.id}
                        className={`flex w-full items-center justify-between border p-3 rounded-md hover:bg-gray-50 transition-colors text-left cursor-pointer`}
                        href={`/analysis-history/${analysis.id}`}
                      >
                        <div className="flex flex-wrap items-center gap-4">
                          <img
                            src={analysis.thumbnail || `/api/placeholder/64/48`}
                            alt={analysis.title || "YouTube content"}
                            className="w-full md:w-12 md:h-12 object-cover rounded-md overflow-hidden"
                          />
                          <div>
                            <h4 className="font-medium">{analysis.title}</h4>
                            <p className="text-sm text-gray-500">
                              Analyzed on {new Date(analysis.date).toLocaleDateString()}
                            </p>
                            {analysis.qaHistory && analysis.qaHistory.length > 0 && (
                              <p className="text-xs text-gray-400">
                                {analysis.qaHistory.length} question{analysis.qaHistory.length !== 1 ? 's' : ''} asked
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">You haven't performed any analyses yet</p>
                    <Button onClick={() => router.push('/youtube-analyzer')}>
                      Start Analyzing
                    </Button>
                  </div>
                )}
              </CardContent>
              {recentAnalyses.length > 0 && (
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => router.push('/analysis-history')}>
                    View All Analyses
                  </Button>
                </CardFooter>
              )}
            </Card>
            
            {/* <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Tools to help you analyze YouTube content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => router.push('/youtube-analyzer')}
                >
                  <Search className="mr-2 h-4 w-4" />
                  New Video Analysis
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/youtube-analyzer?type=channel')}
                >
                  <Youtube className="mr-2 h-4 w-4" />
                  New Channel Analysis
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/reports')}
                >
                  <BarChart className="mr-2 h-4 w-4" />
                  Analytics Reports
                </Button>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function WelcomeCard({ user }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, {user?.displayName || "User"}!</CardTitle>
        <CardDescription>
          You're logged in with {user?.email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Use the dashboard to analyze YouTube comments, 
          track your usage, and gain insights about your audience.
        </p>
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({ userPlan }) {
  const router = useRouter();
  
  // Determine plan name based on ID
  const getPlanName = (planId) => {
    if (!planId) return 'Free';
    if (planId.includes('price_1R1Pn0E8ZRUXcvaUN5frxwpt')) return 'Basic';
    if (planId.includes('price_1R1PnPE8ZRUXcvaU90jXxoxE')) return 'Pro';
    return 'Free';
  };
  
  const planName = getPlanName(userPlan?.plan);
  
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Your Subscription</CardTitle>
        <CardDescription>
          Current plan and usage
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="text-center space-y-2 mb-4">
          <p className="text-xl font-bold">{planName} Plan</p>
          <div className="bg-muted h-3 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full" 
              style={{ 
                width: `${Math.min(100, (userPlan?.searchesUsed / userPlan?.searchLimit) * 100)}%` 
              }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground">
            {userPlan?.searchesUsed} / {userPlan?.searchLimit} searches used
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => router.push('/subscription')}
        >
          {planName === 'Free' ? 'Upgrade Plan' : 'Manage Subscription'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function StatsCard({ userPlan, analyses }) {
  // Calculate total videos and comments (example implementation)
  const totalVideos = analyses.filter(a => a.type === 'video').length;
  const totalChannels = analyses.filter(a => a.type === 'channel').length;
  const totalSaved = totalVideos + totalChannels;

  console.log(analyses)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Stats</CardTitle>
        <CardDescription>
          Usage statistics and analysis metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-primary/10 rounded-lg items-center flex flex-col justify-center">
            <p className="text-2xl font-bold">{userPlan?.searchesUsed || 0}</p>
            <p className="text-sm text-muted-foreground">Videos Analyzed</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg items-center flex flex-col justify-center">
            <p className="text-2xl font-bold">{totalSaved}</p>
            <p className="text-sm text-muted-foreground">Videos Saved</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg col-span-2 items-center flex flex-col justify-center">
            <p className="text-2xl font-bold">{userPlan?.searchLimit - userPlan?.searchesUsed || 0}</p>
            <p className="text-sm text-muted-foreground">Searches Remaining</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}