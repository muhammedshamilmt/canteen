'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const LoginForm = () => {
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admissionNumber,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      toast.success('Login successful!');
      
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect based on role
      setTimeout(() => {
        if (data.user.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/userprofile');
        }
      }, 500);

    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Login failed. Please try again.');
      }
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
        <CardDescription className='text-center'>
          Enter your admission number and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admissionNumber">Admission Number</Label>
            <Input
              id="admissionNumber"
              placeholder="Enter your admission number"
              value={admissionNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdmissionNumber(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {/* <a href="/forgot-password" className="text-sm text-canteen-blue hover:underline">
                Forgot password?
              </a> */}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center">
        <p className="text-sm text-gray-500 mt-2">
          Don't have an account?{' '}
          <a href="/signup" className="text-canteen-blue hover:underline">
            Sign up
          </a>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
