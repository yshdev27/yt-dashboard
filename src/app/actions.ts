'use server';

import { google } from 'googleapis';
import { revalidatePath } from 'next/cache';
import { auth } from '~/server/auth';
import { db } from '~/server/db';

// Helper function to get an authenticated YouTube API client
async function getYouTubeClient() {
  const session = await auth();
  console.log('Session check:', { 
    hasSession: !!session, 
    hasUser: !!session?.user, 
    hasAccessToken: !!session?.accessToken,
    userId: session?.user?.id 
  });
  
  if (!session?.user) {
    throw new Error('User not authenticated - please sign in with Google');
  }
  
  if (!session.accessToken) {
    throw new Error('No access token found - please sign out and sign in again to refresh your YouTube permissions');
  }

  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({ access_token: session.accessToken });

  console.log('YouTube client created with access token');

  return google.youtube({ version: 'v3', auth: authClient });
}

// Helper function for event logging
async function logEvent(action: string, details: object) {
  const session = await auth();
  if (!session?.user) return;

  await db.eventLog.create({
    data: {
      userId: session.user.id,
      action: action,
      details: details,
    },
  });
}

// --- Video Actions ---

export async function updateVideoDetails(videoId: string, newTitle: string, newDescription: string) {
  try {
    const youtube = await getYouTubeClient();

    const response = await youtube.videos.update({
      part: ['snippet'],
      requestBody: {
        id: videoId,
        snippet: {
          title: newTitle,
          description: newDescription,
          categoryId: '28', // Science & Technology. Change as needed.
        },
      },
    });

    await logEvent('VIDEO_DETAILS_UPDATED', { videoId, title: newTitle });
    revalidatePath('/'); // Refresh the page to show new details
    return response.data;
  } catch (error) {
    console.error('Error updating video details:', error);
    throw new Error('Failed to update video details');
  }
}

// --- Comment Actions ---

export async function postNewComment(videoId: string, text: string) {
  try {
    const youtube = await getYouTubeClient();

    // Attempt to post the comment directly
    await youtube.commentThreads.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          videoId: videoId,
          topLevelComment: {
            snippet: {
              textOriginal: text,
            },
          },
        },
      },
    });

    await logEvent('COMMENT_ADDED', { videoId });
    revalidatePath('/'); // Refresh the page to show the new comment
  } catch (error) {
    console.error('Error posting comment:', error);
    
    // Provide more specific error messages based on the actual API response
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
        throw new Error('Permission denied: You can only comment on your own videos or videos where you have permission');
      } else if (errorMessage.includes('quotaexceeded') || errorMessage.includes('quota')) {
        throw new Error('YouTube API quota exceeded. Please try again later');
      } else if (errorMessage.includes('commentsdisabled')) {
        throw new Error('Comments are disabled on this video');
      } else if (errorMessage.includes('badrequest') || errorMessage.includes('400')) {
        throw new Error('Invalid request: Check if the video exists and allows comments');
      } else {
        throw new Error(`Failed to post comment: ${error.message}`);
      }
    }
    
    throw new Error('Failed to post comment due to an unknown error');
  }
}

export async function deleteComment(commentId: string) {
  try {
    const youtube = await getYouTubeClient();

    await youtube.comments.delete({
      id: commentId,
    });

    await logEvent('COMMENT_DELETED', { commentId });
    revalidatePath('/'); // Refresh the page
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw new Error('Failed to delete comment');
  }
}

// --- Note Actions (Interacting with your own DB) ---

export async function createNote(videoId: string, content: string, tags: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  await db.note.create({
    data: {
      userId: session.user.id,
      videoId: videoId,
      content: content,
      tags: tags,
    },
  });

  await logEvent('NOTE_CREATED', { videoId });
  revalidatePath('/'); // Refresh the notes section
}

export async function deleteNote(noteId: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  // Security check: ensure the user owns the note before deleting
  const note = await db.note.findFirst({
    where: {
      id: noteId,
      userId: session.user.id,
    },
  });

  if (!note) {
    throw new Error('Note not found or you do not have permission to delete it.');
  }

  await db.note.delete({
    where: {
      id: noteId,
    },
  });

  await logEvent('NOTE_DELETED', { noteId });
  revalidatePath('/'); // Refresh the notes section
}