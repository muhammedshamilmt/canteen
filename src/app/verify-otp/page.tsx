'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Shield } from 'lucide-react';
import Link from 'next/link';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const router = useRouter();

  useEffect(() => {
    // Get email from localStorage
    const storedEmail = localStorage.getItem('resetEmail');
    if (!storedEmail) {
      router.push('/forgot-password');
      toast.error('Please enter your email first');
      return;
    }
    setEmail(storedEmail);

    // Set up timer
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('Please enter the complete verification code');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Invalid verification code. Please try again.');
        setIsLoading(false);
        return;
      }
        toast.success('Verification successful');
        router.push('/update-password');
    } catch (error) {
      toast.error('Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    toast.success('New verification code sent');
    setTimeLeft(60);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            Enter the verification code sent to your email
          </p>
        </div>
        
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <div className="mx-auto bg-canteen-blue/10 p-3 rounded-full">
              <Shield className="h-6 w-6 text-canteen-blue" />
            </div>
            <CardTitle className="text-2xl font-bold text-center mt-2">Verification Code</CardTitle>
            <CardDescription className="text-center">
              We sent a code to {email ? email.substring(0, 3) + '...' + email.substring(email.indexOf('@')) : 'your email'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-2">
            <p className="text-sm text-gray-500">
              Didn't receive the code?
            </p>
            <Button 
              variant="ghost" 
              onClick={handleResendCode}
              disabled={timeLeft > 0}
              className="text-canteen-blue hover:text-canteen-blue/90 p-0 h-auto"
            >
              {timeLeft > 0 ? `Resend code in ${timeLeft}s` : 'Resend Code'}
            </Button>
            <a href="/forgot-password" className="text-sm text-gray-500 hover:underline mt-4">
              Use a different email
            </a>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default VerifyOTP;
