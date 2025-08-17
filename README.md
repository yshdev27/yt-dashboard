# YouTube Dashboard

A modern YouTube Dashboard built with Next.js 15, TypeScript, and the YouTube Data API v3. Manage your YouTube videos, post comments, and take notes all in one place.

## ✨ Features

- **YouTube Integration**: View and edit video details using YouTube Data API v3
- **Comment Management**: Post and delete comments on YouTube videos
- **Note Taking**: Create and manage notes for each video
- **Authentication**: Secure Google OAuth login with YouTube scopes
- **Event Logging**: Track all user actions and changes
- **Modern UI**: Clean interface built with shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM for data persistence

## 🚀 Tech Stack

- **Framework**: Next.js 15.4.6 with App Router
- **Language**: TypeScript
- **Authentication**: NextAuth.js 5.0.0-beta.25
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **API**: YouTube Data API v3
- **Deployment**: Netlify ready

## 🔑 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="your_postgresql_connection_string_here"
DIRECT_URL="your_direct_postgresql_connection_string_here"

# Authentication
AUTH_SECRET="your_nextauth_secret_here"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id_here"
GOOGLE_CLIENT_SECRET="your_google_client_secret_here"

# YouTube
YOUTUBE_VIDEO_ID="your_test_video_id_here"

# Production URL (for deployment)
AUTH_URL="https://your-site-name.netlify.app"
```

## 🗄️ Database Schema

The application uses PostgreSQL with Prisma ORM. Here's the complete database schema:

### Core Models

#### **User** - NextAuth.js user model
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  notes         Note[]
  logs          EventLog[]
}
```

#### **Account** - OAuth account linking
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}
```

#### **Session** - User session management
```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Custom Models

#### **Note** - User notes for videos
```prisma
model Note {
  id        String   @id @default(cuid())
  content   String   @db.Text
  tags      String[] // For search/tagging feature
  videoId   String   // YouTube video association
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@index([userId, videoId])
}
```

#### **EventLog** - Activity tracking
```prisma
model EventLog {
  id        String   @id @default(cuid())
  action    String   // e.g., "VIDEO_TITLE_UPDATED", "COMMENT_ADDED"
  details   Json     // Store extra details about the event
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

## 🔗 API Endpoints

### Authentication Endpoints

#### **NextAuth.js Routes**
- **GET/POST** `/api/auth/[...nextauth]` - Handles all NextAuth.js authentication flows
  - `/api/auth/signin` - Sign in page
  - `/api/auth/signout` - Sign out functionality
  - `/api/auth/callback/google` - Google OAuth callback
  - `/api/auth/session` - Get current session
  - `/api/auth/csrf` - CSRF token

### Server Actions (API Routes)

#### **Video Management**

##### `updateVideoDetails(videoId, newTitle, newDescription)`
- **Description**: Updates YouTube video title and description
- **Parameters**:
  - `videoId` (string) - YouTube video ID
  - `newTitle` (string) - New video title
  - `newDescription` (string) - New video description
- **Returns**: YouTube API response data
- **Requires**: Video ownership, YouTube API access
- **Events Logged**: `VIDEO_DETAILS_UPDATED`

#### **Comment Management**

##### `postNewComment(videoId, text)`
- **Description**: Posts a new comment on a YouTube video
- **Parameters**:
  - `videoId` (string) - YouTube video ID
  - `text` (string) - Comment content
- **Returns**: Success/error status
- **Requires**: Video comment permissions
- **Events Logged**: `COMMENT_ADDED`
- **Error Handling**:
  - `403 Forbidden` - Permission denied
  - `400 Bad Request` - Invalid video/disabled comments
  - `Quota Exceeded` - API limit reached

##### `deleteComment(commentId)`
- **Description**: Deletes a YouTube comment
- **Parameters**:
  - `commentId` (string) - YouTube comment ID
- **Returns**: Success/error status
- **Requires**: Comment ownership
- **Events Logged**: `COMMENT_DELETED`

#### **Note Management**

##### `createNote(videoId, content, tags)`
- **Description**: Creates a personal note for a video
- **Parameters**:
  - `videoId` (string) - YouTube video ID
  - `content` (string) - Note content
  - `tags` (string[]) - Array of tags
- **Returns**: Database note record
- **Requires**: User authentication
- **Events Logged**: `NOTE_CREATED`

##### `deleteNote(noteId)`
- **Description**: Deletes a user's note
- **Parameters**:
  - `noteId` (string) - Database note ID
- **Returns**: Success/error status
- **Requires**: Note ownership
- **Security**: Validates user owns the note
- **Events Logged**: `NOTE_DELETED`

### YouTube Data API Integration

The application integrates with the following YouTube Data API v3 endpoints:

- **Videos.update** - Update video metadata
- **CommentThreads.insert** - Post video comments
- **Comments.delete** - Delete comments
- **Videos.list** - Fetch video details (used in frontend)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yshdev27/yt-dashboard.git
   cd yt-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (see Environment Variables section above)

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 🔧 Google Cloud Setup

1. **Create a Google Cloud Project**
2. **Enable YouTube Data API v3**
3. **Create OAuth 2.0 Credentials**
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-site-name.netlify.app/api/auth/callback/google`

## 🚀 Deployment to Netlify

### Environment Variables in Netlify
Go to **Site settings → Environment variables** and add your actual credentials:

```
AUTH_SECRET=your_nextauth_secret_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
DATABASE_URL=your_postgresql_connection_string_here
DIRECT_URL=your_direct_postgresql_connection_string_here
YOUTUBE_VIDEO_ID=your_test_video_id_here
AUTH_URL=https://your-site-name.netlify.app
```

### Build Settings
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Node version**: `18`

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── _components/          # React components
│   │   ├── api/auth/            # NextAuth API routes
│   │   ├── actions.ts           # Server actions (API logic)
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Home page
│   ├── server/
│   │   ├── auth/                # Authentication config
│   │   └── db.ts                # Database connection
│   ├── styles/
│   │   └── globals.css          # Global styles
│   └── env.js                   # Environment validation
├── prisma/
│   └── schema.prisma            # Database schema
├── netlify.toml                 # Netlify configuration
└── next.config.js               # Next.js configuration
```

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string with pgbouncer | ✅ |
| `DIRECT_URL` | Direct PostgreSQL connection string | ✅ |
| `AUTH_SECRET` | NextAuth secret key | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ |
| `YOUTUBE_VIDEO_ID` | Default YouTube video ID for testing | ✅ |
| `AUTH_URL` | Production URL for NextAuth | 🔄 (Production only) |

## 🎯 Usage

1. **Sign in** with Google account
2. **View video details** - Dashboard loads specified YouTube video
3. **Edit video** - Update title/description (requires ownership)
4. **Manage comments** - Post/delete comments (requires permissions)
5. **Take notes** - Create personal notes with tags
6. **View activity** - All actions logged in EventLog table

## ⚠️ Important Notes

- **Comment posting** requires video ownership due to YouTube API limitations
- **Video editing** only works on videos you own
- **API quotas** apply to YouTube Data API usage
- **Database indexing** optimized for userId + videoId queries

## 🐛 Troubleshooting

### Common Issues

1. **Image loading errors**: Configured YouTube domains in Next.js
2. **Authentication errors**: Verify Google OAuth redirect URIs
3. **Database connection**: Check Supabase connection strings
4. **API limits**: YouTube API has daily quotas
5. **Comment permissions**: Most videos require ownership for commenting

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

---

Built with ❤️ using the [T3 Stack](https://create.t3.gg/)
