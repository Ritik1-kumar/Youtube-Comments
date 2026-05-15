// src/app/api/webhooks/stripe/route.js
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { PLANS } from '@/lib/stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(`Webhook Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleCheckoutSessionCompleted(session);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await handleSubscriptionChange(subscription);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(session) {
    const userId = session.metadata?.userId || session.client_reference_id;
    if (!userId) {
      console.error('No user ID found in webhook session');
      return;
    }
  
    try {
      console.log(`Processing webhook for user ${userId}, session ${session.id}`);
      
      // Get subscription details
      const subscriptionId = session.subscription;
      if (!subscriptionId) {
        console.error('No subscription ID found in session');
        return;
      }
  
      // Get detailed subscription information
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price']
      });
      
      // Get the price ID
      let priceId = '';
      if (subscription.items.data && subscription.items.data.length > 0) {
        priceId = subscription.items.data[0].price.id;
        console.log('Webhook detected price ID:', priceId);
      }
  
      // Determine which plan was purchased with exact matching
      let planDetails;
      if (priceId === PLANS.BASIC.id) {
        console.log('Webhook: Basic plan detected');
        planDetails = PLANS.BASIC;
      } else if (priceId === PLANS.PRO.id) {
        console.log('Webhook: Pro plan detected');
        planDetails = PLANS.PRO;
      } else {
        // Fallback to substring matching
        if (priceId.includes('1R1Pn0')) {
          console.log('Webhook: Basic plan detected by substring');
          planDetails = PLANS.BASIC;
        } else if (priceId.includes('1R1PnP')) {
          console.log('Webhook: Pro plan detected by substring');
          planDetails = PLANS.PRO;
        } else {
          console.log('Webhook: No plan match, defaulting to Free');
          planDetails = PLANS.FREE;
        }
      }
  
      console.log(`Webhook updating user ${userId} to plan:`, planDetails.name);
  
      // Update the user's plan in Firestore
      const userPlanRef = doc(db, 'userPlans', userId);
      await setDoc(userPlanRef, {
        plan: planDetails.id,
        searchLimit: planDetails.searchLimit,
        subscriptionId: subscriptionId,
        searchesUsed: 0, // Reset search count for new plan
        updatedAt: serverTimestamp()
      }, { merge: true });
  
      console.log(`Webhook updated plan for user ${userId} to ${planDetails.name}`);
    } catch (error) {
      console.error('Error handling checkout session completed:', error);
    }
}

async function handleSubscriptionChange(subscription) {
  try {
    // Find the user with this subscription ID
    const userPlanRef = doc(db, 'userPlans', subscription.id);
    const userPlanDoc = await getDoc(userPlanRef);
    
    if (!userPlanDoc.exists()) {
      console.log('No user found with this subscription ID');
      return;
    }
    
    const userId = userPlanDoc.id;
    const priceId = subscription.items.data[0].price.id;
    
    // Determine which plan based on price ID
    let planDetails;
    if (priceId === PLANS.BASIC.id || priceId.includes('1R1Pn0')) {
      planDetails = PLANS.BASIC;
    } else if (priceId === PLANS.PRO.id || priceId.includes('1R1PnP')) {
      planDetails = PLANS.PRO;
    } else {
      planDetails = PLANS.FREE;
    }
    
    // Update the user's plan in Firestore
    await setDoc(userPlanRef, {
      plan: planDetails.id,
      searchLimit: planDetails.searchLimit,
      subscriptionStatus: subscription.status,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log(`Updated subscription status for user ${userId} to ${subscription.status}`);
  } catch (error) {
    console.error('Error handling subscription change:', error);
  }
}