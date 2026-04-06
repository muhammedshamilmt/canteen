'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!email) {
        setError('Please enter your email address');
        toast.error('Please enter your email address');
        return;
      }

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError('No account found with this email address. Please check and try again.');
          toast.error('No account found with this email address');
        } else {
          setError(data.error || 'Failed to send verification code');
          toast.error(data.error || 'Failed to send verification code');
        }
        return;
      }

      if (data.success) {
        // Store email in localStorage to use in the next steps
        localStorage.setItem('resetEmail', email);
        
        toast.success(data.message || 'Verification code sent to your email');
        router.push('/verify-otp');
      } else {
        setError(data.error || 'Failed to send verification code');
        toast.error(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send verification code';
      setError(message);
      toast.error(message);
      console.error('Error sending code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Forgot Password</h1>
          <p className="text-gray-600">
            Enter your email and we'll send you a verification code
          </p>
        </div>
        
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>
              Enter your email address to receive a verification code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(''); // Clear error when user types
                    }}
                    required
                    className={`pl-10 ${error ? 'border-red-500' : ''}`}
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {error && (
                  <p className="text-sm text-red-500 mt-1">{error}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center">
            <p className="text-sm text-gray-500 mt-2">
              Remember your password?{' '}
              <a href="/login" className="text-canteen-blue hover:underline">
                Back to login
              </a>
            </p>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
