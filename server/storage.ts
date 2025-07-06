import { 
  projects, 
  teamMembers, 
  projectMembers, 
  uploadSchedule, 
  activities,
  type Project, 
  type InsertProject,
  type TeamMember,
  type InsertTeamMember,
  type UploadSchedule,
  type InsertUploadSchedule,
  type Activity,
  type InsertActivity,
  type ProjectWithMembers,
  type UploadScheduleWithProject,
  type ActivityWithDetails
} from "@shared/schema";

export interface IStorage {
  // Projects
  getProjects(): Promise<ProjectWithMembers[]>;
  getProject(id: number): Promise<ProjectWithMembers | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Team Members
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  
  // Upload Schedule
  getUploadSchedule(): Promise<UploadScheduleWithProject[]>;
  getUploadScheduleByProject(projectId: number): Promise<UploadScheduleWithProject[]>;
  createUploadScheduleItem(item: InsertUploadSchedule): Promise<UploadSchedule>;
  updateUploadScheduleItem(id: number, item: Partial<InsertUploadSchedule>): Promise<UploadSchedule | undefined>;
  
  // Activities
  getActivities(limit?: number): Promise<ActivityWithDetails[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Project Members
  addProjectMember(projectId: number, memberId: number): Promise<void>;
  removeProjectMember(projectId: number, memberId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private projects: Map<number, Project>;
  private teamMembers: Map<number, TeamMember>;
  private projectMembers: Map<number, { projectId: number; memberId: number }>;
  private uploadSchedule: Map<number, UploadSchedule>;
  private activities: Map<number, Activity>;
  private currentProjectId: number;
  private currentMemberId: number;
  private currentProjectMemberId: number;
  private currentScheduleId: number;
  private currentActivityId: number;

  constructor() {
    this.projects = new Map();
    this.teamMembers = new Map();
    this.projectMembers = new Map();
    this.uploadSchedule = new Map();
    this.activities = new Map();
    this.currentProjectId = 1;
    this.currentMemberId = 1;
    this.currentProjectMemberId = 1;
    this.currentScheduleId = 1;
    this.currentActivityId = 1;
    
    this.seedData();
  }

  private seedData() {
    // Create team members
    const teamMembers = [
      { name: "Alex Johnson", role: "Content Manager", avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100", email: "alex@team.com" },
      { name: "Sarah Chen", role: "Video Editor", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100", email: "sarah@team.com" },
      { name: "Mike Johnson", role: "Script Writer", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100", email: "mike@team.com" },
      { name: "Emma Wilson", role: "Content Planner", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100", email: "emma@team.com" },
    ];

    teamMembers.forEach(member => {
      const id = this.currentMemberId++;
      this.teamMembers.set(id, { ...member, id });
    });

    // Create projects
    const projects = [
      { name: "Tech Tutorials", category: "Technology", status: "Active", thumbnailUrl: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100", subscribers: 24500, videoCount: 127, monthlyViews: 185000 },
      { name: "Gaming Central", category: "Gaming", status: "In Review", thumbnailUrl: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100", subscribers: 48200, videoCount: 203, monthlyViews: 342000 },
      { name: "Lifestyle Vibe", category: "Lifestyle", status: "Active", thumbnailUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100", subscribers: 12800, videoCount: 89, monthlyViews: 98000 },
    ];

    projects.forEach(project => {
      const id = this.currentProjectId++;
      this.projects.set(id, { ...project, id, createdAt: new Date() });
    });

    // Create project members
    const projectMemberAssignments = [
      { projectId: 1, memberId: 1 },
      { projectId: 1, memberId: 2 },
      { projectId: 2, memberId: 1 },
      { projectId: 2, memberId: 3 },
      { projectId: 3, memberId: 4 },
      { projectId: 3, memberId: 2 },
    ];

    projectMemberAssignments.forEach(assignment => {
      const id = this.currentProjectMemberId++;
      this.projectMembers.set(id, { ...assignment });
    });

    // Create upload schedule
    const scheduleItems = [
      { projectId: 1, title: "React Hooks Tutorial", scheduledDate: new Date("2024-12-15T14:00:00Z"), status: "scheduled", description: "Advanced React Hooks deep dive" },
      { projectId: 2, title: "New Game Review", scheduledDate: new Date("2024-12-17T17:00:00Z"), status: "scheduled", description: "Latest AAA game review" },
      { projectId: 3, title: "Morning Routine Vlog", scheduledDate: new Date("2024-12-20T10:00:00Z"), status: "scheduled", description: "Daily morning routine for productivity" },
    ];

    scheduleItems.forEach(item => {
      const id = this.currentScheduleId++;
      this.uploadSchedule.set(id, { ...item, id });
    });

    // Create activities
    const activities = [
      { userId: 2, projectId: 1, action: "uploaded a new video to", details: "React Hooks Tutorial" },
      { userId: 3, projectId: 2, action: "completed the script review for", details: "New Game Review" },
      { userId: 4, projectId: 3, action: "scheduled 3 new videos for", details: "Lifestyle content planning" },
    ];

    activities.forEach(activity => {
      const id = this.currentActivityId++;
      this.activities.set(id, { ...activity, id, createdAt: new Date() });
    });
  }

  async getProjects(): Promise<ProjectWithMembers[]> {
    const projects = Array.from(this.projects.values());
    return projects.map(project => ({
      ...project,
      members: this.getProjectMembers(project.id)
    }));
  }

  async getProject(id: number): Promise<ProjectWithMembers | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    return {
      ...project,
      members: this.getProjectMembers(id)
    };
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const newProject: Project = { ...project, id, createdAt: new Date() };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) return undefined;
    
    const updatedProject = { ...existingProject, ...project };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values());
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    return this.teamMembers.get(id);
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const id = this.currentMemberId++;
    const newMember: TeamMember = { ...member, id };
    this.teamMembers.set(id, newMember);
    return newMember;
  }

  async getUploadSchedule(): Promise<UploadScheduleWithProject[]> {
    const scheduleItems = Array.from(this.uploadSchedule.values());
    return scheduleItems.map(item => ({
      ...item,
      project: this.projects.get(item.projectId!)!
    }));
  }

  async getUploadScheduleByProject(projectId: number): Promise<UploadScheduleWithProject[]> {
    const scheduleItems = Array.from(this.uploadSchedule.values()).filter(item => item.projectId === projectId);
    return scheduleItems.map(item => ({
      ...item,
      project: this.projects.get(item.projectId!)!
    }));
  }

  async createUploadScheduleItem(item: InsertUploadSchedule): Promise<UploadSchedule> {
    const id = this.currentScheduleId++;
    const newItem: UploadSchedule = { ...item, id };
    this.uploadSchedule.set(id, newItem);
    return newItem;
  }

  async updateUploadScheduleItem(id: number, item: Partial<InsertUploadSchedule>): Promise<UploadSchedule | undefined> {
    const existingItem = this.uploadSchedule.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { ...existingItem, ...item };
    this.uploadSchedule.set(id, updatedItem);
    return updatedItem;
  }

  async getActivities(limit = 10): Promise<ActivityWithDetails[]> {
    const activities = Array.from(this.activities.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
    
    return activities.map(activity => ({
      ...activity,
      user: this.teamMembers.get(activity.userId!)!,
      project: this.projects.get(activity.projectId!)!
    }));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const newActivity: Activity = { ...activity, id, createdAt: new Date() };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async addProjectMember(projectId: number, memberId: number): Promise<void> {
    const id = this.currentProjectMemberId++;
    this.projectMembers.set(id, { projectId, memberId });
  }

  async removeProjectMember(projectId: number, memberId: number): Promise<void> {
    for (const [id, member] of this.projectMembers.entries()) {
      if (member.projectId === projectId && member.memberId === memberId) {
        this.projectMembers.delete(id);
        break;
      }
    }
  }

  private getProjectMembers(projectId: number): TeamMember[] {
    const memberIds = Array.from(this.projectMembers.values())
      .filter(pm => pm.projectId === projectId)
      .map(pm => pm.memberId);
    
    return memberIds.map(id => this.teamMembers.get(id)!).filter(Boolean);
  }
}

export const storage = new MemStorage();
