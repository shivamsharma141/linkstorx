import { requireAuth } from '@/app/lib/auth/auth';

export default async function DashboardLayout({ children }) {
  await requireAuth();
  return children;
}