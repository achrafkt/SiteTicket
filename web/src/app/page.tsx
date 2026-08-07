'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('site-ticket-token');
    router.replace(token ? '/helpdesk' : '/login');
  }, [router]);

  return null;
}
