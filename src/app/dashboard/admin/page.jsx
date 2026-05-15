// src/app/dashboard/admin/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, AlertTriangle, User, Users, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        if (!currentUser) return;
        
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/admin/check-status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);
          
          if (!data.isAdmin) {
            router.push('/dashboard');
          } else {
            fetchUsers(token);
          }
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [currentUser, router]);

  const fetchUsers = async (token) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setFilteredUsers(data.users);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to load user data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.planName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Convert timestamp to Date object
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) 
      : new Date(timestamp);
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPlanStatus = (user) => {
    if (!user.subscriptionId) return 'Free';
    
    const isActive = user.subscriptionId.status === 'active';
    const cancelAtPeriodEnd = user.subscriptionId.cancel_at_period_end === true;
    
    if (!isActive) return 'Inactive';
    if (cancelAtPeriodEnd) return 'Cancelling';
    return 'Active';
  };

  const getPlanName = (user) => {
    // If planName is explicitly set, use it
    if (user.planName) return user.planName;
    
    // If no subscription, definitely free
    if (!user.subscriptionId) return 'Free';
    
    // If has subscription but no plan name, determine based on search limit
    if (user.searchLimit) {
      if (user.searchLimit === 1000) return 'Professional';
      if (user.searchLimit === 100) return 'Basic';
      // Add more conditions as needed
    }
    
    // If we can't determine, show Unknown
    return 'Unknown';
  };

  const handleCancelSubscription = async (userId) => {
    try {
      setActionLoading(true);
      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/admin/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          subscriptionId: selectedUser.subscriptionId.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      // Update user in the list
      setUsers(users.map(user => 
        user.uid === userId 
          ? { 
              ...user, 
              subscriptionId: { 
                ...user.subscriptionId, 
                cancel_at_period_end: true 
              } 
            } 
          : user
      ));
      
      setSelectedUser({
        ...selectedUser,
        subscriptionId: {
          ...selectedUser.subscriptionId,
          cancel_at_period_end: true
        }
      });
      
      toast.success("Subscription has been set to cancel at period end.");
      
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setActionLoading(false);
      setShowDialog(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setActionLoading(true);
      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      
      // Remove user from the list
      setUsers(users.filter(user => user.uid !== userId));
      setFilteredUsers(filteredUsers.filter(user => user.uid !== userId));
      
      toast.success("User has been successfully deleted.");
      
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || "Failed to delete user. Please try again.");
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
      setShowDialog(false);
    }
  };

  const canDeleteUser = (user) => {
    // Can delete if:
    // 1. User has no subscription, or
    // 2. User's subscription is not active, or
    // 3. User's subscription is set to cancel at period end
    return !user.subscriptionId || 
           user.subscriptionId.status !== 'active';
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You do not have admin privileges to view this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto pb-12 pt-28 px-4 md:pb-32 lg:pb-30 lg:pt-44">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users and subscriptions</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={async () => {
                    try {
                      setLoading(true);
                      // Properly await the token retrieval
                      const token = await currentUser.getIdToken();
                      await fetchUsers(token);
                    } catch (error) {
                      console.error("Error refreshing data:", error);
                      toast.error("Failed to load user data. Please try again.");
                    } finally {
                      setLoading(false);
                    }
                }}
              >
                Refresh Data
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="stats">
                <AlertTriangle className="h-4 w-4 mr-2" />
                System Stats
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    View and manage all user accounts and subscriptions
                  </CardDescription>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users by name or email"
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md *:rounded-md border">
                    <Table>
                      <TableHeader className="bg-gray-200">
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Searches</TableHead>
                          <TableHead>Next Invoice</TableHead>
                          <TableHead>Auto Renew</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              {searchQuery.trim() !== "" 
                                ? "No users matching your search criteria" 
                                : "No users found"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.uid}>
                              <TableCell>{user.displayName || 'N/A'}</TableCell>
                              <TableCell className="font-medium">{user.email}</TableCell>
                              <TableCell>{getPlanName(user)}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  getPlanStatus(user) === 'Active' ? 'default' :
                                  getPlanStatus(user) === 'Cancelling' ? 'warning' :
                                  'secondary'
                                }>
                                  {getPlanStatus(user)}
                                </Badge>
                              </TableCell>
                              <TableCell>{user.searchesUsed || 0} / {user.searchLimit || 0}</TableCell>
                              <TableCell>
                                {user.subscriptionId?.current_period_end 
                                  ? formatDate(user.subscriptionId.current_period_end)
                                  : 'N/A'}
                              </TableCell>
                              <TableCell>
                                {user.subscriptionId
                                  ? (user.subscriptionId.cancel_at_period_end ? 'No' : 'Yes')
                                  : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowDialog(true);
                                  }}
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stats">
              <Card>
                <CardHeader>
                  <CardTitle>System Statistics</CardTitle>
                  <CardDescription>
                    Overview of system usage and performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      title="Total Users"
                      value={users.length}
                      description="Registered accounts"
                    />
                    <StatCard
                      title="Paid Subscribers"
                      value={users.filter(user => 
                        user.subscriptionId && 
                        user.subscriptionId.status === 'active' && 
                        !user.subscriptionId.cancel_at_period_end
                      ).length}
                      description="Active subscriptions"
                    />
                    <StatCard
                      title="Cancelling"
                      value={users.filter(user => 
                        user.subscriptionId && 
                        user.subscriptionId.status === 'active' && 
                        user.subscriptionId.cancel_at_period_end
                      ).length}
                      description="Subscription ending"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {selectedUser && (
            <>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>User Details</DialogTitle>
                    <DialogDescription>
                      Manage user subscription and account details
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">User Information</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium">Email:</div>
                        <div>{selectedUser.email}</div>
                        <div className="font-medium">Name:</div>
                        <div>{selectedUser.displayName || 'N/A'}</div>
                        <div className="font-medium">User ID:</div>
                        <div className="truncate">{selectedUser.uid}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Subscription Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium">Plan:</div>
                        <div>{getPlanName(selectedUser)}</div>
                        <div className="font-medium">Status:</div>
                        <div>{getPlanStatus(selectedUser)}</div>
                        <div className="font-medium">Auto Renew:</div>
                        <div>
                          {selectedUser.subscriptionId
                            ? (selectedUser.subscriptionId.cancel_at_period_end ? 'No' : 'Yes')
                            : 'N/A'}
                        </div>
                        <div className="font-medium">Next Invoice:</div>
                        <div>
                          {selectedUser.subscriptionId?.current_period_end 
                            ? formatDate(selectedUser.subscriptionId.current_period_end)
                            : 'N/A'}
                        </div>
                        <div className="font-medium">Searches:</div>
                        <div>{selectedUser.searchesUsed || 0} / {selectedUser.searchLimit || 0}</div>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => handleCancelSubscription(selectedUser.uid)}
                      disabled={
                        actionLoading ||
                        !selectedUser.subscriptionId ||
                        selectedUser.subscriptionId.status !== 'active' ||
                        selectedUser.subscriptionId.cancel_at_period_end === true
                      }
                    >
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Cancel Subscription
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={
                        actionLoading ||
                        !canDeleteUser(selectedUser)
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </Button>
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the user account
                      and remove all associated data from our servers.
                      
                      {selectedUser.subscriptionId?.cancel_at_period_end && (
                        <div className="mt-2 p-2 bg-muted rounded-md">
                          <p className="font-medium">Note: This user has a subscription that will end on {formatDate(selectedUser.subscriptionId.current_period_end)}.</p>
                          <p>The user will be deleted immediately, cancelling their remaining subscription period.</p>
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDeleteUser(selectedUser.uid)}
                      disabled={actionLoading}
                    >
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function StatCard({ title, value, description }) {
  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6">
      <div className="flex flex-col space-y-1.5">
        <h3 className="font-semibold text-2xl">{value}</h3>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}