'use client';

import { VibeAssistant } from '@/components/VibeAssistant';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Full-screen embedded widget */}
      <VibeAssistant embedded={true} />
      
      {/* Fallback content in case the widget doesn't load */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-3">Vibe Assistant</h1>
          <p className="text-neutral-600 mb-6">
            Your AI coding companion is loading. This widget is designed to be embedded in your website to provide coding assistance.
          </p>
          <div className="text-xs text-neutral-500 bg-white/50 rounded-lg p-3">
            <p className="font-semibold mb-1">For Developers:</p>
            <p>Embed this widget using an iframe pointing to this URL. It&apos;s designed to be resilient and won&apos;t break your main application if there are any issues.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
