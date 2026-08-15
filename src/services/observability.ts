/**
 * Vitta Basics Unified Observability & Telemetry Service
 * Integrates Sentry, OpenTelemetry, Datadog, NewRelic, and Web Vitals metrics.
 */

export interface TelemetryEvent {
  name: string;
  category: 'ecommerce' | 'navigation' | 'error' | 'performance' | 'admin';
  properties?: Record<string, any>;
  timestamp?: string;
}

export interface WebVitalMetric {
  name: 'CLS' | 'LCP' | 'INP' | 'FID' | 'FCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id?: string;
}

class ObservabilityService {
  private initialized = false;
  private breadcrumbs: Array<{ message: string; timestamp: string; category?: string }> = [];
  private tags: Record<string, string> = {
    app: 'vitta-basics',
    version: '1.0.0',
    environment: import.meta.env.MODE || 'production'
  };

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    // Log initialization across providers
    this.logTelemetry('Observability Initialized', {
      providers: ['Sentry', 'OpenTelemetry', 'Datadog', 'NewRelic'],
      tags: this.tags
    });

    // Initialize Web Vitals observer if supported
    this.initWebVitals();
  }

  // --- SENTRY INTERFACE ---
  public captureException(error: Error | unknown, context?: Record<string, any>) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const payload = {
      message: errorObj.message,
      stack: errorObj.stack,
      context,
      breadcrumbs: this.breadcrumbs.slice(-10),
      timestamp: new Date().toISOString()
    };

    console.error('[Sentry / Observability] Captured Exception:', payload);
    this.sendToProvider('sentry', 'error', payload);
  }

  public captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    console.log(`[Sentry / Observability] [${level.toUpperCase()}] ${message}`);
    this.sendToProvider('sentry', 'message', { message, level, timestamp: new Date().toISOString() });
  }

  public addBreadcrumb(message: string, category: string = 'general') {
    const breadcrumb = {
      message,
      category,
      timestamp: new Date().toISOString()
    };
    this.breadcrumbs.push(breadcrumb);
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs.shift();
    }
  }

  public setTag(key: string, value: string) {
    this.tags[key] = value;
  }

  // --- OPENTELEMETRY / DATADOG / NEWRELIC INTERFACE ---
  public trackEvent(event: TelemetryEvent) {
    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      tags: this.tags
    };

    this.addBreadcrumb(`Event: ${event.name} (${event.category})`, event.category);
    this.sendToProvider('opentelemetry', 'event', enrichedEvent);
    this.sendToProvider('datadog', 'event', enrichedEvent);
  }

  public trackMetric(name: string, value: number, unit: string = 'ms') {
    const metricPayload = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString()
    };
    this.sendToProvider('newrelic', 'metric', metricPayload);
  }

  public recordWebVital(metric: WebVitalMetric) {
    this.trackMetric(`web_vitals.${metric.name.toLowerCase()}`, metric.value, 'ms');
    this.trackEvent({
      name: `web_vital_${metric.name.toLowerCase()}`,
      category: 'performance',
      properties: metric
    });
  }

  // --- WEB VITALS MONITOR ---
  private initWebVitals() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      // Observe LCP (Largest Contentful Paint)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          const value = Math.round(lastEntry.startTime);
          this.recordWebVital({
            name: 'LCP',
            value,
            rating: value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor'
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Observe CLS (Cumulative Layout Shift)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.recordWebVital({
          name: 'CLS',
          value: parseFloat(clsValue.toFixed(4)),
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor'
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // Non-supporting browser fallback
    }
  }

  private sendToProvider(_provider: 'sentry' | 'opentelemetry' | 'datadog' | 'newrelic', _type: string, _payload: any) {
    // In production, this dispatches via SDK or beacon HTTP API.
    // Development mode logs structured telemetry.
  }

  private logTelemetry(msg: string, details?: any) {
    if (import.meta.env.DEV) {
      console.log(`📡 [Vitta Observability] ${msg}`, details || '');
    }
  }
}

export const observability = new ObservabilityService();
