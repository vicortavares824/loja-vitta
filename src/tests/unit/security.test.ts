import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const rootDir = resolve(__dirname, '../../..');

function readFile(relPath: string): string {
  return readFileSync(resolve(rootDir, relPath), 'utf-8');
}

describe('🔒 Security Audit - Environment & Secrets', () => {
  it('should NOT have .env tracked in git (check .gitignore)', () => {
    const gitignore = readFile('.gitignore');
    expect(gitignore).toContain('.env');
  });

  it('should have VITE_ prefix only for public keys, not secrets', () => {
    const envFile = readFile('.env');
    const lines = envFile.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    
    for (const line of lines) {
      const [key] = line.split('=');
      if (key && key.includes('SECRET') || key?.includes('PASSWORD') || key?.includes('PRIVATE')) {
        expect(key.startsWith('VITE_')).toBe(false);
      }
    }
  });

  it('should NOT expose admin secret key in client-side code', () => {
    const adminSecret = readFile('.env').match(/VITE_ADMIN_SECRET_KEY=(.+)/)?.[1];
    if (adminSecret) {
      const authService = readFile('src/services/authService.ts');
      expect(authService).not.toContain(adminSecret);
    }
  });

  it('should NOT have VITE_ADMIN_SECRET_KEY in .env (should be server-side only)', () => {
    const envFile = readFile('.env');
    expect(envFile).not.toContain('VITE_ADMIN_SECRET_KEY');
  });
});

describe('🔒 Security Audit - Hardcoded Credentials', () => {
  it('should NOT have hardcoded passwords in login pages', () => {
    const adminLogin = readFile('src/components/pages/AdminLoginPage.tsx');
    const clientLogin = readFile('src/components/pages/ClientLoginPage.tsx');
    
    expect(adminLogin).not.toContain("useState('admin123')");
    expect(clientLogin).not.toContain("useState('cliente123')");
  });

  it('should NOT have hardcoded emails in login page defaults', () => {
    const adminLogin = readFile('src/components/pages/AdminLoginPage.tsx');
    const clientLogin = readFile('src/components/pages/ClientLoginPage.tsx');
    
    expect(adminLogin).not.toContain("useState('admin@vittabasics.com')");
    expect(clientLogin).not.toContain("useState('cliente@vittabasics.com')");
  });

  it('should NOT display demo credentials in production build', () => {
    const adminLogin = readFile('src/components/pages/AdminLoginPage.tsx');
    expect(adminLogin).toContain('import.meta.env.DEV');
  });
});

describe('🔒 Security Audit - Authentication & Authorization', () => {
  it('should NOT compare admin secret key client-side', () => {
    const authService = readFile('src/services/authService.ts');
    expect(authService).not.toContain('=== import.meta.env.VITE_ADMIN_SECRET_KEY');
  });

  it('should use server-side RPC for admin promotion', () => {
    const authService = readFile('src/services/authService.ts');
    expect(authService).toContain('supabase.rpc');
    expect(authService).toContain('promote_to_admin');
  });

  it('should default new users to customer role', () => {
    const authService = readFile('src/services/authService.ts');
    expect(authService).toContain("role: 'customer'");
  });
});

describe('🔒 Security Audit - Data Integrity', () => {
  it('should NOT have localStorage fallbacks for write operations', () => {
    const tomatoApi = readFile('src/services/tomatoApi.ts');
    expect(tomatoApi).not.toContain('localStorage.setItem');
    expect(tomatoApi).not.toContain('localStorage.getItem');
  });

  it('should NOT have dummy/seed data in production code', () => {
    const tomatoApi = readFile('src/services/tomatoApi.ts');
    expect(tomatoApi).not.toContain('Blazer Alfaiataria');
    expect(tomatoApi).not.toContain('Vestido de Seda');
    expect(tomatoApi).not.toContain('Lucas Albuquerque');
    expect(tomatoApi).not.toContain('Beatriz Vasconcelos');
  });

  it('should sanitize search input to prevent PostgREST injection', () => {
    const tomatoApi = readFile('src/services/tomatoApi.ts');
    expect(tomatoApi).toContain('sanitizedSearch');
    expect(tomatoApi).toContain('.replace(/[%(),.]/g');
  });
});

describe('🔒 Security Audit - Security Headers', () => {
  it('should have CSP headers in vercel.json', () => {
    const vercelJson = readFile('vercel.json');
    const config = JSON.parse(vercelJson);
    
    const securityHeaders = config.headers?.[0]?.headers || [];
    const cspHeader = securityHeaders.find((h: any) => h.key === 'Content-Security-Policy');
    expect(cspHeader).toBeDefined();
    expect(cspHeader.value).toContain("default-src 'self'");
  });

  it('should have X-Frame-Options DENY', () => {
    const vercelJson = readFile('vercel.json');
    const config = JSON.parse(vercelJson);
    
    const securityHeaders = config.headers?.[0]?.headers || [];
    const frameHeader = securityHeaders.find((h: any) => h.key === 'X-Frame-Options');
    expect(frameHeader?.value).toBe('DENY');
  });

  it('should have X-Content-Type-Options nosniff', () => {
    const vercelJson = readFile('vercel.json');
    const config = JSON.parse(vercelJson);
    
    const securityHeaders = config.headers?.[0]?.headers || [];
    const contentType = securityHeaders.find((h: any) => h.key === 'X-Content-Type-Options');
    expect(contentType?.value).toBe('nosniff');
  });

  it('should restrict Permissions-Policy', () => {
    const vercelJson = readFile('vercel.json');
    const config = JSON.parse(vercelJson);
    
    const securityHeaders = config.headers?.[0]?.headers || [];
    const permissions = securityHeaders.find((h: any) => h.key === 'Permissions-Policy');
    expect(permissions?.value).toContain('camera=()');
    expect(permissions?.value).toContain('microphone=()');
    expect(permissions?.value).toContain('geolocation=()');
  });
});

describe('🔒 Security Audit - Console Leaks', () => {
  it('should NOT have console.warn in production code (only in dev)', () => {
    const supabaseConfig = readFile('src/config/supabase.ts');
    expect(supabaseConfig).toContain('import.meta.env.DEV');
  });
});
