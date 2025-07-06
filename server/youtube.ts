import { z } from "zod";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubeChannelData {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnailUrl: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  publishedAt: string;
}

export interface YouTubeVideoData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
}

// YouTube API response schemas
const YouTubeChannelSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    snippet: z.object({
      title: z.string(),
      description: z.string(),
      customUrl: z.string().optional(),
      thumbnails: z.object({
        medium: z.object({
          url: z.string(),
        }),
      }),
      publishedAt: z.string(),
    }),
    statistics: z.object({
      subscriberCount: z.string(),
      viewCount: z.string(),
      videoCount: z.string(),
    }),
  })),
});

const YouTubeVideoSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    snippet: z.object({
      title: z.string(),
      description: z.string(),
      thumbnails: z.object({
        medium: z.object({
          url: z.string(),
        }),
      }),
      publishedAt: z.string(),
    }),
    statistics: z.object({
      viewCount: z.string(),
      likeCount: z.string(),
      commentCount: z.string(),
    }),
    contentDetails: z.object({
      duration: z.string(),
    }),
  })),
});

export class YouTubeAPI {
  private apiKey: string;

  constructor() {
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error("YOUTUBE_API_KEY environment variable is required");
    }
    this.apiKey = process.env.YOUTUBE_API_KEY;
  }

  async getChannelData(channelId: string): Promise<YouTubeChannelData | null> {
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${this.apiKey}`
      );

      if (!response.ok) {
        console.error("YouTube API error:", response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      const parsed = YouTubeChannelSchema.parse(data);

      if (parsed.items.length === 0) {
        return null;
      }

      const channel = parsed.items[0];
      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
        thumbnailUrl: channel.snippet.thumbnails.medium.url,
        subscriberCount: parseInt(channel.statistics.subscriberCount),
        viewCount: parseInt(channel.statistics.viewCount),
        videoCount: parseInt(channel.statistics.videoCount),
        publishedAt: channel.snippet.publishedAt,
      };
    } catch (error) {
      console.error("Error fetching channel data:", error);
      return null;
    }
  }

  async getChannelDataByUsername(username: string): Promise<YouTubeChannelData | null> {
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&forUsername=${username}&key=${this.apiKey}`
      );

      if (!response.ok) {
        console.error("YouTube API error:", response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      const parsed = YouTubeChannelSchema.parse(data);

      if (parsed.items.length === 0) {
        return null;
      }

      const channel = parsed.items[0];
      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
        thumbnailUrl: channel.snippet.thumbnails.medium.url,
        subscriberCount: parseInt(channel.statistics.subscriberCount),
        viewCount: parseInt(channel.statistics.viewCount),
        videoCount: parseInt(channel.statistics.videoCount),
        publishedAt: channel.snippet.publishedAt,
      };
    } catch (error) {
      console.error("Error fetching channel data by username:", error);
      return null;
    }
  }

  async getChannelVideos(channelId: string, maxResults: number = 10): Promise<YouTubeVideoData[]> {
    try {
      // First get the uploads playlist ID
      const channelResponse = await fetch(
        `${YOUTUBE_API_BASE}/channels?part=contentDetails&id=${channelId}&key=${this.apiKey}`
      );

      if (!channelResponse.ok) {
        console.error("YouTube API error:", channelResponse.status, channelResponse.statusText);
        return [];
      }

      const channelData = await channelResponse.json();
      const uploadsPlaylistId = channelData.items[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!uploadsPlaylistId) {
        return [];
      }

      // Get videos from uploads playlist
      const playlistResponse = await fetch(
        `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${this.apiKey}`
      );

      if (!playlistResponse.ok) {
        console.error("YouTube API error:", playlistResponse.status, playlistResponse.statusText);
        return [];
      }

      const playlistData = await playlistResponse.json();
      const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(",");

      if (!videoIds) {
        return [];
      }

      // Get detailed video information
      const videosResponse = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${this.apiKey}`
      );

      if (!videosResponse.ok) {
        console.error("YouTube API error:", videosResponse.status, videosResponse.statusText);
        return [];
      }

      const videosData = await videosResponse.json();
      const parsed = YouTubeVideoSchema.parse(videosData);

      return parsed.items.map(video => ({
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails.medium.url,
        publishedAt: video.snippet.publishedAt,
        viewCount: parseInt(video.statistics.viewCount),
        likeCount: parseInt(video.statistics.likeCount),
        commentCount: parseInt(video.statistics.commentCount),
        duration: video.contentDetails.duration,
      }));
    } catch (error) {
      console.error("Error fetching channel videos:", error);
      return [];
    }
  }

  async searchChannels(query: string, maxResults: number = 10): Promise<YouTubeChannelData[]> {
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${this.apiKey}`
      );

      if (!response.ok) {
        console.error("YouTube API error:", response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      const channelIds = data.items.map((item: any) => item.snippet.channelId).join(",");

      if (!channelIds) {
        return [];
      }

      // Get detailed channel information
      const channelsResponse = await fetch(
        `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${channelIds}&key=${this.apiKey}`
      );

      if (!channelsResponse.ok) {
        console.error("YouTube API error:", channelsResponse.status, channelsResponse.statusText);
        return [];
      }

      const channelsData = await channelsResponse.json();
      const parsed = YouTubeChannelSchema.parse(channelsData);

      return parsed.items.map(channel => ({
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
        thumbnailUrl: channel.snippet.thumbnails.medium.url,
        subscriberCount: parseInt(channel.statistics.subscriberCount),
        viewCount: parseInt(channel.statistics.viewCount),
        videoCount: parseInt(channel.statistics.videoCount),
        publishedAt: channel.snippet.publishedAt,
      }));
    } catch (error) {
      console.error("Error searching channels:", error);
      return [];
    }
  }
}

export const youtubeAPI = new YouTubeAPI();