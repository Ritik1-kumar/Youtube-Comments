// src/components/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Header() {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  return (
    <header className="border-b">
      <div className="container mx-auto py-4 px-4 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-xl font-bold">YT Comments Analyzer</h1>
        </Link>
        <nav>
          {currentUser ? (
            <div className="flex gap-4">
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline">Profile</Button>
              </Link>
              <Button variant="destructive" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex gap-4">
              <Link href="/login">
                <Button variant="outline">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign up</Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}