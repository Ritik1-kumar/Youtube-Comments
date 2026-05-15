// src/app/youtube-analyzer/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Save, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext'; // Import the auth context
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { checkSearchAvailability, incrementSearchCount } from '@/lib/stripe';
import Link from "next/link";
import { useRouter } from 'next/navigation';

// API service for YouTube data fetching
const fetchYouTubeData = async (url) => {
  try {
    // Determine if it's a video or channel URL
    const isChannel = url.includes('@');
    const type = isChannel ? 'channel' : 'video';

    // In a real implementation, you would call your backend API here
    // For example:
    const response = await fetch('/api/youtube-analyzer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('API response not OK:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('YouTube data fetched successfully:', data);
    return data;
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    throw error;
  }
};

// API service for asking questions about comments
const askQuestionAboutComments = async (url, question) => {
  try {
    const response = await fetch('/api/youtube-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, question })
    });

    if (!response.ok) {
      throw new Error('Failed to get answer');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting answer:', error);
    throw error;
  }
};

// API service for saving analysis to history
const saveToHistory = async (analysisData, user) => {
  try {
    // Make sure userId is included
    if (!user || !user.uid) {
      toast.error("You must be logged in to save analysis");
      return;
    }
    
    // Add user ID to the data
    const dataWithUser = {
      ...analysisData,
      userId: user.uid
    };
    
    const response = await fetch('/api/analysis-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataWithUser),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save analysis');
    }
    
    toast.success("Analysis saved to history");
    return data;
  } catch (error) {
    console.error('Error saving to history:', error);
    toast.error(error.message || "Failed to save analysis to history");
    throw error;
  }
};

// API service for getting analysis history
const fetchAnalysisHistory = async (user) => {
  try {
    // Fetch all records without userId filter
    const response = await fetch(`/api/analysis-history/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.uid}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }
    const allHistoryData = await response.json();    
    return allHistoryData.slice(0,5);
  } catch (error) {
    console.error('Error fetching history:', error);
    throw error;
  }
};

function YouTubeCommentsAnalyzer() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const { currentUser } = useAuth(); // Get the current user from auth context
  const router = useRouter();

  // Fetch analysis history on component mount
  useEffect(() => {
    const getHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const historyData = await fetchAnalysisHistory(currentUser);
        console.log(`Retrieved ${historyData.length} history items matching current user`);
        setHistory(historyData);
      } catch (error) {
        toast.error("Failed to load analysis history");
        console.error("History fetch error:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    const fetchUserPlanAndAnalyses = async () => {
      if (currentUser) {
        try {
          // Fetch user plan information
          const planInfo = await checkSearchAvailability(currentUser.uid);
          setUserPlan(planInfo);
          
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setIsLoadingAnswer(false);
        }
      }
    };
    fetchUserPlanAndAnalyses();
    getHistory();
  }, [currentUser]); // Depend on user UID to refetch when user changes

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    if (!currentUser) {
      toast.error("You must be logged in to analyze YouTube content");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisData(null);
    setQuestion('');
    setQaHistory([]);
    setCurrentAnalysisId(null);

    try {
      const data = await fetchYouTubeData(url);
      setAnalysisData(data);
      incrementSearchCount(currentUser.uid);
      
      // Check if this URL already exists in history
      const existingItem = history.find(item => item.url === url);
      if (existingItem) {
        setCurrentAnalysisId(existingItem.id);
        // Load existing QA history if available
        if (existingItem.qaHistory && Array.isArray(existingItem.qaHistory) && existingItem.qaHistory.length > 0) {
          setQaHistory(existingItem.qaHistory);
          toast.info(`Loaded ${existingItem.qaHistory.length} existing question${existingItem.qaHistory.length !== 1 ? 's' : ''} from history`);
        }
      }
      
    } catch (error) {
      toast.error(error.message || "Failed to analyze the YouTube content");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || !url.trim() || !analysisData) return;
  
    setIsLoadingAnswer(true);
    const currentQuestion = question.trim();
  
    try {
      const data = await askQuestionAboutComments(url, currentQuestion);
      
      // Check if this question has already been asked
      const questionExists = qaHistory.some(qa => qa.question.toLowerCase() === currentQuestion.toLowerCase());
      
      if (questionExists) {
        toast.info("This question has been asked before. Adding new answer.");
      }
      
      // Add the new question-answer pair to the history
      setQaHistory(prevHistory => [
        ...prevHistory,
        {
          question: currentQuestion,
          answer: data.answer,
          timestamp: new Date().toISOString(),
          isFallback: data.fallback || false  // Track if this is a fallback answer
        }
      ]);
      
      // If this was a fallback answer, show a toast notification
      if (data.fallback) {
        toast.warning("Using fallback answer due to limited data or technical issues");
      }
      
      // Clear the input field for the next question
      setQuestion('');
    } catch (error) {
      // Add the question with a generic fallback answer
      setQaHistory(prevHistory => [
        ...prevHistory,
        {
          question: currentQuestion,
          answer: "I couldn't analyze the comments at this time. Please try again later or ask a different question.",
          timestamp: new Date().toISOString(),
          isFallback: true
        }
      ]);
      toast.error("Failed to get an answer for your question");
      setQuestion('');
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!analysisData) return;
    if (!currentUser) {
      toast.error("You must be logged in to save analysis to history");
      return;
    }
    
    setIsSaving(true);
  
    try {
      const result = await saveToHistory({
        id: currentAnalysisId, // Pass the ID if we're updating
        url,
        title: analysisData.title,
        thumbnail: analysisData.thumbnail,
        date: new Date().toISOString(),
        type: analysisData.type,
        summary: analysisData.summary,
        qaHistory: qaHistory,
        userId: currentUser.uid // This is redundant now but keeping for clarity
      }, currentUser); // Pass the currentUser as a second parameter
  
      // Refresh history
      const historyData = await fetchAnalysisHistory(currentUser);
      setHistory(historyData);
      
      // Update current analysis ID if we just created a new entry
      if (!currentAnalysisId && result.id) {
        setCurrentAnalysisId(result.id);
      }
  
      if (result.updated) {
        toast.success("Analysis updated in history");
      } else {
        toast.success("Analysis saved to history");
      }
    } catch (error) {
      toast.error("Failed to save analysis to history");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySummary = () => {
    if (!analysisData?.summary) return;

    navigator.clipboard.writeText(analysisData.summary);

    toast.success("Summary copied to clipboard");
  };

  const navigateToAnalysisDetail = (historyItem) => {
    // Verify this item belongs to the current user
    if (historyItem.userId !== currentUser?.uid) {
      toast.error("You don't have permission to view this analysis");
      return;
    }
    
    // Navigate to the analysis detail page
    router.push(`/analysis-history/${historyItem.id}`);
  };

  return (
    <div className="container mx-auto pb-12 pt-28 px-4 md:pb-32 lg:pb-35 lg:pt-46">
      <h1 className="text-2xl font-bold mb-6 text-center">Analyze YouTube Comments</h1>
      {userPlan && (
        userPlan.remaining <= 0 ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-md mb-6">
            You have reached your search limit. Please upgrade your plan to continue analyzing.
          </div>
        ) : (
          <Card className="mb-6">
            <CardContent>
              <div className="flex flex-col gap-4 md:gap-0 md:flex-row items-center space-x-2">
                <Input
                  placeholder="Paste YouTube channel URL or video URL here..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                  disabled={isAnalyzing}
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !url.trim()}
                  className="whitespace-nowrap"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Comments'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {analysisData && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-shrink-0">
                <img
                  src={analysisData.thumbnail || '/api/placeholder/160/120'}
                  alt="Thumbnail"
                  className="w-40 h-30 object-cover rounded-md"
                  crossOrigin="anonymous"
                />
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-1">
                  {analysisData.title}
                </h2>

                {currentAnalysisId && (
                  <div className="inline-flex items-center text-xs bg-green-100 text-green-800 rounded-full px-2 py-1 mb-2">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Previously analyzed
                  </div>
                )}

                {analysisData.type === 'video' ? (
                  <div className="text-sm text-gray-500 flex flex-col gap-1">
                    <div className="flex items-center">
                      <span className="inline-block mr-2">Published: {analysisData.publishedDate}</span>
                    </div>
                    <div className="flex items-center">
                      <span>{analysisData.commentCount} comments analyzed</span>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-48 w-full">
                    <div className="space-y-2">
                      {analysisData.videos?.map((video, index) => (
                        <div key={index} className="border-b pb-2">
                          <div className="font-medium">{video.title}</div>
                          <div className="text-sm text-gray-500 flex justify-between">
                            <span>Published: {video.publishedDate}</span>
                            <span>{video.commentCount} comments</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <div>
              <h3 className="text-lg font-semibold mb-3">Comments Summary</h3>
              <p className="text-gray-700 whitespace-pre-line">
                {analysisData.summary}
              </p>
            </div>

            <div className="mt-6">
              <form onSubmit={handleQuestionSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a specific question about the comments..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={isLoadingAnswer}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!question.trim() || isLoadingAnswer}
                    size="sm"
                  >
                    {isLoadingAnswer ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Ask'
                    )}
                  </Button>
                </div>
              </form>
              
              {/* Display all questions and answers */}
              {qaHistory.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-semibold">Questions & Answers ({qaHistory.length})</h4>
                  </div>
                  <ScrollArea className="h-64 w-full">
                    <div className="space-y-4">
                      {qaHistory.map((qa, index) => (
                        <div key={index} className={`p-4 rounded-md border ${qa.isFallback ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'}`}>
                          <div className="font-medium text-gray-900 mb-1">
                            Q: {qa.question}
                          </div>
                          <div className="text-gray-700">
                            A: {qa.answer}
                          </div>
                          {qa.isFallback && (
                            <div className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded mt-2 inline-block">
                              Fallback Answer
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(qa.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="border-t pt-4 flex justify-between">
            <Button variant="outline" size="sm" onClick={handleCopySummary}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Summary
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSaveToHistory}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {currentAnalysisId ? 'Update in History' : 'Save to History'}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-2">
              {history.map((item, index) => (
                <button
                  key={index}
                  className={`flex w-full cursor-pointer items-center justify-between border p-3 rounded-md hover:bg-gray-50 transition-colors text-left ${item.id === currentAnalysisId ? 'bg-blue-50 border-blue-200' : ''}`}
                  onClick={() => navigateToAnalysisDetail(item)}
                >
                  <div className="flex items-center flex-wrap gap-4">
                    <img
                      src={item.thumbnail || `/api/placeholder/64/48`}
                      alt={item.title || "YouTube content"}
                      className="w-full md:h-12 md:w-12 object-cover rounded-md overflow-hidden"
                    />
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-gray-500">
                        Analyzed on {new Date(item.date).toLocaleDateString()}
                      </p>
                      {item.qaHistory && item.qaHistory.length > 0 && (
                        <p className="text-xs text-gray-400">
                          {item.qaHistory.length} question{item.qaHistory.length !== 1 ? 's' : ''} asked
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              ))}
              <Link href="/analysis-history">
                <Button variant="outline" className="w-full">
                      View All Analyses
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No analysis history yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Wrap the component with ProtectedRoute
export default function ProtectedAnalysisPage() {
  return (
    <ProtectedRoute>
      <YouTubeCommentsAnalyzer />
    </ProtectedRoute>
  );
}