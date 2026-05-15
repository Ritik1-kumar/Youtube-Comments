// src/app/api/admin/cancel-subscription/route.js
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import Stripe from 'stripe';

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
    const { userId, subscriptionId } = await request.json();
    
    if (!userId || !subscriptionId) {
      return NextResponse.json({ message: 'User ID and Subscription ID are required' }, { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Cancel subscription at period end (won't cancel immediately)
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update the user's plan data in Firestore
    const userPlanRef = adminDb.collection('userPlans').doc(userId);
    await userPlanRef.update({
      'subscriptionId.cancel_at_period_end': true,
      // Keep status as "active" until the period ends
      'subscriptionId.status': 'active',
    });

    // Log the admin action
    await adminDb.collection('adminLogs').add({
      adminId,
      action: 'cancel_subscription',
      userId,
      subscriptionId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription has been set to cancel at period end'
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { message: error.message || 'An error occurred while canceling subscription' },
      { status: 500 }
    );
  }
}