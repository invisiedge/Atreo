import React, { useState, useEffect } from 'react';
import { FiMonitor } from 'react-icons/fi';

const MobileBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      // Check screen width (mobile/tablet if less than 700px)
      const screenWidth = window.innerWidth;
      const MIN_WIDTH = 700; // Minimum required width in pixels
      
      // Check user agent for mobile devices
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
      
      // Check if it's a tablet (iPad, Android tablets)
      const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent.toLowerCase());
      
      // Consider it mobile if:
      // 1. Screen width is less than 700px (minimum required)
      // 2. OR mobile user agent detected (phone, not tablet)
      // 3. OR tablet detected AND screen width < 700px
      const isMobileDevice = screenWidth < MIN_WIDTH || 
                             (isMobileUserAgent && !isTablet) ||
                             (isTablet && screenWidth < MIN_WIDTH);
      
      setIsMobile(isMobileDevice);
      setIsChecking(false);
    };

    // Check on mount
    checkDevice();

    // Check on resize (for desktop browsers resized to small window)
    // Only re-check if width changes significantly
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        checkDevice();
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/10 dark:to-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-border">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <FiMonitor className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Desktop Required</h1>
            <p className="text-muted-foreground">
              This application is optimized for desktop and laptop computers.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Please use a compatible device:</strong>
              </p>
              <div className="flex flex-col gap-2 text-left">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FiMonitor className="h-5 w-5 text-primary" />
                  <span>Desktop Computer</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FiMonitor className="h-5 w-5 text-primary" />
                  <span>Laptop Computer</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-100">
                <strong>Mobile and tablet devices are not supported.</strong>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground/80">
              Screen width detected: {window.innerWidth}px
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Minimum required: 700px
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MobileBlock;

