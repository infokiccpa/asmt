"use client";
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && roles && !roles.includes(user.role)) {
      router.push(user.role === 'Student' ? '/student/dashboard' : '/admin/dashboard');
    }
  }, [user, loading, router, roles]);

  if (loading || !user) return <div>Loading...</div>;

  return <>{children}</>;
};

export default ProtectedRoute;
