const getOrCreateClientId = (): string => {
  try {
    let clientId = localStorage.getItem("ga_client_id");
    if (!clientId) {
      // Create a standard-looking GA client id: [random_unsigned_int].[timestamp]
      const rand = Math.floor(Math.random() * 2147483647);
      const ts = Math.floor(Date.now() / 1000);
      clientId = `${rand}.${ts}`;
      localStorage.setItem("ga_client_id", clientId);
    }
    return clientId;
  } catch (e) {
    // fallback if localStorage is blocked or throws error
    return `${Math.floor(Math.random() * 2147483647)}.${Math.floor(Date.now() / 1000)}`;
  }
};

export const initGA = (measurementId: string) => {
  if (!measurementId || typeof window === "undefined") return;
  
  // Check if already initialized to prevent duplicate scripts
  if ((window as any)._ga_initialized) return;

  try {
    // 1. Load gtag.js script
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // 2. Setup window.dataLayer and gtag function
    (window as any).dataLayer = (window as any).dataLayer || [];
    const gtag = function (..._args: any[]) {
      (window as any).dataLayer.push(arguments);
    };
    (window as any).gtag = gtag;
    
    // 3. Configure Google Analytics with iframe compatibility, cookieless client ID and debug_mode
    gtag("js", new Date());
    gtag("config", measurementId, {
      send_page_view: true,
      debug_mode: true,             // Forces immediate transmission to Realtime/DebugView
      client_storage: "none",        // Prevents GA from trying to set blocked third-party cookies
      client_id: getOrCreateClientId(), // Pass manually generated client ID persisted in LocalStorage
      cookie_flags: "SameSite=None;Secure" // Support iframe environments where secure is available
    });

    (window as any)._ga_initialized = true;
  } catch (e) {
    console.error("Failed to initialize Google Analytics:", e);
  }
};

export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  const timestamp = new Date().toISOString();
  // Dispatch to standard Google Analytics window.gtag if it exists
  try {
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("event", eventName, {
        ...params,
        debug_mode: true // Force immediate upload for each individual custom event
      });
    }
  } catch (e) {
    console.warn("Failed to push to standard gtag:", e);
  }

  // 3. Save to window context so the application can display a live event tracker
  try {
    if (!(window as any)._ga_events) {
      (window as any)._ga_events = [];
    }
    (window as any)._ga_events.unshift({
      event: eventName,
      params,
      timestamp
    });
    
    // Dispatch custom event to notify UI if needed
    window.dispatchEvent(new CustomEvent("ga_event_tracked", { detail: { event: eventName, params } }));
  } catch (e) {
    // silently catch iframe context errors
  }
};
