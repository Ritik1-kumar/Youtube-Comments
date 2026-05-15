// src/app/profile/page.jsx
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <UserProfileCard />
        </div>
      </div>
    </ProtectedRoute>
  );
}

function UserProfileCard() {
  const { currentUser, updateUserProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setError("");
      setSuccess("");
      setLoading(true);
      
      await updateUserProfile(currentUser, { displayName });
      setSuccess("Profile updated successfully!");
      toast.success("Profile updated");
    } catch (error) {
      setError("Failed to update profile: " + error.message);
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!displayName) return "U";
    return displayName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card className="mt-10 md:mb-32 lg:mb-35 lg:mt-46">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={currentUser?.photoURL || ""} />
            <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{displayName || "User"}</CardTitle>
            <CardDescription>{currentUser?.email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={currentUser?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">Email cannot be changed</p>
          </div>
          
          <div className="flex justify-between pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Profile"}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}