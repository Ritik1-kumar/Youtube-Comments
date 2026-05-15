// filepath: src/lib/saveSubscriptionData.ts
import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});


export async function saveSubscriptionData(userId: string, subscriptionId: string) {
  try {
    // Retrieve subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Extract the next scheduled subscription date and invoice history
    const nextScheduledDate = subscription.current_period_end;
    const invoices = await stripe.invoices.list({ customer: subscription.customer as string });

    // Save data in Firestore
    const userPlanRef = db.collection('userPlans').doc(userId);
    await userPlanRef.set(
      {
        nextScheduledDate: new Date(nextScheduledDate * 1000),
        invoiceHistory: invoices.data.map((invoice) => ({
          id: invoice.id,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          created: new Date(invoice.created * 1000),
        })),
      },
      { merge: true }
    );

    console.log('Subscription data saved successfully.');
  } catch (error) {
    console.error('Error saving subscription data:', error);
  }
}