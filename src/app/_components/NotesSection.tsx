"use client";

import { useState } from "react";
import type { Note } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { createNote, deleteNote } from "../actions"; // Server actions

interface Props {
  videoId: string;
  initialNotes: Note[];
}

export function NotesSection({ videoId, initialNotes }: Props) {
  const [newNote, setNewNote] = useState("");
  // We can manage the notes state here to give instant feedback
  // but for simplicity, we'll rely on the page refresh from revalidatePath
  
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await createNote(videoId, newNote, []); // Tags feature can be added here
      setNewNote("");
    } catch (error) {
      console.error('Failed to add note:', error);
      alert("Failed to add note.");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert("Failed to delete note.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Private Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddNote} className="mb-4 space-y-2">
          <Textarea
            placeholder="Jot down ideas for improving the video..."
            value={newNote}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
          />
          <Button type="submit">Add Note</Button>
        </form>
        <div className="space-y-2">
          {initialNotes.map((note) => (
            <div key={note.id} className="flex justify-between items-start rounded-md border p-2">
              <p className="text-sm">{note.content}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => void handleDeleteNote(note.id)}
              >
                &times;
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}