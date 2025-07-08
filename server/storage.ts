import { 
  users,
  projects, 
  teamMembers, 
  projectMembers, 
  uploadSchedule, 
  activities,
  projectPermissions,
  descriptionTemplates,
  todos,
  pinboardPages,
  pinboardItems,
  pinboardNotes,
  pinboardPolls,
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
  type Todo,
  type InsertTodo,
  type PinboardPage,
  type InsertPinboardPage,
  type PinboardItem,
  type InsertPinboardItem,
  type PinboardNote,
  type InsertPinboardNote,
  type PinboardPoll,
  type InsertPinboardPoll,
  type ProjectWithMembers,
  type UploadScheduleWithProject,
  type ActivityWithDetails,
  type TodoWithDetails,
  type PinboardPageWithItems,
  type PinboardItemWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql } from "drizzle-orm";

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
  deleteUploadScheduleItem(id: number, userId: string): Promise<boolean>;
  
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
  
  // Todos
  getTodos(userId?: string, projectId?: number): Promise<TodoWithDetails[]>;
  getTodo(id: number): Promise<TodoWithDetails | undefined>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, todo: Partial<InsertTodo>): Promise<Todo | undefined>;
  deleteTodo(id: number, userId: string): Promise<boolean>;
  markTodoComplete(id: number, userId: string): Promise<Todo | undefined>;
  addTodoTick(id: number, userId: string): Promise<Todo | undefined>;
  completeAllTicks(id: number, userId: string): Promise<Todo | undefined>;
  getAssignedTodos(userId: string): Promise<TodoWithDetails[]>;
  getCreatedTodos(userId: string): Promise<TodoWithDetails[]>;
  
  // Pinboard Pages
  getPinboardPages(userId?: string): Promise<PinboardPageWithItems[]>;
  getPinboardPage(id: number): Promise<PinboardPageWithItems | undefined>;
  createPinboardPage(page: InsertPinboardPage): Promise<PinboardPage>;
  updatePinboardPage(id: number, page: Partial<InsertPinboardPage>, userId: string): Promise<PinboardPage | undefined>;
  deletePinboardPage(id: number, userId: string): Promise<boolean>;
  
  // Pinboard Items
  getPinboardItems(pageId: number): Promise<PinboardItemWithDetails[]>;
  createPinboardItem(item: InsertPinboardItem): Promise<PinboardItem>;
  updatePinboardItem(id: number, item: Partial<InsertPinboardItem>, userId: string): Promise<PinboardItem | undefined>;
  deletePinboardItem(id: number, userId: string): Promise<boolean>;
  
  // Pinboard Notes
  createPinboardNote(note: InsertPinboardNote): Promise<PinboardNote>;
  updatePinboardNote(id: number, note: Partial<InsertPinboardNote>, userId: string): Promise<PinboardNote | undefined>;
  deletePinboardNote(id: number, userId: string): Promise<boolean>;
  
  // Pinboard Polls
  createPinboardPoll(poll: InsertPinboardPoll): Promise<PinboardPoll>;
  updatePinboardPoll(id: number, poll: Partial<InsertPinboardPoll>, userId: string): Promise<PinboardPoll | undefined>;
  deletePinboardPoll(id: number, userId: string): Promise<boolean>;
  votePinboardPoll(pollId: number, userId: string, optionIndex: number): Promise<PinboardPoll | undefined>;
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
    
    // Also create or update team member entry for this user
    await db
      .insert(teamMembers)
      .values({
        userId: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Unknown User',
        email: user.email || '',
        role: 'member',
        avatarUrl: user.profileImageUrl,
      })
      .onConflictDoNothing();
    
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
    // First ensure all users are synced as team members
    await this.syncUsersAsTeamMembers();
    return await db.select().from(teamMembers).where(eq(teamMembers.isActive, true));
  }

  private async syncUsersAsTeamMembers(): Promise<void> {
    // Get all users
    const allUsers = await db.select().from(users);
    
    // Get existing team member user IDs
    const existingTeamMembers = await db.select({ userId: teamMembers.userId }).from(teamMembers);
    const existingUserIds = new Set(existingTeamMembers.map(tm => tm.userId));
    
    // Create team member entries for users who don't have one
    for (const user of allUsers) {
      if (!existingUserIds.has(user.id)) {
        await db
          .insert(teamMembers)
          .values({
            userId: user.id,
            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Unknown User',
            email: user.email || '',
            role: 'member',
            avatarUrl: user.profileImageUrl,
          });
      }
    }
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

  async deleteUploadScheduleItem(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(uploadSchedule)
      .where(eq(uploadSchedule.id, id))
      .returning();
    return result.length > 0;
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

  // Todo operations
  async getTodos(userId?: string, projectId?: number): Promise<TodoWithDetails[]> {
    let query = db
      .select()
      .from(todos)
      .leftJoin(users, eq(todos.assignedTo, users.id))
      .leftJoin(projects, eq(todos.projectId, projects.id))
      .orderBy(desc(todos.createdAt));

    // Apply privacy and user filters
    const conditions = [];
    
    if (userId) {
      // User can see todos if they are assigned or created them, OR if it's public OR they're in visibleTo
      conditions.push(
        and(
          or(
            eq(todos.assignedTo, userId),
            eq(todos.assignedBy, userId)
          ),
          or(
            eq(todos.isPrivate, false),
            eq(todos.assignedTo, userId),
            eq(todos.assignedBy, userId),
            sql`${userId} = ANY(${todos.visibleTo})`
          )
        )
      );
    }

    if (projectId) {
      conditions.push(eq(todos.projectId, projectId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const todosData = await query;
    
    // Get assignedBy users for each todo
    const todosWithDetails: TodoWithDetails[] = [];
    for (const item of todosData) {
      const [assignedByUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, item.todos.assignedBy));
      
      todosWithDetails.push({
        ...item.todos,
        assignedToUser: item.users!,
        assignedByUser: assignedByUser,
        project: item.projects || undefined,
      });
    }
    
    return todosWithDetails;
  }

  async getTodo(id: number): Promise<TodoWithDetails | undefined> {
    const [todoData] = await db
      .select()
      .from(todos)
      .leftJoin(users, eq(todos.assignedTo, users.id))
      .leftJoin(projects, eq(todos.projectId, projects.id))
      .where(eq(todos.id, id));

    if (!todoData) return undefined;

    // Get the assignedBy user separately
    const [assignedByUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, todoData.todos.assignedBy));

    return {
      ...todoData.todos,
      assignedToUser: todoData.users!,
      assignedByUser: assignedByUser!,
      project: todoData.projects || undefined,
    };
  }

  async createTodo(todo: InsertTodo): Promise<Todo> {
    const [newTodo] = await db
      .insert(todos)
      .values(todo)
      .returning();
    return newTodo;
  }

  async updateTodo(id: number, todo: Partial<InsertTodo>): Promise<Todo | undefined> {
    const [updatedTodo] = await db
      .update(todos)
      .set({ ...todo, updatedAt: new Date() })
      .where(eq(todos.id, id))
      .returning();
    return updatedTodo || undefined;
  }

  async deleteTodo(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(todos)
      .where(and(
        eq(todos.id, id),
        eq(todos.assignedBy, userId)
      ));
    return (result.rowCount || 0) > 0;
  }

  async markTodoComplete(id: number, userId: string): Promise<Todo | undefined> {
    const [updatedTodo] = await db
      .update(todos)
      .set({ 
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(todos.id, id),
        eq(todos.assignedTo, userId)
      ))
      .returning();
    return updatedTodo || undefined;
  }

  async addTodoTick(id: number, userId: string): Promise<Todo | undefined> {
    // Get current todo
    const [todo] = await db
      .select()
      .from(todos)
      .where(and(
        eq(todos.id, id),
        eq(todos.assignedTo, userId)
      ));
    
    if (!todo) return undefined;
    
    const newTicks = Math.min(todo.currentTicks + 1, todo.totalTicks);
    const isCompleted = newTicks >= todo.totalTicks;
    
    const [updatedTodo] = await db
      .update(todos)
      .set({
        currentTicks: newTicks,
        status: isCompleted ? 'completed' : 'in_progress',
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(todos.id, id))
      .returning();
    
    return updatedTodo || undefined;
  }

  async completeAllTicks(id: number, userId: string): Promise<Todo | undefined> {
    const [updatedTodo] = await db
      .update(todos)
      .set({
        currentTicks: sql`${todos.totalTicks}`,
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(todos.id, id),
        eq(todos.assignedTo, userId)
      ))
      .returning();
    
    return updatedTodo || undefined;
  }

  async getAssignedTodos(userId: string): Promise<TodoWithDetails[]> {
    return this.getTodos(userId);
  }

  async getCreatedTodos(userId: string): Promise<TodoWithDetails[]> {
    const todosData = await db
      .select()
      .from(todos)
      .leftJoin(users, eq(todos.assignedTo, users.id))
      .leftJoin(projects, eq(todos.projectId, projects.id))
      .where(eq(todos.assignedBy, userId))
      .orderBy(desc(todos.createdAt));

    return todosData.map(item => ({
      ...item.todos,
      assignedToUser: item.users!,
      assignedByUser: item.users!, // This will be the current user
      project: item.projects || undefined,
    }));
  }

  // Pinboard Pages
  async getPinboardPages(userId?: string): Promise<PinboardPageWithItems[]> {
    const pages = await db.select().from(pinboardPages).orderBy(pinboardPages.pageNumber);
    
    const pagesWithItems = await Promise.all(
      pages.map(async (page) => {
        const items = await this.getPinboardItems(page.id);
        const createdByUser = await this.getUser(page.createdBy);
        
        return {
          ...page,
          items,
          createdBy: createdByUser!,
        };
      })
    );
    
    return pagesWithItems;
  }

  async getPinboardPage(id: number): Promise<PinboardPageWithItems | undefined> {
    const [page] = await db.select().from(pinboardPages).where(eq(pinboardPages.id, id));
    if (!page) return undefined;
    
    const items = await this.getPinboardItems(page.id);
    const createdByUser = await this.getUser(page.createdBy);
    
    return {
      ...page,
      items,
      createdBy: createdByUser!,
    };
  }

  async createPinboardPage(page: InsertPinboardPage): Promise<PinboardPage> {
    const [newPage] = await db.insert(pinboardPages).values(page).returning();
    return newPage;
  }

  async updatePinboardPage(id: number, page: Partial<InsertPinboardPage>, userId: string): Promise<PinboardPage | undefined> {
    const [updatedPage] = await db
      .update(pinboardPages)
      .set({ ...page, updatedAt: new Date() })
      .where(and(eq(pinboardPages.id, id), eq(pinboardPages.createdBy, userId)))
      .returning();
    
    return updatedPage || undefined;
  }

  async deletePinboardPage(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(pinboardPages)
      .where(and(eq(pinboardPages.id, id), eq(pinboardPages.createdBy, userId)));
    
    return result.rowCount > 0;
  }

  // Pinboard Items
  async getPinboardItems(pageId: number): Promise<PinboardItemWithDetails[]> {
    const items = await db
      .select()
      .from(pinboardItems)
      .where(eq(pinboardItems.pageId, pageId))
      .orderBy(pinboardItems.zIndex);
    
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const createdByUser = await this.getUser(item.createdBy);
        let note, poll, todo;
        
        if (item.itemType === 'note' && item.itemId) {
          const [noteData] = await db.select().from(pinboardNotes).where(eq(pinboardNotes.id, item.itemId));
          note = noteData;
        } else if (item.itemType === 'poll' && item.itemId) {
          const [pollData] = await db.select().from(pinboardPolls).where(eq(pinboardPolls.id, item.itemId));
          poll = pollData;
        } else if (item.itemType === 'todo' && item.itemId) {
          todo = await this.getTodo(item.itemId);
        }
        
        return {
          ...item,
          createdBy: createdByUser!,
          note,
          poll,
          todo,
        };
      })
    );
    
    return itemsWithDetails;
  }

  async createPinboardItem(item: InsertPinboardItem): Promise<PinboardItem> {
    const [newItem] = await db.insert(pinboardItems).values(item).returning();
    return newItem;
  }

  async updatePinboardItem(id: number, item: Partial<InsertPinboardItem>, userId: string): Promise<PinboardItem | undefined> {
    const [updatedItem] = await db
      .update(pinboardItems)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(pinboardItems.id, id), eq(pinboardItems.createdBy, userId)))
      .returning();
    
    return updatedItem || undefined;
  }

  async deletePinboardItem(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(pinboardItems)
      .where(and(eq(pinboardItems.id, id), eq(pinboardItems.createdBy, userId)));
    
    return result.rowCount > 0;
  }

  // Pinboard Notes
  async createPinboardNote(note: InsertPinboardNote): Promise<PinboardNote> {
    const [newNote] = await db.insert(pinboardNotes).values(note).returning();
    return newNote;
  }

  async updatePinboardNote(id: number, note: Partial<InsertPinboardNote>, userId: string): Promise<PinboardNote | undefined> {
    const [updatedNote] = await db
      .update(pinboardNotes)
      .set({ ...note, updatedAt: new Date() })
      .where(and(eq(pinboardNotes.id, id), eq(pinboardNotes.createdBy, userId)))
      .returning();
    
    return updatedNote || undefined;
  }

  async deletePinboardNote(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(pinboardNotes)
      .where(and(eq(pinboardNotes.id, id), eq(pinboardNotes.createdBy, userId)));
    
    return result.rowCount > 0;
  }

  // Pinboard Polls
  async createPinboardPoll(poll: InsertPinboardPoll): Promise<PinboardPoll> {
    const [newPoll] = await db.insert(pinboardPolls).values(poll).returning();
    return newPoll;
  }

  async updatePinboardPoll(id: number, poll: Partial<InsertPinboardPoll>, userId: string): Promise<PinboardPoll | undefined> {
    const [updatedPoll] = await db
      .update(pinboardPolls)
      .set({ ...poll, updatedAt: new Date() })
      .where(and(eq(pinboardPolls.id, id), eq(pinboardPolls.createdBy, userId)))
      .returning();
    
    return updatedPoll || undefined;
  }

  async deletePinboardPoll(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(pinboardPolls)
      .where(and(eq(pinboardPolls.id, id), eq(pinboardPolls.createdBy, userId)));
    
    return result.rowCount > 0;
  }

  async votePinboardPoll(pollId: number, userId: string, optionIndex: number): Promise<PinboardPoll | undefined> {
    const [poll] = await db.select().from(pinboardPolls).where(eq(pinboardPolls.id, pollId));
    if (!poll) return undefined;
    
    const votes = (poll.votes as any) || {};
    votes[userId] = optionIndex;
    
    const [updatedPoll] = await db
      .update(pinboardPolls)
      .set({ votes, updatedAt: new Date() })
      .where(eq(pinboardPolls.id, pollId))
      .returning();
    
    return updatedPoll || undefined;
  }
}

export const storage = new DatabaseStorage();