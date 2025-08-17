
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
  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({ access_token: session.accessToken });
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
    const youtube = await getYouTubeClient();
    const [videoResponse, commentThreadsResponse, userNotes] = await Promise.all([
      youtube.videos.list({ part: ['snippet', 'statistics'], id: [videoId] }),
      youtube.commentThreads.list({ part: ['snippet', 'replies'], videoId: videoId }),
      db.note.findMany({ where: { userId: session.user.id, videoId: videoId }, orderBy: { createdAt: 'desc' } })
    ]);

    const video = videoResponse.data.items?.[0];
    const comments = commentThreadsResponse.data.items ?? [];

    if (!video) {
      return <div>Error: Video not found. Check your YOUTUBE_VIDEO_ID.</div>;
    }

    return (
      <main className="container mx-auto grid grid-cols-1 gap-8 p-4 md:grid-cols-3 md:p-8">
        <div className="md:col-span-2">
          <AuthButtons />
          <VideoEditor video={video} />
          <CommentsSection 
            videoId={video.id!} 
            comments={comments} 
          />
        </div>
        <div className="md:col-span-1">
          <NotesSection 
            videoId={video.id!} 
            initialNotes={userNotes} 
          />
        </div>
      </main>
    );
  } catch (error) {
    console.error('Error loading dashboard:', error);
    
    // Check if it's an authentication error
    const isAuthError = error instanceof Error && (
      error.message.includes('authentication') ||
      error.message.includes('access token') ||
      error.message.includes('OAuth') ||
      error.message.includes('401')
    );
    
    if (isAuthError) {
      return (
        <main className="container mx-auto p-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-yellow-800 mb-4">Authentication Required</h1>
            <p className="text-yellow-700 mb-4">
              Your YouTube access token has expired or is invalid. Please sign out and sign in again to refresh your permissions.
            </p>
            <div className="bg-white p-4 rounded border">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Steps to fix this:</strong>
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Click &quot;Sign Out&quot; below</li>
                <li>Sign in again with your Google account</li>
                <li>Grant YouTube permissions when prompted</li>
                <li>The dashboard will load automatically</li>
              </ol>
            </div>
            <div className="mt-4">
              <AuthButtons />
            </div>
          </div>
        </main>
      );
    }
    
    return (
      <main className="container mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Error Loading Dashboard</h1>
          <p className="text-red-700 mb-4">
            Failed to load dashboard. This might be due to API limits, network issues, or video permissions.
          </p>
          <div className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Error details:</strong>
            </p>
            <pre className="text-xs text-gray-500 overflow-auto">
              {error instanceof Error ? error.message : 'Unknown error'}
            </pre>
          </div>
          <div className="mt-4">
            <AuthButtons />
          </div>
        </div>
      </main>
    );
  }
}