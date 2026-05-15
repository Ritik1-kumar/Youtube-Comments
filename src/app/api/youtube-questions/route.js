// src/app/api/youtube-questions/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';

// Initialize the YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Add this to your .env file
});

// Fallback answers for different scenarios
const fallbackAnswers = {
  noComments: "No comments were found for this video. This could be because comments are disabled, the video is very new, or there's an issue with the YouTube API. Try analyzing a different video with an active comment section.",

  apiError: "I couldn't analyze the comments at this time due to a technical issue. This might be due to API rate limits or a temporary service disruption. Please try again in a few minutes.",

  processingError: "While processing your question, I encountered an issue. Your question might be too complex for the available comment data, or there may be a problem with our analysis system. Try asking a simpler or more specific question.",

  insufficientData: "There's not enough comment data to provide a meaningful answer to your question. This video might have too few comments or the comments may not contain relevant information about your specific question.",

  general: "I apologize, but I couldn't generate a specific answer based on the comment data. This might be because the comments don't contain information relevant to your question, or because of technical limitations in our analysis system."
};

export async function POST(req) {
  try {
    const { url, question } = await req.json();

    if (!url || !question) {
      return NextResponse.json({
        answer: "Please provide both a valid YouTube URL and a question to analyze.",
        fallback: true
      }, { status: 400 });
    }

    // Extract video ID from URL
    const videoRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(videoRegex);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      return NextResponse.json({
        answer: "The URL you provided doesn't appear to be a valid YouTube video link. Please check the URL and try again.",
        fallback: true
      }, { status: 400 });
    }

    // Fetch comments for the video
    let commentsResponse;
    try {
      commentsResponse = await youtube.commentThreads.list({
        part: 'snippet',
        videoId: videoId,
        maxResults: 100, // Limit comments to avoid token limits
      });
    } catch (error) {
      console.error('YouTube API error:', error);
      return NextResponse.json({
        answer: fallbackAnswers.apiError,
        fallback: true,
        error: error.message
      });
    }

    if (!commentsResponse.data.items || commentsResponse.data.items.length === 0) {
      return NextResponse.json({
        answer: fallbackAnswers.noComments,
        fallback: true
      });
    }

    // Extract comment text
    const comments = commentsResponse.data.items.map(item =>
      item.snippet.topLevelComment.snippet.textDisplay
    );

    // Get video title for context
    let videoTitle = "Unknown video";
    try {
      const videoResponse = await youtube.videos.list({
        part: 'snippet',
        id: videoId,
      });

      videoTitle = videoResponse.data.items[0]?.snippet.title || "Unknown video";
    } catch (error) {
      console.error('Error fetching video title:', error);
      // Continue with default title
    }

    // Format comments for OpenAI (limit to avoid token issues)
    const formattedComments = comments.slice(0, 75).join('\n\n---\n\n');

    // Create the prompt for OpenAI
    const prompt = `You are analyzing YouTube comments for a video titled "${videoTitle}". 
      Below are ${Math.min(comments.length, 75)} comments from the video. 
      A user has asked the following question about these comments: "${question}"

      Please provide a concise, insightful answer based only on the comment data provided.

      COMMENTS:
      ${formattedComments}`;

    // Call OpenAI API
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Using 3.5 turbo for cost efficiency
        messages: [
          { role: "system", content: "You are a helpful assistant that analyzes YouTube comments and provides insights." },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });
    } catch (error) {
      console.error('OpenAI API error:', error);
      return NextResponse.json({
        answer: fallbackAnswers.processingError,
        fallback: true,
        error: error.message
      });
    }

    // Extract answer from OpenAI response
    const answer = completion.choices[0].message.content || fallbackAnswers.general;

    // If answer indicates insufficient data, provide fallback
    if (answer.toLowerCase().includes("don't have enough information") ||
      answer.toLowerCase().includes("insufficient data") ||
      answer.toLowerCase().includes("can't determine") ||
      answer.toLowerCase().includes("not enough context")) {
      return NextResponse.json({
        answer: fallbackAnswers.insufficientData,
        originalAnswer: answer,
        fallback: true,
        commentCount: comments.length,
        analyzedCount: Math.min(comments.length, 75)
      });
    }

    return NextResponse.json({
      answer,
      fallback: false,
      commentCount: comments.length,
      analyzedCount: Math.min(comments.length, 75)
    });

  } catch (error) {
    console.error('Error answering question:', error);
    return NextResponse.json({
      answer: fallbackAnswers.general,
      fallback: true,
      error: error.message
    }, { status: 500 });
  }
}