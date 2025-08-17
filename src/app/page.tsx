
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { google } from 'googleapis';
import { VideoEditor, NotesSection, CommentsSection, AuthButtons } from "./_components";

// This is a helper function to get an authenticated YouTube API client
async function getYouTubeClient() {
  const session = await auth();
  if (!session?.user || !session.accessToken) {
    throw new Error('Unauthenticated or missing access token');
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const authClient = new google.auth.OAuth2();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  authClient.setCredentials({ access_token: session.accessToken });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  return google.youtube({ version: 'v3', auth: authClient });
}

export default async function HomePage() {
  const session = await auth();
  const videoId = process.env.YOUTUBE_VIDEO_ID!;

  if (!session) {
    return (
      <main className="container mx-auto p-8">
        <h1 className="text-2xl font-bold">Welcome to your Dashboard</h1>
        <p>Please sign in to continue.</p>
        <AuthButtons />
      </main>
    );
  }

  try {
    // Fetch all data in parallel
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const youtube = await getYouTubeClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [videoResponse, commentThreadsResponse, userNotes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      youtube.videos.list({ part: ['snippet', 'statistics'], id: [videoId] }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      youtube.commentThreads.list({ part: ['snippet', 'replies'], videoId: videoId }),
      db.note.findMany({ where: { userId: session.user.id, videoId: videoId }, orderBy: { createdAt: 'desc' } })
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const video = videoResponse.data.items?.[0];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const comments = commentThreadsResponse.data.items ?? [];

    if (!video) {
      return <div>Error: Video not found. Check your YOUTUBE_VIDEO_ID.</div>;
    }

    return (
      <main className="container mx-auto grid grid-cols-1 gap-8 p-4 md:grid-cols-3 md:p-8">
        <div className="md:col-span-2">
          <AuthButtons />
          {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
          <VideoEditor video={video} />
          <CommentsSection 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            videoId={video.id as string} 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            comments={comments} 
          />
        </div>
        <div className="md:col-span-1">
          <NotesSection 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            videoId={video.id as string} 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            initialNotes={userNotes} 
          />
        </div>
      </main>
    );
  } catch (error) {
    console.error('Error loading dashboard:', error);
    return (
      <main className="container mx-auto p-8">
        <h1 className="text-2xl font-bold">Error</h1>
        <p>Failed to load dashboard. Please try again.</p>
        <AuthButtons />
      </main>
    );
  }
}