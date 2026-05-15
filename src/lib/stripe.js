// src/lib/stripe.js
import { loadStripe } from '@stripe/stripe-js';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
// import { toast } from 'sonner';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Constants for the subscription plans
export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    searchLimit: 5,
    id: 'price_1R1PmPE8ZRUXcvaUTGIabL4k', // This should match your Stripe price ID
    description: '5 searches included'
  },
  BASIC: {
    name: 'Basic',
    price: 10,
    searchLimit: 100,
    id: 'price_1R1Pn0E8ZRUXcvaUN5frxwpt', // This should match your Stripe price ID
    description: '100 searches included'
  },
  PRO: {
    name: 'Pro',
    price: 50,
    searchLimit: 1000,
    id: 'price_1R1PnPE8ZRUXcvaU90jXxoxE', // This should match your Stripe price ID
    description: '1000 searches included'
  }
};

// Initialize a user's plan to Free when they sign up
export const initializeUserPlan = async (userId) => {
  const userPlanRef = doc(db, 'userPlans', userId);
  
  try {
    const userPlanDoc = await getDoc(userPlanRef);
    
    if (!userPlanDoc.exists()) {
      // Set default plan data
      await setDoc(userPlanRef, {
        plan: PLANS.FREE.id,
        searchesUsed: 0,
        searchLimit: PLANS.FREE.searchLimit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    console.error('Error initializing user plan:', error);
    return false;
  }
};

// Check if the user has searches remaining and also refresh plan data from Stripe if needed
export const checkSearchAvailability = async (userId) => {
  if (!userId) return { available: false, message: 'User not authenticated' };
  
  try {
    const userPlanRef = doc(db, 'userPlans', userId);
    const userPlanDoc = await getDoc(userPlanRef);
    
    if (!userPlanDoc.exists()) {
      await initializeUserPlan(userId);
      return { 
        available: true, 
        remaining: PLANS.FREE.searchLimit,
        plan: PLANS.FREE.id,
        searchesUsed: 0,
        searchLimit: PLANS.FREE.searchLimit
      };
    }
    
    const userData = userPlanDoc.data();
    
    // Add a plan detection fallback for cases where the plan ID doesn't exactly match
    let planId = userData.plan;
    let searchLimit = userData.searchLimit;
    
    // Check if the plan needs to be corrected based on the price ID pattern
    if (planId.includes('1R1PmP')) {
        planId = PLANS.FREE.id;
        searchLimit = PLANS.FREE.searchLimit;
    } else if (planId.includes('1R1Pn0')) {
        planId = PLANS.BASIC.id;
        searchLimit = PLANS.BASIC.searchLimit;
    } else if (planId.includes('1R1PnP')) {
        planId = PLANS.PRO.id;
        searchLimit = PLANS.PRO.searchLimit;
    }
    
    // Update the plan if it was corrected
    if (planId !== userData.plan || searchLimit !== userData.searchLimit) {
      await updateDoc(userPlanRef, {
        plan: planId,
        searchLimit: searchLimit,
        updatedAt: serverTimestamp()
      });
      
      // Update local userData for the return value
      userData.plan = planId;
      userData.searchLimit = searchLimit;
    }
    
    const remaining = userData.searchLimit - userData.searchesUsed;
    
    return { 
      available: remaining > 0, 
      remaining,
      plan: userData.plan,
      searchesUsed: userData.searchesUsed,
      searchLimit: userData.searchLimit
    };
  } catch (error) {
    console.error('Error checking search availability:', error);
    return { available: false, message: 'Error checking search availability' };
  }
};

// Increment the searches used count
export const incrementSearchCount = async (userId) => {
  if (!userId) return false;
  console.log('User ID:', userId);
  try {
    const userPlanRef = doc(db, 'userPlans', userId);
    const userPlanDoc = await getDoc(userPlanRef);
    
    if (!userPlanDoc.exists()) {
      await initializeUserPlan(userId);
      await updateDoc(userPlanRef, {
        searchesUsed: 1,
        updatedAt: serverTimestamp()
      });
      return true;
    }
    
    const userData = userPlanDoc.data();
    
    // Only increment if below limit
    if (userData.searchesUsed < userData.searchLimit) {
      await updateDoc(userPlanRef, {
        searchesUsed: userData.searchesUsed + 1,
        updatedAt: serverTimestamp()
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error incrementing search count:', error);
    return false;
  }
};

// Create a checkout session for a plan
export const createCheckoutSession = async (priceId, userId, userEmail) => {
    if (!userId) throw new Error('User not authenticated');
    console.log(userEmail);
    try {
      // Call the API route to create a checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, userId, userEmail }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Checkout session error details:', errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const data = await response.json();
      
      if (!data.sessionId) {
        throw new Error('Failed to create checkout session');
      }
      
      // Redirect to checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });
      
      if (error) {
        console.error('Redirect error:', error);
        throw new Error(error.message);
      }
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  };

// Manual function to force update a user's plan (can be used as a fallback)
export const manuallyUpdatePlan = async (userId, planType) => {
  if (!userId) return false;
  
  try {
    const userPlanRef = doc(db, 'userPlans', userId);
    
    let planDetails;
    if (planType === 'basic') {
      planDetails = PLANS.BASIC;
    } else if (planType === 'pro') {
      planDetails = PLANS.PRO;
    } else {
      planDetails = PLANS.FREE;
    }
    
    await setDoc(userPlanRef, {
      plan: planDetails.id,
      searchLimit: planDetails.searchLimit,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return true;
  } catch (error) {
    console.error('Error manually updating user plan:', error);
    return false;
  }
};

const stripeUtils = {
  stripePromise,
  PLANS,
  initializeUserPlan,
  checkSearchAvailability,
  incrementSearchCount,
  createCheckoutSession,
  manuallyUpdatePlan
};

export default stripeUtils;