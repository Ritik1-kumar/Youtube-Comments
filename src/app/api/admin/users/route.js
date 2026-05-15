// src/app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Verify admin status
    const adminRef = await adminDb.collection('admins').doc(userId).get();
    if (!adminRef.exists) {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all users
    const userPlansRef = adminDb.collection('userPlans');
    const userPlansSnapshot = await userPlansRef.get();
    
    const usersPromises = [];

    // Get admin IDs for filtering
    const adminsSnapshot = await adminDb.collection('admins').get();
    const adminIds = new Set();
    adminsSnapshot.forEach(doc => {
    adminIds.add(doc.id);
    });
    
    // Process each user plan
    userPlansSnapshot.forEach(doc => {
      const userData = doc.data();
      const uid = doc.id;
      
      // Skip if user is an admin
        if (adminIds.has(uid)) {
            return;
        }
      // Get user details from Firebase Auth
      const userPromise = adminAuth.getUser(uid)
        .then(userRecord => {
          return {
            uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            ...userData
          };
        })
        .catch(error => {
          console.error(`Error fetching user ${uid}:`, error);
          // Return basic info if user record can't be fetched
          return {
            uid,
            email: "Unknown",
            ...userData
          };
        });
      
      usersPromises.push(userPromise);
    });
    
    const usersData = await Promise.all(usersPromises);
    
    return NextResponse.json({
      users: usersData
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: error.message || 'An error occurred while fetching users' },
      { status: 500 }
    );
  }
}