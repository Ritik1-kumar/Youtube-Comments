"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { PLANS, createCheckoutSession, checkSearchAvailability, manuallyUpdatePlan } from '@/lib/stripe';

export default function PricingPage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [userPlanInfo, setUserPlanInfo] = useState(null);
    const [isSubscribing, setIsSubscribing] = useState(false);

    const forceUpdatePlan = async () => {
        if (!currentUser) return;
        // Get the session_id from URL parameters if available
        const sessionId = searchParams.get('session_id');
        try {
          if (sessionId) {
            console.log('Forcing plan update with session ID:', sessionId);
            
            // Try to verify the payment through your API
            const response = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId }),
            });
            
            const data = await response.json();
            
            if (data.success) {
              console.log('Force update succeeded with API:', data.paymentDetails);
              toast.success(`Your plan has been updated to ${data.paymentDetails.planName}!`);
              fetchUserPlanInfo();
              return;
            }
          }
          
          // Fallback: Check if the URL indicates Basic or Pro plan
          const pathWithParams = window.location.href.toLowerCase();
          
          if (pathWithParams.includes('basic') || searchParams.get('plan') === 'basic') {
            console.log('Force updating to Basic plan based on URL');
            const result = await manuallyUpdatePlan(currentUser.uid, 'basic');
            if (result) {
              toast.success('Your plan has been updated to Basic!');
              fetchUserPlanInfo();
            }
          } else if (pathWithParams.includes('pro') || searchParams.get('plan') === 'pro') {
            console.log('Force updating to Pro plan based on URL');
            const result = await manuallyUpdatePlan(currentUser.uid, 'pro');
            if (result) {
              toast.success('Your plan has been updated to Pro!');
              fetchUserPlanInfo();
            }
          } else {
            // Assume Basic as default for successful payments without clear plan info
            console.log('No plan indication found, defaulting to Basic');
            const result = await manuallyUpdatePlan(currentUser.uid, 'basic');
            if (result) {
              toast.success('Your plan has been updated to Basic!');
              fetchUserPlanInfo();
            }
          }
        } catch (error) {
          console.error('Manual plan update failed:', error);
          toast.error('Failed to update your plan. Please contact support.');
        }
    };

    useEffect(() => {
        const success = searchParams.get('success');
        const canceled = searchParams.get('canceled');
        const sessionId = searchParams.get('session_id');
      
        console.log('URL params:', { success, canceled, sessionId });
      
        if (success === 'true' && sessionId) {
          // Verify the payment session
          const verifyPayment = async () => {
            setLoading(true);
            try {
              console.log('Verifying payment with session ID:', sessionId);
              
              const response = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId }),
              });
      
              const data = await response.json();
              console.log('Verification response:', data);
      
              if (data.success) {
                toast.success(`Payment successful! Your plan has been updated to ${data.paymentDetails.planName}.`);
                // Add an explicit delay before fetching updated plan info
                setTimeout(() => {
                  fetchUserPlanInfo();
                }, 1500);
              } else {
                console.error('Payment verification failed:', data.message);
                toast.error('Payment verification failed. Using fallback update.');
                // Fallback to manual update
                forceUpdatePlan();
              }
            } catch (error) {
              console.error('Error verifying payment:', error);
              toast.error('Error verifying payment. Using fallback update.');
              // Fallback to manual update
              forceUpdatePlan();
            } finally {
              setLoading(false);
            }
          };
      
          verifyPayment();
        } else if (success === 'true') {
          toast.success('Payment successful! Updating your plan...');
          setTimeout(() => {
            forceUpdatePlan();
          }, 1500);
        }
      
        if (canceled === 'true') {
          toast.error('Payment canceled. Your plan remains unchanged.');
        }
    }, [searchParams]);

  // Fetch user's current plan info
  const fetchUserPlanInfo = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
        const planInfo = await checkSearchAvailability(currentUser.uid);
        setUserPlanInfo(planInfo);
    } catch (error) {
        console.error('Error fetching user plan:', error);
        toast.error('Failed to load your subscription information');
    } finally {
        setLoading(false);
    }
};

useEffect(() => {
    fetchUserPlanInfo();
}, [currentUser]);

const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
};

const handleSubscribe = async () => {
    if (!currentUser) {
        toast.error('Please log in to subscribe');
        router.push('/login');
        return;
    }

    if (!selectedPlan) {
        toast.info('Please select a plan');
        return;
    }

    if (selectedPlan.id === 'free') {
        // Handle free plan selection
        try {
            const result = await manuallyUpdatePlan(currentUser.uid, 'free');
            if (result) {
                toast.success('You have successfully subscribed to the Free plan!');
                fetchUserPlanInfo();
            }
        } catch (error) {
            console.error('Error updating to Free plan:', error);
            toast.error('Failed to update to Free plan. Please try again.');
        }
        return;
    }

    setIsSubscribing(true);
    try {
        await createCheckoutSession(selectedPlan.id, currentUser.uid, currentUser.email);
        // The redirect to Stripe checkout will happen in the createCheckoutSession function
    } catch (error) {
        console.error('Subscription error:', error);
        toast.error('Failed to start subscription process. Please try again.');
    } finally {
        setIsSubscribing(false);
    }
};

// Determine the current plan of the user
const getCurrentPlanId = () => {
    if (!userPlanInfo || !userPlanInfo.plan) return 'free';

    // Get plan ID from userPlanInfo
    const planId = userPlanInfo.plan;

    // Match the plan ID with the known plans
    if (planId === PLANS.FREE.id) return PLANS.FREE.id;
    if (planId === PLANS.BASIC.id) return PLANS.BASIC.id;
    if (planId === PLANS.PRO.id) return PLANS.PRO.id;

    // If plan ID doesn't match any known plans, check if it contains the plan name
    if (planId.includes('1R1PmP')) return PLANS.FREE.id;
    if (planId.includes('1R1Pn0')) return PLANS.BASIC.id;
    if (planId.includes('1R1PnP')) return PLANS.PRO.id;

    return 'free'; // Default to free if no match
};

const currentPlanId = getCurrentPlanId();

return (
    <div className="container mx-auto pb-12 pt-12 px-4 md:pb-32 lg:pb-46 lg:pt-44" id='pricing'>
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Pricing Plans</h1>
                <p className="text-xl text-muted-foreground">
                    We’re working on flexible pricing options to fit every creator’s needs.
                </p>

                {/* Show current plan info if available */}
                {userPlanInfo && currentUser && (
                    <div className="mt-6 p-4 bg-primary/10 rounded-md inline-block">
                        <p className="font-medium">
                            Current Plan: <span className="font-bold">{
                                currentPlanId === PLANS.FREE.id ? 'Free' :
                                    currentPlanId === PLANS.BASIC.id ? 'Basic' :
                                        currentPlanId === PLANS.PRO.id ? 'Pro' : 'Unknown'
                            }</span>
                        </p>
                        <p className="text-sm mt-1">
                            {userPlanInfo.searchesUsed} / {userPlanInfo.searchLimit} searches used
                        </p>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Free Plan */}
                    <PricingCard
                        plan={PLANS.FREE}
                        features={[
                            '5 videos per month',
                            'Basic comments summaries',
                        ]}
                        isCurrentPlan={currentPlanId === PLANS.FREE.id}
                        isSelected={selectedPlan?.id === PLANS.FREE.id}
                        onSelect={() => handleSelectPlan(PLANS.FREE)}
                        disabled={currentPlanId === PLANS.PRO.id || currentPlanId === PLANS.BASIC.id}
                    />

                    {/* Basic Plan */}
                    <PricingCard
                        plan={PLANS.BASIC}
                        features={[
                            '10 videos per month',
                            'All Free features',
                            'Advanced AI analysis',
                        ]}
                        highlighted={true}
                        isCurrentPlan={currentPlanId === PLANS.BASIC.id}
                        isSelected={selectedPlan?.id === PLANS.BASIC.id}
                        onSelect={() => handleSelectPlan(PLANS.BASIC)}
                        disabled={currentPlanId === PLANS.PRO.id}
                    />

                    {/* Pro Plan */}
                    <PricingCard
                        plan={PLANS.PRO}
                        features={[
                            '100 videos per month',
                            'All Free features',
                            'Advanced AI analysis',
                            'Priority support',
                        ]}
                        isCurrentPlan={currentPlanId === PLANS.PRO.id}
                        isSelected={selectedPlan?.id === PLANS.PRO.id}
                        onSelect={() => handleSelectPlan(PLANS.PRO)}
                    />
                </div>
            )}

            {selectedPlan && (
                <div className="mt-12 text-center">
                    <Button
                        size="lg"
                        onClick={handleSubscribe}
                        disabled={isSubscribing || (selectedPlan.id === currentPlanId)}
                        className="w-full max-w-md"
                    >
                        {isSubscribing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : selectedPlan.id === currentPlanId ? (
                            'Current Plan'
                        ) : selectedPlan.id === 'free' ? (
                            'Continue with Free Plan'
                        ) : (
                            `Subscribe to ${selectedPlan.name} Plan - $${selectedPlan.price}/month`
                        )}
                    </Button>

                    {!currentUser && (
                        <p className="mt-4 text-sm text-red-500 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Please log in to subscribe to a plan
                        </p>
                    )}
                </div>
            )}
        </div>
    </div>
);
}

function PricingCard({ plan, features, highlighted = false, isCurrentPlan, isSelected, onSelect, disabled }) {
return (
    <Card
        className={`relative ${highlighted ? 'border-primary shadow-lg' : ''
            } ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {highlighted && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold py-1 px-3 rounded-full">
                Most Popular
            </div>
        )}

        {isCurrentPlan && (
            <div className="absolute top-2 right-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
            </div>
        )}

        <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.id === 'free' ? 'Get started for free' : plan.description}</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-3xl font-bold mb-6">
                ${plan.price}
                {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/month</span>}
            </p>

            <ul className="space-y-2">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
        </CardContent>
        <CardFooter>
            <Button
                variant={highlighted ? "default" : "outline"}
                className="w-full"
                onClick={onSelect}
                disabled={isCurrentPlan || disabled}
            >
                {isCurrentPlan ? 'Current Plan' : isSelected ? 'Selected' : 'Select Plan'}
            </Button>
        </CardFooter>
    </Card>
);
}