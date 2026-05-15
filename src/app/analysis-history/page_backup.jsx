// src/app/analysis-history/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronRight, ChevronLeft, Search, RefreshCw, Copy, Trash2 } from 'lucide-react';
import { toast } from "sonner";

// Import new shadcn UI components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Helper function to count words in a text
const countWords = (text) => {
  if (!text) return 0;
  return text.split(/\s+/).filter(word => word.length > 0).length;
};

// Helper function to detect category based on comments content instead of summary
const detectCategory = (item) => {
  // If no comments data available, try to use summary as fallback or return uncategorized
  if (!item.comments && !item.summary) return 'Uncategorized';
  
  // Use comments if available, otherwise fallback to summary
  const textToAnalyze = item.comments || item.summary;
  
  const lowercaseText = textToAnalyze.toLowerCase();
  
  // Define category keywords
  const categories = {
    'Technology': ['computer', 'software', 'hardware', 'tech', 'digital', 'app', 'internet', 'code', 'programming', 'tutorial', 'developer', 'gadget', 'device'],
    'Science': ['research', 'study', 'scientist', 'discovery', 'experiment', 'scientific', 'physics', 'chemistry', 'biology', 'theory', 'hypothesis', 'laboratory'],
    'Business': ['company', 'startup', 'market', 'industry', 'entrepreneur', 'finance', 'investment', 'stock', 'revenue', 'profit', 'business', 'corporate', 'economy'],
    'Health': ['medical', 'health', 'disease', 'treatment', 'doctor', 'patient', 'medicine', 'wellness', 'fitness', 'diet', 'exercise', 'symptoms', 'therapy'],
    'Education': ['learn', 'student', 'teacher', 'school', 'university', 'education', 'academic', 'course', 'knowledge', 'lesson', 'lecture', 'homework', 'study'],
    'Entertainment': ['movie', 'film', 'music', 'entertainment', 'actor', 'performance', 'video', 'show', 'game', 'play', 'funny', 'comedy', 'song', 'album', 'artist'],
    'Politics': ['government', 'policy', 'election', 'political', 'vote', 'president', 'congress', 'democracy', 'law', 'candidate', 'party', 'campaign', 'legislation'],
    'Sports': ['team', 'player', 'tournament', 'championship', 'trophy', 'match', 'win', 'sport', 'athlete', 'game', 'league', 'score', 'coach', 'racing'],
    'Gaming': ['game', 'gaming', 'player', 'playthrough', 'streamer', 'level', 'character', 'console', 'pc gaming', 'minecraft', 'fps', 'mmorpg', 'rpg'],
    'Fashion': ['fashion', 'style', 'clothing', 'outfit', 'designer', 'trend', 'model', 'beauty', 'makeup', 'accessory', 'haul', 'shopping'],
    'Food': ['recipe', 'cook', 'food', 'restaurant', 'meal', 'ingredient', 'chef', 'cuisine', 'delicious', 'baking', 'cooking', 'kitchen', 'taste', 'flavor'],
    'Travel': ['travel', 'destination', 'trip', 'vacation', 'hotel', 'flight', 'tourist', 'adventure', 'beach', 'mountain', 'explore', 'vlog', 'tour', 'guide']
  };
  
  // Special case for sports content
  if (lowercaseText.includes('champions trophy') || 
      lowercaseText.includes('trophy') || 
      lowercaseText.includes('championship') ||
      lowercaseText.includes('vs') ||
      /ind\s*vs\s*nz/i.test(lowercaseText)) {
    return 'Sports';
  }
  
  // Count matches for each category
  const categoryScores = {};
  
  for (const [category, keywords] of Object.entries(categories)) {
    categoryScores[category] = 0;
    
    for (const keyword of keywords) {
      // Simple includes check
      const matches = (lowercaseText.match(new RegExp('\\b' + keyword + '\\b', 'gi')) || []).length;
      if (matches > 0) {
        // Give more weight based on frequency
        categoryScores[category] += matches;
      }
    }
  }
  
  // If no matches, return Uncategorized
  const maxScore = Math.max(...Object.values(categoryScores));
  if (maxScore === 0) {
    return 'Uncategorized';
  }
  
  // Find all categories with the highest score (handle ties)
  const topCategories = Object.entries(categoryScores)
    .filter(([_, score]) => score === maxScore)
    .map(([category, _]) => category);
  
  // Return multiple categories if there's a tie (up to 2)
  if (topCategories.length > 1) {
    return topCategories.slice(0, 2).join(' / ');
  } else {
    return topCategories[0];
  }
};

// Fetch comments for an item if needed
const fetchCommentsForItem = async (item) => {
  // If we already have comments data or the item doesn't have a videoId/url, skip
  if (item.comments || (!item.videoId && !item.url)) {
    return item;
  }
  
  try {
    // Fetch comments using the YouTube API route
    const response = await fetch('/api/youtube-analyzer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: item.url,
        type: item.type || 'video'
      }),
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch comments for ${item.title}`);
      return item;
    }
    
    const data = await response.json();
    
    // Merge comments data with existing item
    return {
      ...item,
      comments: Array.isArray(data.comments) ? data.comments.join(' ') : ''
    };
  } catch (error) {
    console.error('Error fetching comments:', error);
    return item;
  }
};

// Process history items to add word counts and categories
const processHistoryItems = async (items) => {
  const processedItems = [];
  
  for (const item of items) {
    // First try to fetch comments if not already present
    let processedItem = await fetchCommentsForItem(item);
    
    // Then add word count and detect category
    processedItem = {
      ...processedItem,
      wordCount: processedItem.wordCount || countWords(processedItem.summary),
      category: processedItem.category || detectCategory(processedItem)
    };
    
    processedItems.push(processedItem);
  }
  
  return processedItems;
};

// API service for getting analysis history
const fetchAnalysisHistory = async () => {
  try {
    const response = await fetch('/api/analysis-history');
    if (!response.ok) throw new Error('Failed to fetch history');
    const data = await response.json();
    return await processHistoryItems(data);
  } catch (error) {
    console.error('Error fetching history:', error);
    throw error;
  }
};

// API service for deleting an analysis entry
const deleteAnalysisEntry = async (id) => {
  try {
    const response = await fetch(`/api/analysis-history/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete entry');
    return await response.json();
  } catch (error) {
    console.error('Error deleting entry:', error);
    throw error;
  }
};

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all');
  
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  
  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredHistory.slice(startIndex, endIndex);
  };

  // Fetch analysis history on component mount
  useEffect(() => {
    const getHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const historyData = await fetchAnalysisHistory();
        setHistory(historyData);
        setFilteredHistory(historyData);
      } catch (error) {
        toast.error("Failed to load analysis history");
      } finally {
        setIsLoadingHistory(false);
      }
    };
    getHistory();
  }, []);

  // Apply filters (both search and time)
  useEffect(() => {
    let filtered = [...history];
    
    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (timeFilter) {
        case '7days':
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '1month':
          cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case '3months':
          cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case '6months':
          cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
          break;
        case '9months':
          cutoffDate = new Date(now.setMonth(now.getMonth() - 9));
          break;
        case '1year':
          cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          cutoffDate = null;
      }
      
      if (cutoffDate) {
        filtered = filtered.filter(item => new Date(item.date) >= cutoffDate);
      }
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const lowercaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => 
        item.title?.toLowerCase().includes(lowercaseQuery) ||
        item.url?.toLowerCase().includes(lowercaseQuery) ||
        item.summary?.toLowerCase().includes(lowercaseQuery) ||
        item.comments?.toLowerCase().includes(lowercaseQuery)
      );
    }
    
    setFilteredHistory(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [searchQuery, timeFilter, history]);

  // // Handle refresh
  // const handleRefresh = async () => {
  //   setIsLoadingHistory(true);
  //   try {
  //     const historyData = await fetchAnalysisHistory();
  //     setHistory(historyData);
  //     toast.success("History refreshed");
  //   } catch (error) {
  //     toast.error("Failed to refresh history");
  //   } finally {
  //     setIsLoadingHistory(false);
  //   }
  // };

  // Copy summary function
  const handleCopySummary = (summary, e) => {
    e.stopPropagation();
    if (!summary) {
      toast.error("No summary available to copy");
      return;
    }
    
    navigator.clipboard.writeText(summary)
      .then(() => {
        toast.success("Summary copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy summary");
      });
  };

  // Handle delete entry
  const handleDeleteEntry = async (id, e) => {
    e?.stopPropagation();
    if (window.confirm("Are you sure you want to delete this analysis? This action cannot be undone.")) {
      setIsDeletingId(id);
      try {
        await deleteAnalysisEntry(id);
        
        // Update local state
        const updatedHistory = history.filter(item => item.id !== id);
        setHistory(updatedHistory);
        
        toast.success("Analysis deleted successfully");
      } catch (error) {
        toast.error("Failed to delete analysis");
      } finally {
        setIsDeletingId(null);
      }
    }
  };

  // Function to recategorize an item 
  const handleRecategorize = async (id) => {
    const item = history.find(item => item.id === id);
    if (!item) {
      toast.error("Item not found");
      return;
    }
    
    try {
      // Try to fetch fresh comments if needed
      const updatedItem = await fetchCommentsForItem(item);
      
      // Recalculate category based on comments
      const newCategory = detectCategory(updatedItem);
      
      // If category has changed, update it
      if (newCategory !== item.category) {
        // Create updated item
        const itemWithNewCategory = {
          ...updatedItem,
          category: newCategory
        };
        
        // Update local state
        const updatedHistory = history.map(h => h.id === id ? itemWithNewCategory : h);
        setHistory(updatedHistory);
        
        // Optionally save to backend
        try {
          await fetch('/api/analysis-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(itemWithNewCategory),
          });
        } catch (error) {
          console.error('Failed to save updated category to backend:', error);
        }
        
        toast.success(`Category updated to: ${newCategory}`);
      } else {
        toast.info("Category remains the same");
      }
    } catch (error) {
      toast.error("Failed to recategorize");
      console.error('Error recategorizing:', error);
    }
  };

  return (
    <div className="container mx-auto py-6 px-2.5 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Analysis History</h1>

      {/* Search and Filter Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search analyses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="1month">Last month</SelectItem>
                  <SelectItem value="3months">Last 3 months</SelectItem>
                  <SelectItem value="6months">Last 6 months</SelectItem>
                  <SelectItem value="9months">Last 9 months</SelectItem>
                  <SelectItem value="1year">Last year</SelectItem>
                </SelectContent>
              </Select>
              
              {/* <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={isLoadingHistory}
              >
                {isLoadingHistory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      <div className="space-y-4">
        {isLoadingHistory ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredHistory.length > 0 ? (
          <>
            {getCurrentPageItems().map((item, index) => (
              <div key={index} className="border rounded-lg overflow-hidden shadow-sm hover:shadow transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Analyzed on {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button 
                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                        onClick={(e) => handleCopySummary(item.summary, e)}
                        title="Copy summary"
                        aria-label="Copy summary to clipboard"
                      >
                        <Copy className="h-4 w-4 text-gray-500" />
                      </button>
                      <button 
                        className="p-1.5 rounded-full hover:bg-red-50 transition-colors"
                        onClick={(e) => handleDeleteEntry(item.id, e)}
                        disabled={isDeletingId === item.id}
                        title="Delete entry"
                        aria-label="Delete this analysis"
                      >
                        {isDeletingId === item.id ? (
                          <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mt-3 line-clamp-2">
                    {item.summary || "No summary available"}
                  </p>
                  
                  <div className="flex items-center mt-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">{item.wordCount || 0}</span>
                      <span className="ml-1">words</span>
                    </div>
                    <div className="mx-2 h-4 border-l border-gray-300"></div>
                    <div className="flex items-center">
                      <div 
                        className="px-2 py-0.5 bg-gray-100 rounded-md text-sm text-gray-600 cursor-pointer hover:bg-gray-200"
                        onClick={() => handleRecategorize(item.id)}
                        title="Click to recategorize based on comments"
                      >
                        {item.category || "Uncategorized"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination with shadcn UI components */}
            <div className="mt-6 flex items-center justify-between">
              {/* <div className="text-sm text-gray-500">
                Showing {filteredHistory.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredHistory.length)} of {filteredHistory.length} results
              </div> */}
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {/* First page */}
                  {currentPage > 2 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(1)}>
                        1
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Ellipsis if needed */}
                  {currentPage > 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {/* Previous page if not first */}
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(currentPage - 1)}>
                        {currentPage - 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Current page */}
                  <PaginationItem>
                    <PaginationLink isActive>{currentPage}</PaginationLink>
                  </PaginationItem>
                  
                  {/* Next page if not last */}
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(currentPage + 1)}>
                        {currentPage + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Ellipsis if needed */}
                  {currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {/* Last page */}
                  {currentPage < totalPages - 1 && totalPages > 1 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      aria-disabled={currentPage === totalPages || totalPages === 0}
                      className={currentPage === totalPages || totalPages === 0 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border">
            <p className="text-gray-500 mb-2">No analyses found</p>
            {(searchQuery || timeFilter !== 'all') && (
              <p className="text-sm text-gray-400">
                Try adjusting your search criteria or time filter
              </p>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-500 mt-8">
        © 2025 YouTube Analyzer. All rights reserved.
      </div>
    </div>
  );
}