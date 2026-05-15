// src/app/api/subscription/toggle-auto-renew/route.js
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
    let decodedToken;
    
    try {
      // Use the admin SDK for token verification
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log('Token verified successfully');
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ message: 'Invalid authentication token' }, { status: 401 });
    }
    
    const userId = decodedToken.uid;
    console.log('Authenticated user:', userId);

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('Request body:', requestBody);
    } catch (parseError) {
      console.error('Body parse error:', parseError);
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    
    const { subscriptionId, cancelAtPeriodEnd } = requestBody;
    
    if (!subscriptionId) {
      return NextResponse.json({ message: 'Subscription ID is required' }, { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    console.log(`Updating Stripe subscription: ${subscriptionId}, setting cancel_at_period_end to: ${cancelAtPeriodEnd}`);
    
    // Toggle auto-renew in Stripe by updating cancel_at_period_end
    try {
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });
      console.log('Stripe update successful:', updatedSubscription.id);
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json({ 
        message: `Stripe error: ${stripeError.message}` 
      }, { status: 500 });
    }

    // Update the user's plan data in Firestore using admin SDK
    try {
      const userPlanRef = adminDb.collection('userPlans').doc(userId);
      const userPlanDoc = await userPlanRef.get();
      
      if (!userPlanDoc.exists) {
        return NextResponse.json({ message: 'User plan not found' }, { status: 404 });
      }
      
      // Update the document using admin SDK
      await userPlanRef.update({
        'subscriptionId.cancel_at_period_end': cancelAtPeriodEnd,
      });
      console.log(`Firestore update successful for user ${userId}, cancel_at_period_end set to: ${cancelAtPeriodEnd}`);
    } catch (firestoreError) {
      console.error('Firestore error:', firestoreError);
      return NextResponse.json({ 
        message: `Database error: ${firestoreError.message}` 
      }, { status: 500 });
    }

    // Return a successful response
    return NextResponse.json({
      success: true,
      message: `Auto-renewal has been ${cancelAtPeriodEnd ? 'disabled' : 'enabled'}`,
      cancelAtPeriodEnd: cancelAtPeriodEnd
    });
  } catch (error) {
    console.error('Error in toggle-auto-renew API route:', error);
    return NextResponse.json(
      { message: error.message || 'An error occurred while updating subscription' },
      { status: 500 }
    );
  }
}