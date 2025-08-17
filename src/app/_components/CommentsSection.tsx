
"use client";

import { useState } from "react";
import Image from "next/image";
import type { youtube_v3 } from "googleapis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { postNewComment, deleteComment } from "../actions"; // Our server actions!

interface Props {
  videoId: string;
  comments: youtube_v3.Schema$CommentThread[];
}

export function CommentsSection({ videoId, comments }: Props) {
  const [newComment, setNewComment] = useState("");

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await postNewComment(videoId, newComment);
      setNewComment(""); // Clear the textarea on success
    } catch (error) {
      console.error(error);
      alert("Failed to post comment. Make sure you've granted the correct permissions.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert("Failed to delete comment.");
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Comments</CardTitle>
        <CardDescription>View and reply to comments on your video.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Form for posting a new comment */}
        <form onSubmit={handlePostComment} className="mb-6 space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
          />
          <Button type="submit">Post Comment</Button>
        </form>

        {/* List of existing comments */}
        <div className="space-y-4">
          {comments.map((commentThread) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const topLevelComment = commentThread.snippet?.topLevelComment;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (!topLevelComment?.id || !topLevelComment.snippet) return null;
            
            return (
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              <div key={topLevelComment.id} className="flex items-start gap-3">
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
                  {topLevelComment.snippet.authorProfileImageUrl ? (
                    <Image
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                      src={topLevelComment.snippet.authorProfileImageUrl}
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                      alt={topLevelComment.snippet.authorDisplayName ?? 'author'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-xs text-gray-500">
                      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */}
                      {(topLevelComment.snippet.authorDisplayName ?? 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
                      {topLevelComment.snippet.authorDisplayName}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                        const commentId = topLevelComment.id;
                        if (commentId) {
                          void handleDeleteComment(commentId as string);
                        }
                      }}
                    >
                     Delete
                    </Button>
                  </div>
                  {/* The YouTube API provides comment text as HTML */}
                  <div
                    className="prose prose-sm dark:prose-invert"
                    dangerouslySetInnerHTML={{ 
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                      __html: topLevelComment.snippet.textDisplay ?? '' 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}