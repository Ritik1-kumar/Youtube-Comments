// src/app/analysis-history/[id]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, ExternalLink, Copy, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from "sonner";

export default function AnalysisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const fetchAnalysisDetails = async () => {
      if (!params.id) return;
      
      setIsLoading(true);
      try {
        // Check if you have a userId from auth context or other source
        // This will depend on how authentication is implemented in your app
        const userId = localStorage.getItem('userId') || 
                       sessionStorage.getItem('userId') || 
                       // Add any other potential sources
                       ''; // Fallback empty string for debugging
        
        console.log('Fetching analysis with ID:', params.id);
        console.log('Using userId:', userId);
        
        // Try without userId first if you're unsure about the auth setup
        const response = await fetch(`/api/analysis-history/${params.id}`);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error response:', errorData);
          throw new Error(`Failed to fetch analysis details: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Analysis data fetched successfully:', data);
        setAnalysisData(data);
        
        // Initialize QA history if it exists in the data
        if (data.qaHistory && Array.isArray(data.qaHistory)) {
          setQaHistory(data.qaHistory);
        }
      } catch (error) {
        console.error('Error fetching analysis details:', error);
        toast.error(`Failed to load analysis details: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalysisDetails();
  }, [params.id]);
  
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim() || !analysisData) return;
    
    setIsLoadingAnswer(true);
    const currentQuestion = question.trim();
    
    try {
      // Call the API to get answer about the comments
      const response = await fetch('/api/question-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion,
          videoId: analysisData.videoId,
          comments: analysisData.comments,
          url: analysisData.url
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get answer');
      }
      
      const data = await response.json();
      
      // Check if this question has already been asked
      const questionExists = qaHistory.some(qa => qa.question.toLowerCase() === currentQuestion.toLowerCase());
      
      if (questionExists) {
        toast.info("This question has been asked before. Adding new answer.");
      }
      
      // Create new QA entry
      const newQaEntry = {
        question: currentQuestion,
        answer: data.answer,
        isFallback: data.isFallback || false,
        timestamp: new Date().toISOString()
      };
      
      // Update QA history
      const updatedQaHistory = [...qaHistory, newQaEntry];
      setQaHistory(updatedQaHistory);
      
      // Clear the question input
      setQuestion('');
      
      // If this was a fallback answer, show a toast notification
      if (data.isFallback) {
        toast.warning("Using fallback answer due to limited data or technical issues");
      }
    } catch (error) {
      console.error('Error getting answer:', error);
      
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
  
  // Handle delete entry
  const handleDeleteEntry = async (e) => {
    e?.preventDefault();
    if (window.confirm("Are you sure you want to delete this analysis? This action cannot be undone.")) {
      setIsDeleting(true);
      try {
        // Get userId from multiple possible sources for reliability
        const userId = localStorage.getItem('userId') || 
                       sessionStorage.getItem('userId') || 
                       (analysisData?.userId); // Fallback to the userId in the analysis data if available
        
        // Log for debugging
        console.log('Attempting to delete analysis:', params.id);
        console.log('Using userId for deletion:', userId);
        
        // Make sure userId is included in the URL
        const response = await fetch(`/api/analysis-history/${params.id}?userId=${encodeURIComponent(userId || '')}`, {
          method: 'DELETE',
        });
        
        console.log('Delete response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error response:', errorData);
          throw new Error(`Failed to delete analysis: ${errorData.error || response.statusText}`);
        }
        
        toast.success("Analysis deleted successfully");
        router.push('/analysis-history');
      } catch (error) {
        console.error('Failed to delete analysis:', error);
        toast.error(`Failed to delete analysis: ${error.message}`);
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  const handleCopySummary = () => {
    if (!analysisData?.summary) {
      toast.error("No summary available to copy");
      return;
    }
    
    navigator.clipboard.writeText(analysisData.summary)
      .then(() => {
        toast.success("Summary copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy summary");
      });
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }
  
  if (!analysisData) {
    return (
      <div className="container mx-auto pb-24 pt-1 md:pb-32 lg:pb-46 lg:pt-44">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Analysis Not Found</h2>
          <Button className='cursor-pointer' onClick={() => router.push('/analysis-history')}>
            Back to History
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl pt-28 md:pb-32 lg:pb-46 lg:pt-44">
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.push('/analysis-history')}
          className="mb-4 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Button>
        
        <h1 className="text-2xl font-bold">Analysis Details</h1>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-0 md:pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-shrink-0">
              <img
                src={analysisData.thumbnail || '/api/placeholder/160/120'}
                alt="Thumbnail"
                className="w-full md:w-40 md:h-30 object-cover"
              />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">
                {analysisData.title}
              </h2>

              <div className="inline-flex items-center text-xs bg-green-100 text-green-800 rounded-full px-2 py-1 mb-2">
                <RefreshCw className="h-3 w-3 mr-1" />
                Analyzed on {new Date(analysisData.date).toLocaleDateString()}
              </div>

              {analysisData.type === 'video' ? (
                <div className="text-sm text-gray-500 flex flex-col gap-1">
                  <div className="flex items-center">
                    <span className="inline-block mr-2"> Published: {analysisData.publishedDate || 'Date unknown'}</span>
                  </div>
                  <div className="flex items-center">
                    <span>
                        {analysisData.commentCount ? `${analysisData.commentCount} comments analyzed` : 'Unknown number of comments'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Latest Videos:</h3>
                  <div className="space-y-3">
                    {analysisData.videos?.map((video, index) => (
                      <div key={index} className="border rounded-md p-3">
                        <div className="font-medium">{video.title}</div>
                        <div className="text-sm text-gray-500 flex justify-between mb-1">
                          <span>Published: {video.publishedDate}</span>
                          <span>{video.commentCount} comments</span>
                        </div>
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View on YouTube
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-semibold mb-3">Comments Summary</h3>
            <p className="text-gray-700 whitespace-pre-line">
              {analysisData.summary || "No summary available."}
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
                  className='cursor-pointer'
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
        
        <CardFooter className="border-t pt-4 flex flex-wrap gap-3 justify-between">
          <Button variant="outline" size="sm" onClick={handleCopySummary} className='cursor-pointer'>
            <Copy className="h-4 w-4 mr-2" />
            Copy Summary
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDeleteEntry}
            disabled={isDeleting}
            className='cursor-pointer'
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Analysis
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}