import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProjectSchema, insertUploadScheduleSchema, insertActivitySchema } from "@shared/schema";
import { z } from "zod";
import { youtubeAPI } from "./youtube";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validatedData, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const deleted = await storage.deleteProject(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Team Members
  app.get("/api/team-members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Upload Schedule
  app.get("/api/upload-schedule", async (req, res) => {
    try {
      const schedule = await storage.getUploadSchedule();
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upload schedule" });
    }
  });

  app.get("/api/upload-schedule/project/:projectId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const schedule = await storage.getUploadScheduleByProject(projectId);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project schedule" });
    }
  });

  app.post("/api/upload-schedule", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const scheduleData = { ...req.body, createdBy: userId };
      const validatedData = insertUploadScheduleSchema.parse(scheduleData);
      const item = await storage.createUploadScheduleItem(validatedData, userId);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid schedule data", errors: error.errors });
      }
      console.error("Error creating schedule item:", error);
      res.status(500).json({ message: "Failed to create schedule item" });
    }
  });

  // Activities
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const validatedData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(validatedData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const schedule = await storage.getUploadSchedule();
      const teamMembers = await storage.getTeamMembers();
      
      const activeProjects = projects.filter(p => p.status === "Active").length;
      const upcomingUploads = schedule.filter(s => 
        new Date(s.scheduledDate) > new Date() && 
        new Date(s.scheduledDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ).length;
      const totalViews = projects.reduce((sum, p) => sum + (p.monthlyViews || 0), 0);
      
      res.json({
        activeProjects,
        upcomingUploads,
        totalViews,
        teamMembers: teamMembers.length,
        activeProjectsChange: "+2",
        totalViewsChange: "+15%",
        teamMembersChange: "+3"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // YouTube API endpoints
  app.get("/api/youtube/channel/:channelId", isAuthenticated, async (req, res) => {
    try {
      const { channelId } = req.params;
      const channelData = await youtubeAPI.getChannelData(channelId);
      
      if (!channelData) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      res.json(channelData);
    } catch (error) {
      console.error("Error fetching YouTube channel:", error);
      res.status(500).json({ message: "Failed to fetch channel data" });
    }
  });

  app.get("/api/youtube/search/:query", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.params;
      const maxResults = parseInt(req.query.maxResults as string) || 10;
      const channels = await youtubeAPI.searchChannels(query, maxResults);
      
      res.json(channels);
    } catch (error) {
      console.error("Error searching YouTube channels:", error);
      res.status(500).json({ message: "Failed to search channels" });
    }
  });

  app.post("/api/projects/:id/sync-youtube", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (!project.youtubeChannelId) {
        return res.status(400).json({ message: "No YouTube channel linked to this project" });
      }
      
      const channelData = await youtubeAPI.getChannelData(project.youtubeChannelId);
      if (!channelData) {
        return res.status(404).json({ message: "YouTube channel not found" });
      }
      
      // Update project with YouTube data
      const updatedProject = await storage.updateProject(projectId, {
        name: channelData.title,
        thumbnailUrl: channelData.thumbnailUrl,
        subscribers: channelData.subscriberCount,
        videoCount: channelData.videoCount,
        monthlyViews: channelData.viewCount,
        youtubeChannelUrl: `https://youtube.com/channel/${channelData.id}`,
        lastSyncedAt: new Date(),
      }, userId);
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error syncing YouTube data:", error);
      res.status(500).json({ message: "Failed to sync YouTube data" });
    }
  });

  app.get("/api/youtube/channel/:channelId/videos", isAuthenticated, async (req, res) => {
    try {
      const { channelId } = req.params;
      const maxResults = parseInt(req.query.maxResults as string) || 10;
      const videos = await youtubeAPI.getChannelVideos(channelId, maxResults);
      
      res.json(videos);
    } catch (error) {
      console.error("Error fetching YouTube videos:", error);
      res.status(500).json({ message: "Failed to fetch channel videos" });
    }
  });

  // Description Templates routes
  app.get("/api/description-templates", isAuthenticated, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const templates = await storage.getDescriptionTemplates(projectId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching description templates:", error);
      res.status(500).json({ message: "Failed to fetch description templates" });
    }
  });

  app.post("/api/description-templates", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const templateData = { ...req.body, createdBy: userId };
      const template = await storage.createDescriptionTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error("Error creating description template:", error);
      res.status(500).json({ message: "Failed to create description template" });
    }
  });

  app.put("/api/description-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.updateDescriptionTemplate(id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Description template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating description template:", error);
      res.status(500).json({ message: "Failed to update description template" });
    }
  });

  app.delete("/api/description-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDescriptionTemplate(id);
      if (!deleted) {
        return res.status(404).json({ message: "Description template not found" });
      }
      res.json({ message: "Description template deleted successfully" });
    } catch (error) {
      console.error("Error deleting description template:", error);
      res.status(500).json({ message: "Failed to delete description template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
