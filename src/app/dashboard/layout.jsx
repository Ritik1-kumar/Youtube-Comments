// src/app/dashboard/layout.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout({ children }) {
  const { currentUser, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) return;
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/admin/check-status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);
          
          // Redirect admin to admin dashboard if they're on the regular dashboard
          if (data.isAdmin && pathname === '/dashboard') {
            router.push('/dashboard/admin');
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [currentUser, authLoading, pathname, router]);

  if (loading || authLoading) {
    return <div>Loading...</div>;
  }

  return children;
}