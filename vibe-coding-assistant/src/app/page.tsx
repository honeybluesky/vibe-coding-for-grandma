'use client';

import { VibeAssistant } from '@/components/VibeAssistant';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Full-screen embedded widget with error boundary */}
      <ErrorBoundary>
        <VibeAssistant embedded={true} />
      </ErrorBoundary>
      
      {/* Fallback content in case the widget doesn't load */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9-8.25h13.5A2.25 2.25 0 0121 8.25v7.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15.75v-7.5A2.25 2.25 0 015.25 5.25z" />
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
