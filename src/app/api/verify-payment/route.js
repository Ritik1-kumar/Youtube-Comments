// src/app/api/verify-payment/route.js
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { PLANS } from '@/lib/stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    console.log('Verifying payment session:', sessionId);

    // Retrieve the checkout session with expanded line items
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price', 'subscription']
    });

    console.log('Session status:', session.status);
    console.log('Payment status:', session.payment_status);

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ 
        success: false,
        message: 'Payment not completed'
      }, { status: 400 });
    }

    // Get the user ID from the session metadata
    const userId = session.metadata?.userId || session.client_reference_id;
    
    if (!userId) {
      console.error('No user ID found in session');
      return NextResponse.json({ 
        success: false,
        message: 'User ID not found in session'
      }, { status: 400 });
    }

    // Get the price ID directly from the line items
    const lineItems = session.line_items?.data;
    console.log('Line items:', JSON.stringify(lineItems, null, 2));

    let priceId = '';
    if (lineItems && lineItems.length > 0) {
      priceId = lineItems[0].price?.id;
    } else if (session.subscription) {
      // Fallback to subscription data
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const subItems = subscription.items.data;
      if (subItems && subItems.length > 0) {
        priceId = subItems[0].price.id;
      }
    }

    console.log('Detected price ID:', priceId);

    // Determine which plan was purchased using exact ID matching
    let planDetails;
    if (priceId === PLANS.BASIC.id) {
      console.log('Basic plan detected');
      planDetails = PLANS.BASIC;
    } else if (priceId === PLANS.PRO.id) {
      console.log('Pro plan detected');
      planDetails = PLANS.PRO;
    } else {
        console.log('No plan match, defaulting to Free');
        planDetails = PLANS.FREE;
    }

    console.log(`Updating user ${userId} to plan:`, planDetails.name);

    // Update the user's plan in Firestore
    const userPlanRef = doc(db, 'userPlans', userId);
    await setDoc(userPlanRef, {
      plan: planDetails.id,
      searchLimit: planDetails.searchLimit,
      subscriptionId: session.subscription,
      searchesUsed: 0, // Reset search count for new plan
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Return success with payment details
    return NextResponse.json({
      success: true,
      paymentDetails: {
        plan: planDetails.id,
        planName: planDetails.name,
        searchLimit: planDetails.searchLimit,
        subscriptionId: session.subscription,
        paymentId: session.payment_intent
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ 
      success: false,
      message: error.message
    }, { status: 500 });
  }
}