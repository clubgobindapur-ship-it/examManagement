export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  const timestamp = new Date().toISOString();
  
  // 1. Log with beautiful styling in the console for instant verification
  console.log(
    `%c📊 GA EVENT: ${eventName}`,
    "background: #10B981; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-family: monospace;",
    { ...params, timestamp }
  );

  // 2. Dispatch to standard Google Analytics window.gtag if it exists
  try {
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("event", eventName, params);
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
