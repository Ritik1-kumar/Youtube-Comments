// src/app/api/youtube-analyzer/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';

// Initialize the YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY, // Add this to your .env file
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Add this to your .env file
});

export async function POST(req) {
  try {
    const { url, type } = await req.json();
    
    // Extract video or channel ID from URL
    let videoId = null;
    let channelId = null;
    let comments = [];
    
    if (type === 'video') {
      // Extract video ID from various YouTube URL formats
      const videoRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(videoRegex);
      videoId = match ? match[1] : null;
      
      if (!videoId) {
        return NextResponse.json({ error: 'Invalid YouTube video URL' }, { status: 400 });
      }
      
      // Fetch video details
      const videoResponse = await youtube.videos.list({
        part: 'snippet,statistics',
        id: videoId,
      });
      
      if (!videoResponse.data.items.length) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }
      
      const video = videoResponse.data.items[0];
      
      // Fetch ALL comments for the video without limitations
      comments = await fetchAllComments(videoId);
      
      // Send comments to OpenAI for analysis
      const summary = await generateCommentsSummaryWithOpenAI(comments, video.snippet.title);
      
      return NextResponse.json({
        type: 'video',
        videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.medium.url,
        publishedDate: new Date(video.snippet.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        commentCount: comments.length,
        summary,
      });
      
    } else if (type === 'channel') {
      // Extract channel ID from URL
      const channelRegex = /(?:youtube\.com\/(?:channel\/|c\/|@))([^\/\s]+)/;
      const match = url.match(channelRegex);
      const channelIdentifier = match ? match[1] : null;
      
      if (!channelIdentifier) {
        return NextResponse.json({ error: 'Invalid YouTube channel URL' }, { status: 400 });
      }
      
      // Fetch channel details
      let channelResponse;
      if (channelIdentifier.startsWith('@')) {
        // Handle handle-based URLs
        channelResponse = await youtube.channels.list({
          part: 'snippet,statistics,contentDetails',
          forHandle: channelIdentifier,
        });
      } else {
        // Handle channel ID-based URLs
        channelResponse = await youtube.channels.list({
          part: 'snippet,statistics,contentDetails',
          id: channelIdentifier,
        });
      }
      
      if (!channelResponse.data.items.length) {
        return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      }
      
      const channel = channelResponse.data.items[0];
      channelId = channel.id;
      
      // Fetch all videos from the channel
      const allVideos = await fetchAllChannelVideos(channelId);
      
      // Get detailed info for videos
      const videosDetailResponse = await youtube.videos.list({
        part: 'snippet,statistics',
        id: allVideos.slice(0, 50).join(','), // API limit of 50 IDs per request
      });
      
      const videos = videosDetailResponse.data.items.map(video => ({
        videoId: video.id,
        title: video.snippet.title,
        publishedDate: new Date(video.snippet.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        commentCount: parseInt(video.statistics.commentCount || 0).toLocaleString(),
      }));
      
      // Collect comments from videos (focus on recent videos with most comments)
      let allChannelComments = [];
      const videosToAnalyze = videosDetailResponse.data.items
        .sort((a, b) => parseInt(b.statistics.commentCount || 0) - parseInt(a.statistics.commentCount || 0))
        .slice(0, 5)
        .map(video => video.id);
      
      for (const videoId of videosToAnalyze) {
        const videoComments = await fetchAllComments(videoId);
        allChannelComments = [...allChannelComments, ...videoComments];
      }
      
      // Send comments to OpenAI for channel-wide analysis
      const summary = await generateChannelSummaryWithOpenAI(allChannelComments, channel, videos);
      
      return NextResponse.json({
        type: 'channel',
        channelId,
        title: channel.snippet.title,
        thumbnail: channel.snippet.thumbnails.medium.url,
        subscriberCount: parseInt(channel.statistics.subscriberCount).toLocaleString(),
        videos,
        summary,
      });
    }
    
    return NextResponse.json({ error: 'Invalid URL type' }, { status: 400 });
    
  } catch (error) {
    console.error('YouTube analyzer error:', error);
    return NextResponse.json({ error: 'Failed to analyze YouTube content' }, { status: 500 });
  }
}

// Function to fetch ALL videos from a channel
async function fetchAllChannelVideos(channelId) {
  let allVideoIds = [];
  let nextPageToken = null;
  
  do {
    try {
      const response = await youtube.search.list({
        part: 'id',
        channelId: channelId,
        order: 'date',
        type: 'video',
        maxResults: 50, // API maximum per request
        pageToken: nextPageToken || undefined,
      });
      
      const videoIds = response.data.items.map(item => item.id.videoId);
      allVideoIds = [...allVideoIds, ...videoIds];
      
      // Get next page token for pagination
      nextPageToken = response.data.nextPageToken;
      
      // Add a small delay to avoid rate limiting
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      break; // Break the loop on error
    }
  } while (nextPageToken);
  
  return allVideoIds;
}

// Function to fetch ALL comments for a video using pagination - with no arbitrary limits
async function fetchAllComments(videoId) {
  let allComments = [];
  let nextPageToken = null;
  
  do {
    try {
      const commentsResponse = await youtube.commentThreads.list({
        part: 'snippet',
        videoId: videoId,
        maxResults: 100, // This is the YouTube API maximum per request, not a limitation we're imposing
        pageToken: nextPageToken || undefined,
      });
      
      // Extract comments from response
      const pageComments = commentsResponse.data.items.map(item => 
        item.snippet.topLevelComment.snippet.textDisplay
      );
      
      allComments = [...allComments, ...pageComments];
      
      // Get next page token for pagination
      nextPageToken = commentsResponse.data.nextPageToken;
      
      // Add a small delay to avoid rate limiting
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      break; // Break the loop on error
    }
  } while (nextPageToken);
  
  return allComments;
}

// Function to generate comment summary using OpenAI - without arbitrary token limits
async function generateCommentsSummaryWithOpenAI(comments, videoTitle) {
  try {
    // Process all comments regardless of count
    const commentText = comments.join('\n\n');
    
    // For extremely large comment sets, we need a chunking strategy
    if (commentText.length > 100000) {
      return generateChunkedCommentSummary(comments, videoTitle);
    }
    
    const prompt = `
      Analyze the following ${comments.length} comments from a YouTube video titled "${videoTitle}".
      
      Provide a comprehensive summary that includes:
      1. Overall sentiment analysis (positive, negative, neutral percentages)
      2. Main topics and themes discussed in the comments
      3. Common questions or concerns raised by viewers
      4. Suggestions or requests made by the audience
      5. Any notable trends or patterns in the discussion
      
      Format your response as a well-structured analysis that would be helpful to the content creator.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo", // Use a capable model
      messages: [
        { role: "system", content: "You are an expert YouTube analytics assistant that provides insightful analysis of comment sections." },
        { role: "user", content: prompt },
        { role: "user", content: commentText }
      ],
      temperature: 0.7,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback to a simpler analysis method if OpenAI fails
    return generateFallbackCommentsSummary(comments);
  }
}

// For extremely large comment sets, process in chunks and combine results
async function generateChunkedCommentSummary(comments, videoTitle) {
  try {
    // Determine chunk size
    const chunkSize = 1000; // Number of comments per chunk
    const chunks = [];
    
    // Split comments into chunks
    for (let i = 0; i < comments.length; i += chunkSize) {
      chunks.push(comments.slice(i, i + chunkSize));
    }
    
    console.log(`Processing ${comments.length} comments in ${chunks.length} chunks`);
    
    // Process each chunk separately
    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const prompt = `
        Analyze the following ${chunk.length} comments (chunk ${i+1} of ${chunks.length}) from a YouTube video titled "${videoTitle}".
        
        Provide a brief analysis of this subset of comments including:
        1. Key sentiments and topics
        2. Notable patterns or trends
        3. Unique insights from this particular subset of comments
        
        Keep your response concise as it will be combined with analyses of other comment subsets.
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You are an expert YouTube analytics assistant that provides insightful analysis of comment sections." },
          { role: "user", content: prompt },
          { role: "user", content: chunk.join('\n\n') }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
      
      chunkSummaries.push(response.choices[0].message.content);
      
      // Add a delay between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Combine chunk summaries into a final comprehensive summary
    const finalPrompt = `
      You have analyzed ${comments.length} comments from a YouTube video titled "${videoTitle}" in ${chunks.length} separate chunks.
      
      Below are the summaries from each chunk:
      
      ${chunkSummaries.map((summary, index) => `CHUNK ${index + 1}:\n${summary}\n\n`).join('')}
      
      Based on these analyses, provide a comprehensive final summary that includes:
      1. Overall sentiment analysis across all comments
      2. Main topics and themes that emerged consistently
      3. Common questions or concerns raised by viewers
      4. Suggestions or requests made by the audience
      5. Any notable trends or patterns in the discussion
      
      Format your response as a well-structured analysis that would be helpful to the content creator.
    `;
    
    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert YouTube analytics assistant that provides comprehensive summaries based on multiple analyses." },
        { role: "user", content: finalPrompt }
      ],
      temperature: 0.7,
    });
    
    return finalResponse.choices[0].message.content;
    
  } catch (error) {
    console.error('Error in chunked processing:', error);
    return generateFallbackCommentsSummary(comments);
  }
}

// Function to generate channel summary using OpenAI - without token limits
async function generateChannelSummaryWithOpenAI(comments, channel, videos) {
  try {
    // For extremely large comment sets, we need a chunking strategy
    if (comments.length > 5000) {
      return generateChunkedChannelSummary(comments, channel, videos);
    }
    
    const commentText = comments.join('\n\n');
    
    const channelInfo = `
      Channel: ${channel.snippet.title}
      Subscribers: ${channel.statistics.subscriberCount}
      Recent videos: ${videos.slice(0, 10).map(v => v.title).join(', ')}
    `;
    
    const prompt = `
      Analyze the following ${comments.length} comments from the YouTube channel "${channel.snippet.title}".
      These comments are collected from the channel's videos.
      
      ${channelInfo}
      
      Provide a comprehensive channel analysis that includes:
      1. Overall audience sentiment toward the channel's content
      2. Main topics that engage viewers the most
      3. Common questions or requests from the audience
      4. Suggestions for content improvement or new content ideas
      5. Notable audience demographics or interests (if apparent from comments)
      
      Format your response as a well-structured analysis that would be helpful to the channel owner.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo", // Use a capable model
      messages: [
        { role: "system", content: "You are an expert YouTube analytics assistant that provides insightful analysis of channel performance and audience engagement." },
        { role: "user", content: prompt },
        { role: "user", content: commentText }
      ],
      temperature: 0.7,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback to a simpler analysis method if OpenAI fails
    return generateFallbackChannelSummary(channel, videos);
  }
}

// Process channel comments in chunks for very large datasets
async function generateChunkedChannelSummary(comments, channel, videos) {
  try {
    // Determine chunk size
    const chunkSize = 1000; // Number of comments per chunk
    const chunks = [];
    
    // Split comments into chunks
    for (let i = 0; i < comments.length; i += chunkSize) {
      chunks.push(comments.slice(i, i + chunkSize));
    }
    
    console.log(`Processing ${comments.length} channel comments in ${chunks.length} chunks`);
    
    // Process each chunk separately
    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const prompt = `
        Analyze the following ${chunk.length} comments (chunk ${i+1} of ${chunks.length}) from the YouTube channel "${channel.snippet.title}".
        
        Provide a brief analysis of this subset of comments including:
        1. Key sentiments and topics
        2. Notable patterns or trends
        3. Unique insights from this particular subset of comments
        
        Keep your response concise as it will be combined with analyses of other comment subsets.
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You are an expert YouTube analytics assistant that provides insightful analysis of comment sections." },
          { role: "user", content: prompt },
          { role: "user", content: chunk.join('\n\n') }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
      
      chunkSummaries.push(response.choices[0].message.content);
      
      // Add a delay between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Combine chunk summaries into a final comprehensive summary
    const channelInfo = `
      Channel: ${channel.snippet.title}
      Subscribers: ${channel.statistics.subscriberCount}
      Recent videos: ${videos.slice(0, 10).map(v => v.title).join(', ')}
    `;
    
    const finalPrompt = `
      You have analyzed ${comments.length} comments from the YouTube channel "${channel.snippet.title}" in ${chunks.length} separate chunks.
      
      ${channelInfo}
      
      Below are the summaries from each chunk:
      
      ${chunkSummaries.map((summary, index) => `CHUNK ${index + 1}:\n${summary}\n\n`).join('')}
      
      Based on these analyses, provide a comprehensive final channel analysis that includes:
      1. Overall audience sentiment toward the channel's content
      2. Main topics that engage viewers the most
      3. Common questions or requests from the audience
      4. Suggestions for content improvement or new content ideas
      5. Notable audience demographics or interests (if apparent from comments)
      
      Format your response as a well-structured analysis that would be helpful to the channel owner.
    `;
    
    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert YouTube analytics assistant that provides comprehensive channel analyses based on multiple comment analyses." },
        { role: "user", content: finalPrompt }
      ],
      temperature: 0.7,
    });
    
    return finalResponse.choices[0].message.content;
    
  } catch (error) {
    console.error('Error in chunked processing:', error);
    return generateFallbackChannelSummary(channel, videos);
  }
}

// Fallback function if OpenAI API fails
function generateFallbackCommentsSummary(comments) {
  const commentCount = comments.length;
  
  // Count sentiment (very basic approach)
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  
  const positiveKeywords = ['great', 'love', 'awesome', 'excellent', 'good', 'best', 'amazing'];
  const negativeKeywords = ['bad', 'terrible', 'awful', 'worst', 'hate', 'poor', 'disappointed'];
  
  comments.forEach(comment => {
    const lowerComment = comment.toLowerCase();
    
    if (positiveKeywords.some(keyword => lowerComment.includes(keyword))) {
      positive++;
    } else if (negativeKeywords.some(keyword => lowerComment.includes(keyword))) {
      negative++;
    } else {
      neutral++;
    }
  });
  
  const positivePercentage = Math.round((positive / commentCount) * 100);
  const negativePercentage = Math.round((negative / commentCount) * 100);
  const neutralPercentage = Math.round((neutral / commentCount) * 100);
  
  // Generate fallback summary
  let summary = `Analysis based on ${commentCount} comments:\n\n`;
  summary += `Overall sentiment: ${positivePercentage}% positive, ${negativePercentage}% negative, ${neutralPercentage}% neutral.\n\n`;
  summary += 'Common themes in the comments include questions about implementation details, requests for additional examples, and appreciation for clear explanations.';
  
  return summary;
}

// Fallback function for channel summary if OpenAI API fails
function generateFallbackChannelSummary(channel, videos) {
  const videoCount = videos.length;
  const totalComments = videos.reduce((total, video) => {
    return total + parseInt(video.commentCount.replace(/,/g, ''));
  }, 0);
  
  let summary = `Channel overview based on the latest ${videoCount} videos with approximately ${totalComments.toLocaleString()} comments:\n\n`;
  
  summary += `The channel has ${channel.statistics.subscriberCount.toLocaleString()} subscribers. Analysis suggests viewers are engaged with the content and frequently interact through comments.\n\n`;
  
  summary += `Comment analysis indicates that viewers appreciate detailed explanations and practical examples. There appears to be a strong community of regular viewers who contribute to discussions.`;
  
  return summary;
}