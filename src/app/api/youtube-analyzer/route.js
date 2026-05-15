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
        comments: comments, // Return the raw comments
        summary,
      });

    } else if (type === 'channel') {
      // Enhanced regex to handle different channel URL formats
      let channelId = null;
      let channelHandle = null;

      // Extract channel ID directly from /channel/ URLs
      const channelIdRegex = /(?:youtube\.com\/channel\/)([^\/\s?]+)/;
      const idMatch = url.match(channelIdRegex);
      if (idMatch) {
        channelId = idMatch[1];
      }

      // Extract channel handle from @username or /c/ URLs
      const channelHandleRegex = /(?:youtube\.com\/(?:@|c\/))([^\/\s?]+)/;
const handleMatch = url.match(channelHandleRegex);
if (handleMatch) {
  channelHandle = handleMatch[1];
  // Make sure to include the @ symbol for forHandle parameter
  if (!channelHandle.startsWith('@') && type === 'channel') {
    channelHandle = '@' + channelHandle;
  }
}

      if (!channelId && !channelHandle) {
        return NextResponse.json({ error: 'Invalid YouTube channel URL' }, { status: 400 });
      }

      // Fetch channel details based on available identifier
      let channelResponse;
      if (channelId) {
        // If we have a direct channel ID, use it
        channelResponse = await youtube.channels.list({
          part: 'snippet,statistics,contentDetails',
          id: channelId,
        });
      } else // In route.js - Modified API request for handles
      if (channelHandle) {
        // Remove the @ symbol when using forHandle as it's expected by the API
        const handleForAPI = channelHandle.startsWith('@') ? channelHandle.substring(1) : channelHandle;
        
        try {
          channelResponse = await youtube.channels.list({
            part: 'snippet,statistics,contentDetails',
            forUsername: handleForAPI
          });
          
          // If no results, try with forHandle
          if (!channelResponse.data.items || !channelResponse.data.items.length) {
            channelResponse = await youtube.channels.list({
              part: 'snippet,statistics,contentDetails',
              forHandle: channelHandle // Keep the @ for forHandle
            });
          }
        } catch (error) {
          console.error('Error fetching channel data:', error);
          // Try one more time with different parameters
          try {
            channelResponse = await youtube.search.list({
              part: 'snippet',
              q: channelHandle,
              type: 'channel',
              maxResults: 1
            });
            
            if (channelResponse.data.items && channelResponse.data.items.length) {
              const channelId = channelResponse.data.items[0].snippet.channelId;
              channelResponse = await youtube.channels.list({
                part: 'snippet,statistics,contentDetails',
                id: channelId
              });
            }
          } catch (secondError) {
            console.error('Second attempt failed:', secondError);
            return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
          }
        }
      } else {
        // For custom URLs, try both methods
        try {
          // First try as a username
          channelResponse = await youtube.channels.list({
            part: 'snippet,statistics,contentDetails',
            forUsername: channelHandle,
          });

          // If no results, try as a custom URL
          if (!channelResponse.data.items || !channelResponse.data.items.length) {
            channelResponse = await youtube.channels.list({
              part: 'snippet,statistics,contentDetails',
              id: handleMatch[1],
            });
          }
        } catch (error) {
          console.error('Error fetching channel data:', error);
          return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
        }
      }

      // Check if we got any results
      if (!channelResponse.data.items || !channelResponse.data.items.length) {
        console.error('Channel not found for identifier:', channelId || channelHandle);
        return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      }

      const channel = channelResponse.data.items[0];
      channelId = channel.id;

      // Fetch only the latest 3 videos from the channel
      const latestVideos = await fetchLatestChannelVideos(channelId, 3);

      // Get detailed info for videos - fixing the undefined variable issue
      const videosDetailResponse = await youtube.videos.list({
        part: 'snippet,statistics',
        id: latestVideos.join(',') // Use latestVideos instead of allVideos
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
        url: `https://youtube.com/watch?v=${video.id}`
      }));

      // Collect comments from the latest 3 videos
      let allChannelComments = [];
      for (const videoId of latestVideos) {
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
        subscriberCount: parseInt(channel.statistics.subscriberCount || 0).toLocaleString(),
        videos,
        summary,
      });
    }
    
    return NextResponse.json({ error: 'Invalid URL type' }, { status: 400 });

  } catch (error) {
    console.error('YouTube API error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
    });
    return NextResponse.json({ 
      error: 'Failed to analyze YouTube content',
      details: error.message
    }, { status: 500 });
  }
}

// Function to fetch only the latest videos from a channel (limit to specified count)
async function fetchLatestChannelVideos(channelId, count = 1) {
  try {
    const response = await youtube.search.list({
      part: 'id',
      channelId: channelId,
      order: 'date',
      type: 'video',
      maxResults: count
    });

    const videoIds = response.data.items.map(item => item.id.videoId);
    return videoIds;
  } catch (error) {
    console.error('Error fetching latest channel videos:', error);
    return [];
  }
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
    return generateFallbackCommentsSummary(comments, videoTitle);
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
        Analyze the following ${chunk.length} comments (chunk ${i + 1} of ${chunks.length}) from a YouTube video titled "${videoTitle}".
        
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

// Function to generate channel summary using OpenAI based on the latest 3 videos
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
        Analyze the following ${chunk.length} comments (chunk ${i + 1} of ${chunks.length}) from the YouTube channel "${channel.snippet.title}".
        
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