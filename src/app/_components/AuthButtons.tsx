
"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";

export function AuthButtons() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="mb-4 flex items-center gap-4">
        <p>Signed in as {session.user?.email}</p>
        <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
      </div>
    );
  }
  return <Button onClick={() => signIn("google")}>Sign in with Google</Button>;
}