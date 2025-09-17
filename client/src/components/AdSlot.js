import React, { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';

const AdSlot = ({ 
  slot, 
  style = {}, 
  className = '',
  size = 'responsive',
  placeholder = true 
}) => {
  const adRef = useRef(null);
  const enabled = process.env.REACT_APP_ADS_ENABLED === 'true';
  const publisherId = process.env.REACT_APP_ADS_PUBLISHER_ID;

  useEffect(() => {
    if (!enabled || !publisherId || !adRef.current) return;

    // Load AdSense script if not already loaded
    if (!window.adsbygoogle) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Initialize ad
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.warn('AdSense initialization failed:', error);
    }
  }, [enabled, publisherId]);

  // Default styles based on size
  const defaultStyles = {
    responsive: { minHeight: 90, width: '100%' },
    banner: { minHeight: 90, width: '728px', maxWidth: '100%' },
    rectangle: { minHeight: 250, width: '300px', maxWidth: '100%' },
    square: { minHeight: 250, width: '250px', maxWidth: '100%' }
  };

  const adStyles = {
    ...defaultStyles[size] || defaultStyles.responsive,
    ...style
  };

  if (!enabled || !publisherId) {
    // Show placeholder when ads are disabled
    if (placeholder) {
      return (
        <div 
          className={cn(
            "flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg",
            className
          )}
          style={adStyles}
        >
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            <div className="mb-1">📢</div>
            <div>Ad Space</div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={cn("ad-slot", className)} style={adStyles}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={size === 'responsive' ? 'auto' : 'rectangle'}
        data-full-width-responsive={size === 'responsive' ? 'true' : 'false'}
      />
    </div>
  );
};

export default AdSlot;
