// src/app/api/subscription/sync-status/route.js
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
    const userId = decodedToken.uid;

    // Get the user's subscription data
    const userPlanRef = adminDb.collection('userPlans').doc(userId);
    const userPlanDoc = await userPlanRef.get();
    
    if (!userPlanDoc.exists) {
      return NextResponse.json({ message: 'User plan not found' }, { status: 404 });
    }
    
    const userData = userPlanDoc.data();
    const subscriptionId = userData.subscriptionId?.id;
    
    if (!subscriptionId) {
      return NextResponse.json({ message: 'No active subscription' }, { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Get current subscription data from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Check if subscription has expired
    const isExpired = subscription.cancel_at_period_end && 
                      subscription.current_period_end < Math.floor(Date.now() / 1000);
    
    // Update status in Firestore if expired
    if (isExpired && userData.subscriptionId.status === 'active') {
      await userPlanRef.update({
        'subscriptionId.status': 'expired',
      });
      
      return NextResponse.json({
        success: true,
        message: 'Subscription status updated to expired',
        status: 'expired'
      });
    }
    
    // If not expired, make sure Firestore has the latest status from Stripe
    if (userData.subscriptionId.status !== subscription.status) {
      await userPlanRef.update({
        'subscriptionId.status': subscription.status,
      });
      
      return NextResponse.json({
        success: true,
        message: 'Subscription status synchronized with Stripe',
        status: subscription.status
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription status is current',
      status: userData.subscriptionId.status
    });
  } catch (error) {
    console.error('Error syncing subscription status:', error);
    return NextResponse.json(
      { message: error.message || 'An error occurred while syncing subscription status' },
      { status: 500 }
    );
  }
}