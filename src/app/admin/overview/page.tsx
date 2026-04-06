'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminOverview from '@/components/admin/OverviewPage';

export default function AdminOverviewPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || user.role !== 'admin') router.push('/login');
    else setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <AdminLayout>
      <AdminOverview />
    </AdminLayout>
  );
}
