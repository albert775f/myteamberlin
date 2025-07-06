import { 
  users,
  projects, 
  teamMembers, 
  projectMembers, 
  uploadSchedule, 
  activities,
  projectPermissions,
  descriptionTemplates,
  type User,
  type UpsertUser,
  type Project, 
  type InsertProject,
  type TeamMember,
  type InsertTeamMember,
  type UploadSchedule,
  type InsertUploadSchedule,
  type Activity,
  type InsertActivity,
  type ProjectPermission,
  type InsertProjectPermission,
  type DescriptionTemplate,
  type InsertDescriptionTemplate,
  type ProjectWithMembers,
  type UploadScheduleWithProject,
  type ActivityWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Projects
  getProjects(userId?: string): Promise<ProjectWithMembers[]>;
  getProject(id: number, userId?: string): Promise<ProjectWithMembers | undefined>;
  createProject(project: InsertProject, userId: string): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>, userId: string): Promise<Project | undefined>;
  deleteProject(id: number, userId: string): Promise<boolean>;
  
  // Team Members
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  
  // Upload Schedule
  getUploadSchedule(userId?: string): Promise<UploadScheduleWithProject[]>;
  getUploadScheduleByProject(projectId: number, userId?: string): Promise<UploadScheduleWithProject[]>;
  createUploadScheduleItem(item: InsertUploadSchedule, userId: string): Promise<UploadSchedule>;
  updateUploadScheduleItem(id: number, item: Partial<InsertUploadSchedule>, userId: string): Promise<UploadSchedule | undefined>;
  
  // Activities
  getActivities(limit?: number, userId?: string): Promise<ActivityWithDetails[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Description Templates
  getDescriptionTemplates(projectId?: number): Promise<DescriptionTemplate[]>;
  getDescriptionTemplate(id: number): Promise<DescriptionTemplate | undefined>;
  createDescriptionTemplate(template: InsertDescriptionTemplate): Promise<DescriptionTemplate>;
  updateDescriptionTemplate(id: number, template: Partial<InsertDescriptionTemplate>): Promise<DescriptionTemplate | undefined>;
  deleteDescriptionTemplate(id: number): Promise<boolean>;
  
  // Project Members & Permissions
  addProjectMember(projectId: number, memberId: number, userId: string): Promise<void>;
  removeProjectMember(projectId: number, memberId: number, userId: string): Promise<void>;
  setProjectPermission(projectId: number, userId: string, permission: string, grantedBy: string): Promise<void>;
  hasProjectPermission(projectId: number, userId: string, permission: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Projects
  async getProjects(userId?: string): Promise<ProjectWithMembers[]> {
    const projectsData = await db.select().from(projects).orderBy(desc(projects.createdAt));
    const projectsWithMembers: ProjectWithMembers[] = [];

    for (const project of projectsData) {
      const members = await this.getProjectMembers(project.id);
      projectsWithMembers.push({
        ...project,
        members,
      });
    }

    return projectsWithMembers;
  }

  async getProject(id: number, userId?: string): Promise<ProjectWithMembers | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;

    const members = await this.getProjectMembers(id);
    return {
      ...project,
      members,
    };
  }

  async createProject(project: InsertProject, userId: string): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values({
        ...project,
        createdBy: userId,
      })
      .returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>, userId: string): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Team Members
  async getTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.isActive, true));
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  // Upload Schedule
  async getUploadSchedule(userId?: string): Promise<UploadScheduleWithProject[]> {
    const scheduleData = await db
      .select()
      .from(uploadSchedule)
      .leftJoin(projects, eq(uploadSchedule.projectId, projects.id))
      .orderBy(uploadSchedule.scheduledDate);

    return scheduleData.map(item => ({
      ...item.upload_schedule,
      project: item.projects!,
    }));
  }

  async getUploadScheduleByProject(projectId: number, userId?: string): Promise<UploadScheduleWithProject[]> {
    const scheduleData = await db
      .select()
      .from(uploadSchedule)
      .leftJoin(projects, eq(uploadSchedule.projectId, projects.id))
      .where(eq(uploadSchedule.projectId, projectId))
      .orderBy(uploadSchedule.scheduledDate);

    return scheduleData.map(item => ({
      ...item.upload_schedule,
      project: item.projects!,
    }));
  }

  async createUploadScheduleItem(item: InsertUploadSchedule, userId: string): Promise<UploadSchedule> {
    const [newItem] = await db
      .insert(uploadSchedule)
      .values({
        ...item,
        createdBy: userId,
      })
      .returning();
    return newItem;
  }

  async updateUploadScheduleItem(id: number, item: Partial<InsertUploadSchedule>, userId: string): Promise<UploadSchedule | undefined> {
    const [updatedItem] = await db
      .update(uploadSchedule)
      .set(item)
      .where(eq(uploadSchedule.id, id))
      .returning();
    return updatedItem;
  }

  // Activities
  async getActivities(limit = 10, userId?: string): Promise<ActivityWithDetails[]> {
    const activitiesData = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .leftJoin(projects, eq(activities.projectId, projects.id))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return activitiesData.map(item => ({
      ...item.activities,
      user: item.users!,
      project: item.projects!,
    }));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  // Project Members & Permissions
  async addProjectMember(projectId: number, memberId: number, userId: string): Promise<void> {
    await db.insert(projectMembers).values({ projectId, memberId });
  }

  async removeProjectMember(projectId: number, memberId: number, userId: string): Promise<void> {
    await db.delete(projectMembers).where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.memberId, memberId)
      )
    );
  }

  async setProjectPermission(projectId: number, userId: string, permission: string, grantedBy: string): Promise<void> {
    await db.insert(projectPermissions).values({
      projectId,
      userId,
      permission,
      grantedBy,
    });
  }

  async hasProjectPermission(projectId: number, userId: string, permission: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(projectPermissions)
      .where(
        and(
          eq(projectPermissions.projectId, projectId),
          eq(projectPermissions.userId, userId),
          eq(projectPermissions.permission, permission)
        )
      );
    return !!result;
  }

  // Description Templates
  async getDescriptionTemplates(projectId?: number): Promise<DescriptionTemplate[]> {
    const query = db.select().from(descriptionTemplates);
    if (projectId) {
      query.where(eq(descriptionTemplates.projectId, projectId));
    }
    return await query.orderBy(desc(descriptionTemplates.createdAt));
  }

  async getDescriptionTemplate(id: number): Promise<DescriptionTemplate | undefined> {
    const [template] = await db
      .select()
      .from(descriptionTemplates)
      .where(eq(descriptionTemplates.id, id));
    return template || undefined;
  }

  async createDescriptionTemplate(template: InsertDescriptionTemplate): Promise<DescriptionTemplate> {
    const [newTemplate] = await db
      .insert(descriptionTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateDescriptionTemplate(id: number, template: Partial<InsertDescriptionTemplate>): Promise<DescriptionTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(descriptionTemplates)
      .set(template)
      .where(eq(descriptionTemplates.id, id))
      .returning();
    return updatedTemplate || undefined;
  }

  async deleteDescriptionTemplate(id: number): Promise<boolean> {
    const result = await db
      .delete(descriptionTemplates)
      .where(eq(descriptionTemplates.id, id));
    return (result.rowCount || 0) > 0;
  }

  private async getProjectMembers(projectId: number): Promise<TeamMember[]> {
    const membersData = await db
      .select()
      .from(projectMembers)
      .leftJoin(teamMembers, eq(projectMembers.memberId, teamMembers.id))
      .where(eq(projectMembers.projectId, projectId));

    return membersData.map(item => item.team_members!);
  }
}

export const storage = new DatabaseStorage();