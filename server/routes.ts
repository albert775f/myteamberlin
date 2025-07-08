import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProjectSchema, insertUploadScheduleSchema, insertActivitySchema, insertDescriptionTemplateSchema, insertTodoSchema, insertPinboardPageSchema, insertPinboardItemSchema, insertPinboardNoteSchema, insertPinboardPollSchema } from "@shared/schema";
import { z } from "zod";
import { youtubeAPI } from "./youtube";
import { upload, getAudioMetadata, mergeAudioFiles, getFileUrl, deleteFile } from "./audio";
import fs from "fs";
import path from "path";

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

  app.get("/api/upload-schedule/project/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const schedule = await storage.getUploadScheduleByProject(projectId, undefined);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project schedule" });
    }
  });

  app.get("/api/description-templates/:projectId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const templates = await storage.getDescriptionTemplates(projectId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/description-templates", isAuthenticated, async (req, res) => {
    try {
      const template = insertDescriptionTemplateSchema.parse(req.body);
      const result = await storage.createDescriptionTemplate(template);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.put("/api/description-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = insertDescriptionTemplateSchema.partial().parse(req.body);
      const result = await storage.updateDescriptionTemplate(id, template);
      if (!result) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/description-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDescriptionTemplate(id);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template" });
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
      console.log("Schedule data received:", JSON.stringify(scheduleData, null, 2));
      
      // Convert string date to Date object for validation
      if (scheduleData.scheduledDate) {
        scheduleData.scheduledDate = new Date(scheduleData.scheduledDate);
      }
      
      const validatedData = insertUploadScheduleSchema.parse(scheduleData);
      const item = await storage.createUploadScheduleItem(validatedData, userId);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid schedule data", errors: error.errors });
      }
      console.error("Error creating schedule item:", error);
      res.status(500).json({ message: "Failed to create schedule item" });
    }
  });

  app.put("/api/upload-schedule/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      const scheduleData = { ...req.body };
      
      // Convert string date to Date object for validation
      if (scheduleData.scheduledDate) {
        scheduleData.scheduledDate = new Date(scheduleData.scheduledDate);
      }
      
      const validatedData = insertUploadScheduleSchema.partial().parse(scheduleData);
      const item = await storage.updateUploadScheduleItem(id, validatedData, userId);
      
      if (!item) {
        return res.status(404).json({ message: "Upload schedule not found" });
      }
      
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid schedule data", errors: error.errors });
      }
      console.error("Error updating schedule item:", error);
      res.status(500).json({ message: "Failed to update schedule item" });
    }
  });

  app.delete("/api/upload-schedule/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      
      const success = await storage.deleteUploadScheduleItem(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Upload schedule not found" });
      }
      
      res.json({ message: "Upload schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule item:", error);
      res.status(500).json({ message: "Failed to delete schedule item" });
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

  // Users endpoint for todo assignment
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      // Convert team members to user format for todo assignment
      const users = members.map(member => ({
        id: member.userId,
        email: member.email,
        firstName: member.name?.split(' ')[0] || null,
        lastName: member.name?.split(' ').slice(1).join(' ') || null,
        profileImageUrl: member.avatarUrl,
      }));
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
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

  // Todo routes
  app.get("/api/todos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const filter = req.query.filter as string;
      
      let todos;
      if (filter === 'assigned') {
        todos = await storage.getAssignedTodos(userId);
      } else if (filter === 'created') {
        todos = await storage.getCreatedTodos(userId);
      } else {
        todos = await storage.getTodos(userId, projectId);
      }
      
      res.json(todos);
    } catch (error) {
      console.error("Error fetching todos:", error);
      res.status(500).json({ message: "Failed to fetch todos" });
    }
  });

  app.get("/api/todos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const todo = await storage.getTodo(id);
      if (!todo) {
        return res.status(404).json({ message: "Todo not found" });
      }
      res.json(todo);
    } catch (error) {
      console.error("Error fetching todo:", error);
      res.status(500).json({ message: "Failed to fetch todo" });
    }
  });

  app.post("/api/todos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const todoData = {
        ...req.body,
        assignedBy: userId,
        // Default assignedTo to current user if not specified or empty
        assignedTo: req.body.assignedTo || userId,
        // Convert dueDate string to Date object if it exists
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null
      };
      const validatedData = insertTodoSchema.parse(todoData);
      
      console.log("Todo data received:", validatedData);
      
      const todo = await storage.createTodo(validatedData);
      res.status(201).json(todo);
    } catch (error) {
      console.error("Error creating todo:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid todo data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create todo" });
    }
  });

  app.put("/api/todos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTodoSchema.partial().parse(req.body);
      const todo = await storage.updateTodo(id, validatedData);
      if (!todo) {
        return res.status(404).json({ message: "Todo not found" });
      }
      res.json(todo);
    } catch (error) {
      console.error("Error updating todo:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid todo data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update todo" });
    }
  });

  app.put("/api/todos/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const todo = await storage.markTodoComplete(id, userId);
      if (!todo) {
        return res.status(404).json({ message: "Todo not found or access denied" });
      }
      res.json(todo);
    } catch (error) {
      console.error("Error completing todo:", error);
      res.status(500).json({ message: "Failed to complete todo" });
    }
  });

  app.put("/api/todos/:id/tick", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const todo = await storage.addTodoTick(id, userId);
      if (!todo) {
        return res.status(404).json({ message: "Todo not found or access denied" });
      }
      res.json(todo);
    } catch (error) {
      console.error("Error adding tick:", error);
      res.status(500).json({ message: "Failed to add tick" });
    }
  });

  app.put("/api/todos/:id/complete-all", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const todo = await storage.completeAllTicks(id, userId);
      if (!todo) {
        return res.status(404).json({ message: "Todo not found or access denied" });
      }
      res.json(todo);
    } catch (error) {
      console.error("Error completing all ticks:", error);
      res.status(500).json({ message: "Failed to complete all ticks" });
    }
  });

  app.delete("/api/todos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const deleted = await storage.deleteTodo(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Todo not found or access denied" });
      }
      res.json({ message: "Todo deleted successfully" });
    } catch (error) {
      console.error("Error deleting todo:", error);
      res.status(500).json({ message: "Failed to delete todo" });
    }
  });

  // Pinboard routes
  app.get("/api/pinboard/pages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pages = await storage.getPinboardPages(userId);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching pinboard pages:", error);
      res.status(500).json({ message: "Failed to fetch pinboard pages" });
    }
  });

  app.get("/api/pinboard/pages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const page = await storage.getPinboardPage(id);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error fetching pinboard page:", error);
      res.status(500).json({ message: "Failed to fetch pinboard page" });
    }
  });

  app.post("/api/pinboard/pages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPinboardPageSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const page = await storage.createPinboardPage(validatedData);
      res.status(201).json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating pinboard page:", error);
      res.status(500).json({ message: "Failed to create pinboard page" });
    }
  });

  app.put("/api/pinboard/pages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const validatedData = insertPinboardPageSchema.partial().parse(req.body);
      const page = await storage.updatePinboardPage(id, validatedData, userId);
      if (!page) {
        return res.status(404).json({ message: "Page not found or access denied" });
      }
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating pinboard page:", error);
      res.status(500).json({ message: "Failed to update pinboard page" });
    }
  });

  app.delete("/api/pinboard/pages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const deleted = await storage.deletePinboardPage(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Page not found or access denied" });
      }
      res.json({ message: "Page deleted successfully" });
    } catch (error) {
      console.error("Error deleting pinboard page:", error);
      res.status(500).json({ message: "Failed to delete pinboard page" });
    }
  });

  // Pinboard items
  app.post("/api/pinboard/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPinboardItemSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const item = await storage.createPinboardItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating pinboard item:", error);
      res.status(500).json({ message: "Failed to create pinboard item" });
    }
  });

  app.put("/api/pinboard/items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const validatedData = insertPinboardItemSchema.partial().parse(req.body);
      const item = await storage.updatePinboardItem(id, validatedData, userId);
      if (!item) {
        return res.status(404).json({ message: "Item not found or access denied" });
      }
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating pinboard item:", error);
      res.status(500).json({ message: "Failed to update pinboard item" });
    }
  });

  app.delete("/api/pinboard/items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const deleted = await storage.deletePinboardItem(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Item not found or access denied" });
      }
      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      console.error("Error deleting pinboard item:", error);
      res.status(500).json({ message: "Failed to delete pinboard item" });
    }
  });

  // Pinboard notes
  app.post("/api/pinboard/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPinboardNoteSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const note = await storage.createPinboardNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating pinboard note:", error);
      res.status(500).json({ message: "Failed to create pinboard note" });
    }
  });

  app.put("/api/pinboard/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const validatedData = insertPinboardNoteSchema.partial().parse(req.body);
      const note = await storage.updatePinboardNote(id, validatedData, userId);
      if (!note) {
        return res.status(404).json({ message: "Note not found or access denied" });
      }
      res.json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating pinboard note:", error);
      res.status(500).json({ message: "Failed to update pinboard note" });
    }
  });

  app.delete("/api/pinboard/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const deleted = await storage.deletePinboardNote(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Note not found or access denied" });
      }
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Error deleting pinboard note:", error);
      res.status(500).json({ message: "Failed to delete pinboard note" });
    }
  });

  // Pinboard polls
  app.post("/api/pinboard/polls", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPinboardPollSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const poll = await storage.createPinboardPoll(validatedData);
      res.status(201).json(poll);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating pinboard poll:", error);
      res.status(500).json({ message: "Failed to create pinboard poll" });
    }
  });

  app.put("/api/pinboard/polls/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const validatedData = insertPinboardPollSchema.partial().parse(req.body);
      const poll = await storage.updatePinboardPoll(id, validatedData, userId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found or access denied" });
      }
      res.json(poll);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating pinboard poll:", error);
      res.status(500).json({ message: "Failed to update pinboard poll" });
    }
  });

  app.delete("/api/pinboard/polls/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const deleted = await storage.deletePinboardPoll(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Poll not found or access denied" });
      }
      res.json({ message: "Poll deleted successfully" });
    } catch (error) {
      console.error("Error deleting pinboard poll:", error);
      res.status(500).json({ message: "Failed to delete pinboard poll" });
    }
  });

  app.post("/api/pinboard/polls/:id/vote", isAuthenticated, async (req: any, res) => {
    try {
      const pollId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { optionIndex } = req.body;
      
      if (typeof optionIndex !== 'number') {
        return res.status(400).json({ message: "Option index is required" });
      }
      
      const poll = await storage.votePinboardPoll(pollId, userId, optionIndex);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      res.json(poll);
    } catch (error) {
      console.error("Error voting on poll:", error);
      res.status(500).json({ message: "Failed to vote on poll" });
    }
  });

  // Audio/MixMerge routes
  app.get("/api/mixmerge/files", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const files = await storage.getAudioFiles(userId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching audio files:", error);
      res.status(500).json({ message: "Failed to fetch audio files" });
    }
  });

  app.post("/api/mixmerge/upload", isAuthenticated, upload.single('audio'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const metadata = await getAudioMetadata(req.file.path);
      const audioFile = await storage.createAudioFile({
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        duration: Math.floor(metadata.duration),
        mimeType: req.file.mimetype,
        uploadedBy: userId,
      });

      res.json({
        ...audioFile,
        url: getFileUrl(audioFile.filename),
        metadata
      });
    } catch (error) {
      console.error("Error uploading audio file:", error);
      res.status(500).json({ message: "Failed to upload audio file" });
    }
  });

  app.delete("/api/mixmerge/files/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const file = await storage.getAudioFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const deleted = await storage.deleteAudioFile(id, userId);
      if (!deleted) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete from filesystem
      const filePath = `uploads/${file.filename}`;
      deleteFile(filePath);

      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting audio file:", error);
      res.status(500).json({ message: "Failed to delete audio file" });
    }
  });

  app.get("/api/mixmerge/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobs = await storage.getMergeJobs(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching merge jobs:", error);
      res.status(500).json({ message: "Failed to fetch merge jobs" });
    }
  });

  app.post("/api/mixmerge/merge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fileIds, removeSilence } = req.body;

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ message: "File IDs are required" });
      }

      // Create merge job
      const job = await storage.createMergeJob({
        status: "pending",
        removeSilence: removeSilence || false,
        createdBy: userId,
      });

      // Link files to job
      await storage.addJobFiles(job.id, fileIds);

      // Start merge process asynchronously
      setImmediate(async () => {
        try {
          await storage.updateMergeJob(job.id, { status: "processing" });

          // Get file paths
          const files = await Promise.all(
            fileIds.map(id => storage.getAudioFile(id))
          );
          const filePaths = files.map(file => `uploads/${file?.filename}`);

          // Generate output filename
          const outputFilename = `merged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
          const outputPath = `uploads/${outputFilename}`;

          // Merge files
          await mergeAudioFiles(filePaths, outputPath, removeSilence, (progress) => {
            storage.updateMergeJob(job.id, { progress: Math.floor(progress) });
          });

          await storage.updateMergeJob(job.id, {
            status: "completed",
            progress: 100,
            outputFile: outputFilename,
            completedAt: new Date(),
          });
        } catch (error) {
          console.error("Error merging files:", error);
          await storage.updateMergeJob(job.id, { status: "failed" });
        }
      });

      res.json(job);
    } catch (error) {
      console.error("Error creating merge job:", error);
      res.status(500).json({ message: "Failed to create merge job" });
    }
  });

  app.get("/api/mixmerge/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getMergeJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching merge job:", error);
      res.status(500).json({ message: "Failed to fetch merge job" });
    }
  });

  // Serve uploaded files
  app.get("/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = `uploads/${filename}`;
    if (fs.existsSync(filePath)) {
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
