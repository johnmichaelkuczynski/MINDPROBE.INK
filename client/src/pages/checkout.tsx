import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, ArrowLeft } from "lucide-react";

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log('Stripe key exists:', !!STRIPE_KEY);

if (!STRIPE_KEY) {
  console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable');
}

const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const CheckoutForm = ({ credits }: { credits: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error('Stripe or elements not initialized');
      return;
    }

    setIsProcessing(true);
    console.log('Confirming payment...');

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/checkout-success',
        },
      });

      setIsProcessing(false);

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Unexpected payment error:', err);
      setIsProcessing(false);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred during payment",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        data-testid="button-submit-payment"
      >
        {isProcessing ? "Processing..." : `Pay $${credits}.00`}
      </Button>
    </form>
  );
};

const PRICING_OPTIONS = [
  { 
    price: 5, 
    credits: 5,
    popular: false,
    words: {
      zhi1: '4,275,000',
      zhi2: '106,840',
      zhi3: '702,000',
      zhi4: '6,410,255'
    }
  },
  { 
    price: 10, 
    credits: 10,
    popular: true,
    words: {
      zhi1: '8,977,500',
      zhi2: '224,360',
      zhi3: '1,474,200',
      zhi4: '13,461,530'
    }
  },
  { 
    price: 25, 
    credits: 25,
    popular: false,
    words: {
      zhi1: '23,512,500',
      zhi2: '587,625',
      zhi3: '3,861,000',
      zhi4: '35,256,400'
    }
  },
  { 
    price: 50, 
    credits: 50,
    popular: false,
    words: {
      zhi1: '51,300,000',
      zhi2: '1,282,100',
      zhi3: '8,424,000',
      zhi4: '76,923,050'
    }
  },
  { 
    price: 100, 
    credits: 100,
    popular: false,
    words: {
      zhi1: '115,425,000',
      zhi2: '2,883,400',
      zhi3: '18,954,000',
      zhi4: '173,176,900'
    }
  },
];

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedCredits, setSelectedCredits] = useState<number | null>(null);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    console.log('Checkout useEffect - user:', user?.username, 'authenticated:', !!user);
    
    if (!user) {
      console.log('No user, redirecting to auth');
      toast({
        title: "Authentication required",
        description: "Please log in to purchase credits",
        variant: "destructive",
      });
      setLocation('/auth');
      return;
    }

    // Get credits from URL params if available
    const params = new URLSearchParams(window.location.search);
    const creditAmount = parseInt(params.get('credits') || '0');
    if (creditAmount > 0) {
      setSelectedCredits(creditAmount);
    }
  }, [user, setLocation, toast]);

  const handleSelectPackage = async (credits: number) => {
    if (!user) {
      console.error('No user found');
      return;
    }
    
    console.log('=== HANDLE SELECT PACKAGE ===');
    console.log('User:', user.username, 'Credits to buy:', credits);
    setSelectedCredits(credits);

    try {
      // Create PaymentIntent with timeout
      console.log('Calling /api/create-payment-intent with credits:', credits);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits }),
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Payment intent response status:', res.status, 'ok:', res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          throw new Error(`Server error: ${res.status} - ${errorText}`);
        }
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Payment intent data received:', data);
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        console.log('Client secret set successfully!');
      } else {
        console.error('No client secret in response:', data);
        throw new Error('No client secret received from server');
      }
    } catch (error: any) {
      console.error('=== PAYMENT INITIALIZATION ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      setSelectedCredits(null);
      setClientSecret("");
      
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return null;
  }

  if (!STRIPE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Payment Configuration Error</CardTitle>
            <CardDescription className="text-red-600">
              Stripe is not configured properly. Please contact support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Error: Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/')}
              className="mt-4 w-full"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show pricing selection if no package selected yet
  if (!selectedCredits || !clientSecret) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mb-6"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Credits</h1>
            <p className="text-gray-600">Select a credit package to get started with your analyses</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {PRICING_OPTIONS.map((option) => (
              <Card 
                key={option.price}
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  option.popular ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleSelectPackage(option.credits)}
                data-testid={`package-${option.price}`}
              >
                {option.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <div className="mb-2">
                    <span className="text-4xl font-bold">${option.price}</span>
                  </div>
                  <CardTitle className="text-lg">
                    {option.price === 5 && "Starter"}
                    {option.price === 10 && "Basic"}
                    {option.price === 25 && "Pro"}
                    {option.price === 50 && "Premium"}
                    {option.price === 100 && "Enterprise"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b">
                      <span className="text-gray-600">ZHI 1:</span>
                      <span className="font-semibold">{option.words.zhi1}w</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b">
                      <span className="text-gray-600">ZHI 2:</span>
                      <span className="font-semibold">{option.words.zhi2}w</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b">
                      <span className="text-gray-600">ZHI 3:</span>
                      <span className="font-semibold">{option.words.zhi3}w</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-600">ZHI 4:</span>
                      <span className="font-semibold">{option.words.zhi4}w</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    variant={option.popular ? "default" : "outline"}
                    disabled={selectedCredits === option.credits && !clientSecret}
                  >
                    {selectedCredits === option.credits && !clientSecret ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Select'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">How does pricing work?</h3>
                    <p className="text-sm text-gray-600">
                      Your package determines how many words you can process with each ZHI model. 
                      The more you spend, the better value you get per word. Credits never expire.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">ZHI Models:</p>
                    <ul className="space-y-1 text-gray-600">
                      <li><strong>ZHI 1:</strong> Primary analysis engine</li>
                      <li><strong>ZHI 2:</strong> Advanced reasoning</li>
                      <li><strong>ZHI 3:</strong> Specialized profiling</li>
                      <li><strong>ZHI 4:</strong> Research-focused</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">Best Value:</p>
                    <p className="text-gray-600">
                      The <strong>$100 Enterprise</strong> package gives you the best value per word across all ZHI models. 
                      Perfect for power users who run frequent analyses.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show payment form when package is selected
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => {
            setSelectedCredits(null);
            setClientSecret("");
          }}
          className="mb-6"
          data-testid="button-back-to-pricing"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pricing
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-6 w-6 text-primary" />
              <CardTitle>Complete Your Purchase</CardTitle>
            </div>
            <CardDescription>
              You're purchasing {selectedCredits} credits for ${selectedCredits}.00
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise!} options={{ clientSecret }}>
              <CheckoutForm credits={selectedCredits} />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
