import { pgTable, text, serial, integer, timestamp, boolean, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User authentication table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("member"), // admin, manager, member
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team members table (now linked to users)
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  subscribers: integer("subscribers").default(0),
  videoCount: integer("video_count").default(0),
  monthlyViews: integer("monthly_views").default(0),
  youtubeChannelId: text("youtube_channel_id"),
  youtubeChannelUrl: text("youtube_channel_url"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project permissions table
export const projectPermissions = pgTable("project_permissions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  userId: varchar("user_id").references(() => users.id),
  permission: text("permission").notNull(), // view, edit, admin
  grantedBy: varchar("granted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  memberId: integer("member_id").references(() => teamMembers.id),
});

export const uploadSchedule = pgTable("upload_schedule", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  title: text("title").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: text("status").notNull().default("scheduled"),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const descriptionTemplates = pgTable("description_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  projectId: integer("project_id").references(() => projects.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, urgent
  dueDate: timestamp("due_date"),
  assignedTo: varchar("assigned_to").notNull().references(() => users.id),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  projectId: integer("project_id").references(() => projects.id), // null for general todos
  isPrivate: boolean("is_private").default(false), // private todos are only visible to creator and assignee
  visibleTo: text("visible_to").array().default([]), // additional users who can see this todo
  totalTicks: integer("total_ticks").default(1).notNull(), // number of ticks required to complete
  currentTicks: integer("current_ticks").default(0).notNull(), // number of ticks completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Pinboard tables
export const pinboardPages = pgTable("pinboard_pages", {
  id: serial("id").primaryKey(),
  pageNumber: integer("page_number").notNull(),
  title: varchar("title", { length: 255 }).notNull().default("Untitled Page"),
  backgroundColor: varchar("background_color", { length: 7 }).default("#ffffff"), // hex color
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pinboardItems = pgTable("pinboard_items", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().references(() => pinboardPages.id, { onDelete: "cascade" }),
  itemType: varchar("item_type", { length: 20 }).notNull(), // "todo", "poll", "note"
  itemId: integer("item_id"), // references the actual item (todoId, pollId, noteId)
  x: integer("x").notNull(), // horizontal position in pixels
  y: integer("y").notNull(), // vertical position in pixels
  width: integer("width").default(200), // width in pixels
  height: integer("height").default(150), // height in pixels
  zIndex: integer("z_index").default(0), // layering order
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pinboardNotes = pgTable("pinboard_notes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  backgroundColor: varchar("background_color", { length: 7 }).default("#ffeb3b"), // sticky note yellow
  textColor: varchar("text_color", { length: 7 }).default("#000000"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pinboardPolls = pgTable("pinboard_polls", {
  id: serial("id").primaryKey(),
  question: varchar("question", { length: 500 }).notNull(),
  options: text("options").array().notNull(), // array of poll options
  votes: jsonb("votes").default({}), // { userId: optionIndex }
  allowMultipleVotes: boolean("allow_multiple_votes").default(false),
  isAnonymous: boolean("is_anonymous").default(false),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  projects: many(projects),
  projectPermissions: many(projectPermissions),
  uploadSchedule: many(uploadSchedule),
  activities: many(activities),
  assignedTodos: many(todos, { relationName: "assignedTodos" }),
  createdTodos: many(todos, { relationName: "createdTodos" }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  members: many(projectMembers),
  permissions: many(projectPermissions),
  uploadSchedule: many(uploadSchedule),
  activities: many(activities),
  descriptionTemplates: many(descriptionTemplates),
  todos: many(todos),
}));

export const projectPermissionsRelations = relations(projectPermissions, ({ one }) => ({
  project: one(projects, {
    fields: [projectPermissions.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectPermissions.userId],
    references: [users.id],
  }),
  grantedByUser: one(users, {
    fields: [projectPermissions.grantedBy],
    references: [users.id],
  }),
}));

export const descriptionTemplatesRelations = relations(descriptionTemplates, ({ one }) => ({
  project: one(projects, {
    fields: [descriptionTemplates.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [descriptionTemplates.createdBy],
    references: [users.id],
  }),
}));

export const todosRelations = relations(todos, ({ one }) => ({
  assignedToUser: one(users, {
    fields: [todos.assignedTo],
    references: [users.id],
    relationName: "assignedTodos",
  }),
  assignedByUser: one(users, {
    fields: [todos.assignedBy],
    references: [users.id],
    relationName: "createdTodos",
  }),
  project: one(projects, {
    fields: [todos.projectId],
    references: [projects.id],
  }),
}));

// Pinboard relations
export const pinboardPagesRelations = relations(pinboardPages, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [pinboardPages.createdBy],
    references: [users.id],
  }),
  items: many(pinboardItems),
}));

export const pinboardItemsRelations = relations(pinboardItems, ({ one }) => ({
  page: one(pinboardPages, {
    fields: [pinboardItems.pageId],
    references: [pinboardPages.id],
  }),
  createdBy: one(users, {
    fields: [pinboardItems.createdBy],
    references: [users.id],
  }),
}));

export const pinboardNotesRelations = relations(pinboardNotes, ({ one }) => ({
  createdBy: one(users, {
    fields: [pinboardNotes.createdBy],
    references: [users.id],
  }),
}));

export const pinboardPollsRelations = relations(pinboardPolls, ({ one }) => ({
  createdBy: one(users, {
    fields: [pinboardPolls.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

export const insertUploadScheduleSchema = createInsertSchema(uploadSchedule).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertProjectPermissionSchema = createInsertSchema(projectPermissions).omit({
  id: true,
  createdAt: true,
});

export const insertDescriptionTemplateSchema = createInsertSchema(descriptionTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertTodoSchema = createInsertSchema(todos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertPinboardPageSchema = createInsertSchema(pinboardPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPinboardItemSchema = createInsertSchema(pinboardItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPinboardNoteSchema = createInsertSchema(pinboardNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPinboardPollSchema = createInsertSchema(pinboardPolls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type UploadSchedule = typeof uploadSchedule.$inferSelect;
export type InsertUploadSchedule = z.infer<typeof insertUploadScheduleSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type ProjectPermission = typeof projectPermissions.$inferSelect;
export type InsertProjectPermission = z.infer<typeof insertProjectPermissionSchema>;

export type DescriptionTemplate = typeof descriptionTemplates.$inferSelect;
export type InsertDescriptionTemplate = z.infer<typeof insertDescriptionTemplateSchema>;

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

export type PinboardPage = typeof pinboardPages.$inferSelect;
export type InsertPinboardPage = z.infer<typeof insertPinboardPageSchema>;

export type PinboardItem = typeof pinboardItems.$inferSelect;
export type InsertPinboardItem = z.infer<typeof insertPinboardItemSchema>;

export type PinboardNote = typeof pinboardNotes.$inferSelect;
export type InsertPinboardNote = z.infer<typeof insertPinboardNoteSchema>;

export type PinboardPoll = typeof pinboardPolls.$inferSelect;
export type InsertPinboardPoll = z.infer<typeof insertPinboardPollSchema>;

// Extended types with relations
export type ProjectWithMembers = Project & {
  members: TeamMember[];
  permissions?: ProjectPermission[];
};

export type UploadScheduleWithProject = UploadSchedule & {
  project: Project;
};

export type ActivityWithDetails = Activity & {
  user: User;
  project: Project;
};

export type TodoWithDetails = Todo & {
  assignedToUser: User;
  assignedByUser: User;
  project?: Project;
};

export type PinboardPageWithItems = PinboardPage & {
  items: PinboardItemWithDetails[];
  createdBy: User;
};

export type PinboardItemWithDetails = PinboardItem & {
  createdBy: User;
  note?: PinboardNote;
  poll?: PinboardPoll;
  todo?: TodoWithDetails;
};
