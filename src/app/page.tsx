'use client';

import dynamic from 'next/dynamic';

const IDE = dynamic(() => import('@/components/IDE'), { ssr: false });

export default function Home() {
  return (
    <main>
      <IDE />
    </main>
  );
}
