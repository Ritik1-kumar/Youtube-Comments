// src/app/api/admin/delete-user/route.js
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminId = decodedToken.uid;

    // Verify admin status
    const adminRef = await adminDb.collection('admins').doc(adminId).get();
    if (!adminRef.exists) {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request body
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    // Get user data to check if they have an active subscription
    const userPlanRef = adminDb.collection('userPlans').doc(userId);
    const userPlanDoc = await userPlanRef.get();
    
    if (!userPlanDoc.exists) {
      return NextResponse.json({ message: 'User plan not found' }, { status: 404 });
    }
    
    const userData = userPlanDoc.data();
    
    // Prevent deletion of users with active subscriptions, regardless of whether they're set to cancel
    if (
      userData.subscriptionId && 
      userData.subscriptionId.status === 'active'
    ) {
      return NextResponse.json(
        { message: 'Cannot delete user with active subscription, even if set to cancel. Wait until subscription ends.' }, 
        { status: 400 }
      );
    }

    // Delete user data from Firestore (all collections where user data might be stored)
    const batch = adminDb.batch();
    
    // Delete from userPlans collection
    batch.delete(userPlanRef);
    
    // Delete from any other collections that might contain user data
    // Example: Delete user's saved searches if applicable
    const userSearchesRef = adminDb.collection('userSearches').doc(userId);
    batch.delete(userSearchesRef);
    
    // Commit the batch delete operation
    await batch.commit();
    
    // Delete user from Firebase Authentication
    await adminAuth.deleteUser(userId);

    // Log the admin action
    await adminDb.collection('adminLogs').add({
      adminId,
      action: 'delete_user',
      userId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'User and associated data successfully deleted'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { message: error.message || 'An error occurred while deleting user' },
      { status: 500 }
    );
  }
}