# Team Hub - YouTube Content Management System

## Overview

Team Hub is a comprehensive YouTube content management system built with React, TypeScript, and Express.js. It provides a dashboard for managing multiple YouTube channels, project collaboration, upload scheduling, and team coordination. The application features a modern, responsive design using shadcn/ui components and Tailwind CSS.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **API Pattern**: RESTful API with JSON responses
- **Validation**: Zod for request validation and type safety

### Data Storage
- **Primary Database**: PostgreSQL hosted on Neon
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Connection**: Serverless-first approach with connection pooling

## Key Components

### Database Schema
The application uses a relational database with the following main entities:

1. **Projects**: YouTube channels/projects with metadata (subscribers, views, status)
2. **Team Members**: User accounts with roles and profile information
3. **Project Members**: Many-to-many relationship between projects and team members
4. **Upload Schedule**: Scheduled content uploads with project associations
5. **Activities**: Activity feed tracking team actions and project updates

### API Endpoints
- `GET /api/projects` - Retrieve all projects with member details
- `GET /api/projects/:id` - Get specific project information
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project details
- `GET /api/upload-schedule` - Get scheduled uploads
- `POST /api/upload-schedule` - Schedule new upload
- `GET /api/activities` - Retrieve recent team activities

### Frontend Pages
- **Dashboard**: Overview with stats, project grid, schedule preview, and activity feed
- **Projects**: Complete project management with filtering and CRUD operations
- **Schedule**: Calendar view and list of scheduled uploads
- **Not Found**: 404 error page with user-friendly messaging

### UI Components
- **Layout**: Responsive sidebar navigation with header
- **Dashboard**: Stats cards, project hub, upload schedule, and activity feed
- **Projects**: Project cards with status badges and metrics
- **Forms**: Form handling with React Hook Form and Zod validation

## Data Flow

1. **Client Requests**: React components make API calls using React Query
2. **API Layer**: Express routes handle requests and validate data with Zod
3. **Database Operations**: Drizzle ORM executes type-safe database queries
4. **Response**: JSON data returned to client with proper error handling
5. **UI Updates**: React Query manages cache invalidation and UI updates

## External Dependencies

### Core Framework Dependencies
- React 18 with TypeScript support
- Express.js for server-side API
- Drizzle ORM with PostgreSQL dialect
- Neon Database for serverless PostgreSQL

### UI and Styling
- shadcn/ui component library
- Radix UI primitives for accessibility
- Tailwind CSS for styling
- Lucide React for icons

### Development Tools
- Vite for build tooling and development server
- TypeScript for type safety
- ESBuild for server bundling
- React Query for data fetching and caching

## Deployment Strategy

### Development Environment
- **Server**: Node.js with tsx for TypeScript execution
- **Client**: Vite development server with HMR
- **Database**: Neon Database with connection pooling
- **Build**: Separate client and server build processes

### Production Build
- **Client**: Vite builds static assets to `dist/public`
- **Server**: ESBuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations for schema updates
- **Environment**: NODE_ENV=production with optimized builds

### Database Management
- **Migrations**: Drizzle Kit handles schema migrations
- **Connection**: Environment variable `DATABASE_URL` for database connection
- **Schema**: Centralized schema definition in `shared/schema.ts`

## Changelog

- July 06, 2025: Initial setup with dashboard, project management, and scheduling features
- July 06, 2025: Database implementation with PostgreSQL and Drizzle ORM
- July 06, 2025: Authentication system integrated with Replit OAuth for internal employee access
- July 06, 2025: Sample data seeded for demonstration purposes
- July 06, 2025: Demo data cleared and seeding disabled for production use
- July 06, 2025: YouTube API integration added with channel sync functionality

## YouTube API Integration

### Features Added
- **YouTube Channel Linking**: Projects can be linked to YouTube channels via channel ID
- **Real-time Data Sync**: Fetch live subscriber counts, view counts, and video counts
- **Channel Search**: Search for YouTube channels by name to find channel IDs
- **Automatic Updates**: Sync button on project cards to update data from YouTube
- **Channel Information**: Display channel thumbnails, URLs, and statistics

### API Endpoints
- `GET /api/youtube/channel/:channelId` - Fetch channel data by ID
- `GET /api/youtube/search/:query` - Search for channels by name
- `POST /api/projects/:id/sync-youtube` - Sync project with YouTube data
- `GET /api/youtube/channel/:channelId/videos` - Get channel videos

### Database Schema Updates
- Added `youtubeChannelId` field to projects table
- Added `youtubeChannelUrl` field for channel links
- Added `lastSyncedAt` timestamp for tracking sync status

## To-Do System

### Features Implemented
- **Personal Task Management**: Users can create and manage personal to-dos
- **User Assignment**: Assign tasks to any team member in the system
- **Project-Specific Tasks**: Link tasks to specific projects or keep them as general tasks
- **Priority Levels**: Four priority levels (low, medium, high, urgent) with color coding
- **Status Tracking**: Track task status (pending, in_progress, completed)
- **Due Dates**: Optional due date setting with overdue indicators
- **Filtering & Views**: Filter by status, priority, project; toggle between grid and list views
- **Assignment Views**: Separate tabs for "Assigned to Me" and "Created by Me"

### Database Schema Updates
- Added `todos` table with fields for title, description, status, priority, due dates
- User assignment with `assignedTo` and `assignedBy` foreign keys
- Optional project association via `projectId` foreign key
- Automatic timestamp tracking for creation, updates, and completion

### API Endpoints
- `GET /api/todos` - Fetch todos with filtering options
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update todo
- `PUT /api/todos/:id/complete` - Mark todo as completed
- `DELETE /api/todos/:id` - Delete todo
- `GET /api/users` - Fetch users for assignment dropdown

### Frontend Components
- **Todo Page**: Complete task management interface with tabs and filtering
- **Create Todo Dialog**: Form for creating new tasks with all options
- **Todo Card**: Display component with grid/list view support
- **Navigation**: Added to sidebar with CheckSquare icon

## User Preferences

Preferred communication style: Simple, everyday language.
Target audience: Internal employees of myteam.berlin (not public-facing)