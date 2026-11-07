import { useState, useEffect, useRef } from 'react';

/**
 * PwaInstallBanner component
 * Displays a 3-second banner on mobile devices prompting the user to install Grocify PWA.
 * Can be dismissed by sliding/swiping in ANY direction (left or right).
 */
export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [dismissDirection, setDismissDirection] = useState(null); // 'left' | 'right' | 'fade'

  const bannerRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const autoDismissTimerRef = useRef(null);

  useEffect(() => {
    // Only show on mobile devices
    if (typeof window === 'undefined') return;

    // Detect if already installed as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    // Detect mobile device (screen size <= 768px OR mobile user agent)
    const isMobileScreen = window.matchMedia('(max-width: 768px)').matches;
    const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ''
    );
    const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

    const isMobile = isMobileScreen || (hasTouch && isMobileUa);

    if (!isMobile) {
      return;
    }

    // Detect iOS Safari
    const iosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent || '') && !window.MSStream;
    setIsIos(iosDevice);

    // Capture Chrome/Android PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show banner on mobile load
    const showTimeout = setTimeout(() => {
      setVisible(true);
      startAutoDismissTimer();
    }, 400);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(autoDismissTimerRef.current);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const startAutoDismissTimer = () => {
    clearTimeout(autoDismissTimerRef.current);
    // 3 second auto-dismiss as requested: "show a 3 sec banner"
    autoDismissTimerRef.current = setTimeout(() => {
      dismissBanner('fade');
    }, 3200);
  };

  const pauseAutoDismissTimer = () => {
    clearTimeout(autoDismissTimerRef.current);
  };

  const dismissBanner = (direction = 'right') => {
    pauseAutoDismissTimer();
    setDismissDirection(direction);
    setTimeout(() => {
      setVisible(false);
    }, 280);
  };

  const handleInstallClick = async () => {
    pauseAutoDismissTimer();

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          console.debug('User accepted Grocify PWA installation');
        }
      } catch (err) {
        console.debug('Install prompt error:', err);
      }
      setDeferredPrompt(null);
      dismissBanner('fade');
      return;
    }

    if (isIos) {
      setShowIosTip(true);
      return;
    }

    // Generic fallback: give friendly instructions
    alert("To install Grocify on your phone: Tap your browser's menu (⋮) and select 'Add to Home screen' or 'Install app'.");
    dismissBanner('fade');
  };

  // Touch and Pointer Swipe Gesture Handlers (Sliding left or right)
  const handleTouchStart = (e) => {
    pauseAutoDismissTimer();
    const touch = e.touches ? e.touches[0] : e;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    const touch = e.touches ? e.touches[0] : e;
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // If movement is predominantly horizontal, track swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) || Math.abs(deltaX) > 10) {
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    const threshold = 55; // pixels to trigger dismiss in either direction
    if (swipeOffset > threshold) {
      // Swiped RIGHT
      dismissBanner('right');
    } else if (swipeOffset < -threshold) {
      // Swiped LEFT
      dismissBanner('left');
    } else {
      // Snap back to center
      setSwipeOffset(0);
      // Resume timer with slight buffer
      startAutoDismissTimer();
    }
  };

  if (!visible) return null;

  // Determine transform based on dragging or dismiss animation
  let transformStyle = `translateX(${swipeOffset}px)`;
  let opacityStyle = 1;

  if (dismissDirection === 'left') {
    transformStyle = 'translateX(-120vw)';
    opacityStyle = 0;
  } else if (dismissDirection === 'right') {
    transformStyle = 'translateX(120vw)';
    opacityStyle = 0;
  } else if (dismissDirection === 'fade') {
    transformStyle = 'translateY(-20px)';
    opacityStyle = 0;
  } else if (isSwiping && swipeOffset !== 0) {
    const absOffset = Math.abs(swipeOffset);
    opacityStyle = Math.max(0.2, 1 - absOffset / 260);
    transformStyle = `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.04}deg)`;
  }

  return (
    <aside
      ref={bannerRef}
      className={`pwa-install-banner ${isSwiping ? 'is-swiping' : ''} ${dismissDirection ? 'is-dismissing' : ''}`}
      role="banner"
      aria-label="Install Grocify Progressive Web App"
      style={{
        transform: transformStyle,
        opacity: opacityStyle,
        transition: isSwiping ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.24s ease'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={(e) => {
        if (e.buttons === 1) handleTouchMove(e);
      }}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* 3-second animated countdown progress bar */}
      <div className="pwa-progress-track" aria-hidden="true">
        <div className="pwa-progress-fill" />
      </div>

      <div className="pwa-banner-content">
        {/* App Icon */}
        <div className="pwa-app-icon" aria-hidden="true">
          <img
            src="/icons/icon-192.png"
            alt="Grocify"
            width="46"
            height="46"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="pwa-icon-fallback">🛒</span>
        </div>

        {/* Text and Value Prop */}
        <div className="pwa-banner-text">
          <div className="pwa-banner-header">
            <span className="pwa-banner-title">Grocify App</span>
            <span className="pwa-pill-badge">⚡ 12-Min Delivery</span>
          </div>
          <p className="pwa-banner-desc">
            Install Grocify for 12-min express deliveries, offline orders &amp; instant home screen access!
          </p>
        </div>

        {/* Action Button */}
        <div className="pwa-banner-actions">
          <button
            type="button"
            className="pwa-install-btn"
            onClick={handleInstallClick}
            aria-label="Install Grocify PWA on your device"
          >
            <span className="pwa-install-icon">📲</span>
            <span>Install</span>
          </button>
          <button
            type="button"
            className="pwa-close-btn"
            onClick={() => dismissBanner('right')}
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Swipe to dismiss visual cue */}
      <div className="pwa-swipe-hint" aria-hidden="true">
        <span className="swipe-arrow">‹</span>
        <span className="swipe-text">Slide left or right to dismiss</span>
        <span className="swipe-arrow">›</span>
      </div>

      {/* iOS Safari instructions tooltip if clicked on iPhone */}
      {showIosTip && (
        <div className="pwa-ios-tip">
          <p>
            To install on iPhone: Tap <strong>Share</strong> (
            <span role="img" aria-label="Share">⎋</span>
            ) below, then choose <strong>&quot;Add to Home Screen&quot;</strong> 📲
          </p>
          <button
            type="button"
            className="pwa-ios-close"
            onClick={() => {
              setShowIosTip(false);
              dismissBanner('fade');
            }}
          >
            Got it
          </button>
        </div>
      )}
    </aside>
  );
}
