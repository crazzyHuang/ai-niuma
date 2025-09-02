'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';

export default function AdminPage() {
  return (
    <AuthLayout adminOnly>
      <AdminLayout />
    </AuthLayout>
  );
}
