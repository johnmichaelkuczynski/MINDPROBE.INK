import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle, AlertCircle } from "lucide-react";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [verificationState, setVerificationState] = useState<'processing' | 'success' | 'failed' | 'error'>('processing');

  useEffect(() => {
    console.log('CheckoutSuccess mounted, user:', user?.username);
    
    if (!user) {
      console.log('No user, redirecting to auth');
      setLocation('/auth');
      return;
    }

    // Get payment_intent from URL params (Stripe adds this on redirect)
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get('payment_intent');
    console.log('Payment intent ID from URL:', paymentIntentId);

    if (paymentIntentId) {
      console.log('Verifying payment intent:', paymentIntentId);
      // Verify and process the payment on the backend
      apiRequest("POST", "/api/verify-payment", { paymentIntentId })
        .then((res) => {
          console.log('Verify payment response status:', res.status);
          return res.json();
        })
        .then((data) => {
          console.log('Verify payment response data:', data);
          if (data.success) {
            console.log('Payment verified successfully, credits added:', data.credits);
            // Refetch user data to get updated credits
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            // Also trigger a manual refetch
            queryClient.refetchQueries({ queryKey: ["/api/user"] });
            setVerificationState('success');
            toast({
              title: "Payment Successful!",
              description: `${data.credits} credits have been added to your account`,
            });
          } else {
            console.error('Payment verification failed:', data);
            setVerificationState('failed');
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support if you were charged",
              variant: "destructive",
            });
          }
        })
        .catch((error) => {
          console.error('Payment verification error:', error);
          setVerificationState('error');
          toast({
            title: "Verification Error",
            description: "Failed to verify payment. Please contact support.",
            variant: "destructive",
          });
        });
    } else {
      // No payment_intent in URL, shouldn't happen
      console.error('No payment_intent in URL');
      setVerificationState('error');
    }
  }, [user, setLocation, toast]);

  if (!user) {
    return null;
  }

  if (verificationState === 'processing') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <CardTitle className="text-center text-2xl">Processing Payment...</CardTitle>
            <CardDescription className="text-center">
              Please wait while we confirm your payment
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verificationState === 'failed') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Payment Failed</CardTitle>
            <CardDescription className="text-center">
              Your payment could not be processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                If you were charged, please contact support with your payment details.
              </p>
            </div>
            <Button 
              onClick={() => setLocation('/checkout')}
              className="w-full"
              data-testid="button-retry"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationState === 'error') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <AlertCircle className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Verification Error</CardTitle>
            <CardDescription className="text-center">
              We couldn't verify your payment status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please contact support to confirm your payment status. Your credits may have already been added.
              </p>
            </div>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
              data-testid="button-home"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-center">
            Your credits have been added to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You can now use your credits to run analyses. Your current balance will be displayed in your account.
            </p>
          </div>
          <Button 
            onClick={() => setLocation('/')}
            className="w-full"
            data-testid="button-continue"
          >
            Continue to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
