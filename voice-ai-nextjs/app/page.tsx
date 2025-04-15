'use client';

import dynamic from 'next/dynamic';

// Dynamically import the VoiceApp component with no SSR
// This is necessary because it uses browser APIs that are not available during SSR
const VoiceApp = dynamic(() => import('./components/VoiceApp'), {
  ssr: false, 
});

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <VoiceApp />
    </div>
  );
}
