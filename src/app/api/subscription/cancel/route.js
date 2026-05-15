// src/app/api/subscription/cancel/route.js
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

    // Parse request body
    const { subscriptionId } = await request.json();
    
    if (!subscriptionId) {
      return NextResponse.json({ message: 'Subscription ID is required' }, { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Get subscription details to check current period end
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
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

    // Format next renewal date for message
    const periodEndDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return NextResponse.json({
      success: true,
      message: `Your subscription has been canceled. It will remain active until ${periodEndDate}.`,
      periodEndDate,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { message: error.message || 'An error occurred while canceling subscription' },
      { status: 500 }
    );
  }
}