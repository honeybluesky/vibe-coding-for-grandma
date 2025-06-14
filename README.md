# Vibe Coding Assistant - Iframe Widget

Fault-tolerant AI coding assistant widget designed to be embedded via iframe without breaking parent applications.

## Implementation

- **Framework**: Next.js 15 with React 18
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Deployment**: Static export ready for any hosting

## Embed Examples

### Basic HTML Integration

Add this to any `index.html` file. The widget will load independently and won't crash your main app:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your App</title>
</head>
<body>
    <!-- Your app content -->
    <div id="app">Your main application content here</div>
    
    <!-- Vibe Assistant Widget - Fault Tolerant -->
    <div id="vibe-assistant-container" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        height: 600px;
        z-index: 9999;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    ">
        <iframe 
            id="vibe-assistant-iframe"
            src="https://your-widget-domain.vercel.app/"
            width="100%" 
            height="100%"
            frameborder="0"
            title="Vibe Coding Assistant"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            onerror="handleVibeAssistantError()"
            onload="handleVibeAssistantLoad()">
            <!-- Fallback content if iframe fails -->
            <div style="padding: 20px; text-align: center; background: #f3f4f6;">
                <p>Vibe Assistant is loading...</p>
                <p><a href="https://your-widget-domain.vercel.app/" target="_blank">Open in new tab</a></p>
            </div>
        </iframe>
    </div>

    <script>
        // Error handling - prevents widget failures from affecting main app
        function handleVibeAssistantError() {
            console.warn('Vibe Assistant failed to load - main app continues normally');
            document.getElementById('vibe-assistant-container').innerHTML = `
                <div style="padding: 20px; text-align: center; background: #fee2e2; border-radius: 12px;">
                    <p style="color: #dc2626; margin: 0;">Widget temporarily unavailable</p>
                    <button onclick="retryVibeAssistant()" style="margin-top: 10px; px: 12px; py: 6px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }

        function handleVibeAssistantLoad() {
            console.log('Vibe Assistant loaded successfully');
        }

        function retryVibeAssistant() {
            location.reload(); // Simple retry - reload the page
        }

        // Optional: Hide widget on mobile for better UX
        if (window.innerWidth < 768) {
            document.getElementById('vibe-assistant-container').style.display = 'none';
        }
    </script>
</body>
</html>
```

### React App Integration

```jsx
// components/VibeAssistantIframe.jsx
import { useState, useEffect } from 'react';

export default function VibeAssistantIframe({ position = 'bottom-right' }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const positionStyles = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
  };

  return (
    <div 
      style={{
        position: 'fixed',
        ...positionStyles[position],
        width: '400px',
        height: '600px',
        zIndex: 9999,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      }}
    >
      {hasError ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          background: '#fee2e2',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <p style={{ color: '#dc2626', margin: '0 0 10px 0' }}>
            Widget temporarily unavailable
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '6px 12px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <iframe
          src="https://your-widget-domain.vercel.app/"
          width="100%"
          height="100%"
          frameBorder="0"
          title="Vibe Coding Assistant"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
```

### WordPress/PHP Integration

```php
<!-- Add to your WordPress theme's footer.php or any PHP file -->
<div id="vibe-assistant-widget">
    <iframe 
        src="https://your-widget-domain.vercel.app/"
        width="400" 
        height="600"
        frameborder="0"
        title="Vibe Coding Assistant"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);"
        onerror="this.style.display='none';">
    </iframe>
</div>

<script>
// Prevent widget errors from affecting WordPress site
window.addEventListener('error', function(e) {
    if (e.target && e.target.id === 'vibe-assistant-widget') {
        console.warn('Vibe widget error contained - site continues normally');
        return false; // Prevent error from bubbling up
    }
});
</script>
```

## Security Configuration

Based on iframe best practices, the widget includes:

```html
<!-- Security attributes applied to iframe -->
sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
referrerpolicy="strict-origin-when-cross-origin"
```

## Missing Implementation Features

Current gaps that need to be addressed:

1. **Error Boundaries**: Add React error boundary to prevent widget crashes
2. **CSP Headers**: Configure Content Security Policy for iframe security
3. **Lazy Loading**: Implement intersection observer for performance
4. **Cross-Origin Communication**: Add `postMessage` API for parent-child communication
5. **Responsive Breakpoints**: Handle mobile vs desktop display logic

## Development Setup

```bash
cd vibe-coding-assistant
npm install
npm run dev    # Development server
npm run build  # Production build
npm run start  # Production server
```

## Deployment

The widget exports as static files, deploy to:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag & drop the `out` folder
- **Any static host**: Upload the built files

## File Structure

```
vibe-coding-assistant/
├── src/
│   ├── components/VibeAssistant.tsx  # Main widget component
│   └── app/
│       ├── layout.tsx                # Root layout
│       └── page.tsx                  # Embedded widget page
├── public/embed-example.html         # Integration examples
└── next.config.js                    # Static export config
```

## Testing Fault Tolerance

1. **Network Failure**: Disable network - parent app should continue working
2. **Widget Crash**: Throw error in widget - should not affect parent
3. **CSP Violations**: Test with strict CSP - widget should fail gracefully
4. **Mobile Display**: Test responsive behavior on small screens

Replace `https://your-widget-domain.vercel.app/` with your actual deployment URL.