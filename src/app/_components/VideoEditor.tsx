"use client";

import { useState } from "react";
import type { youtube_v3 } from "googleapis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { updateVideoDetails } from "../actions"; // Our server action!

interface Props {
  video: youtube_v3.Schema$Video;
}

export function VideoEditor({ video }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const [title, setTitle] = useState((video.snippet?.title ?? "") as string);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const [description, setDescription] = useState((video.snippet?.description ?? "") as string);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!video.id) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await updateVideoDetails(video.id as string, title, description);
      alert("Video updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to update video.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Video Details</CardTitle>
        <CardDescription>
          {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
          Views: {video.statistics?.viewCount} | Likes: {video.statistics?.likeCount}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={8}
            />
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}