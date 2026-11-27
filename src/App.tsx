import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartProvider, useCart } from './context/CartContext';
import { ProductQuickViewModal } from './components/ProductQuickViewModal';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// New Pages
import { ProductsPage } from './components/pages/ProductsPage';
import { CategoriesPage } from './components/pages/CategoriesPage';
import { SearchPage } from './components/pages/SearchPage';
import { ProfilePage } from './components/pages/ProfilePage';

import { TomatoAdminPanel } from './components/admin/TomatoAdminPanel';
import { ClientLoginPage } from './components/pages/ClientLoginPage';
import { AdminLoginPage } from './components/pages/AdminLoginPage';
import { ClientSignUpPage } from './components/pages/ClientSignUpPage';
import { AdminSignUpPage } from './components/pages/AdminSignUpPage';
import { AuthProvider, useAuth } from './context/AuthContext';

import { HomePage } from './components/home/HomePage';
import { EASE_OUT } from './components/home/motionTokens';

const ToastContainer = () => {
  const { toasts } = useCart();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            layout
            role={toast.type === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[2px] border border-line bg-ink-2 p-4 text-[13px] leading-snug text-paper shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] sm:w-auto"
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-danger" strokeWidth={1.75} />
            ) : toast.type === 'info' ? (
              <Info className="mt-px h-4 w-4 shrink-0 text-paper-2" strokeWidth={1.75} />
            ) : (
              <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-paper" strokeWidth={1.75} />
            )}
            <p>{toast.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isAdmin } = useAuth();
  
  // Allow direct URL access
  const getInitialTab = () => {
    const path = window.location.pathname;
    if (path === '/admin' || path === '/login-admin') return 'admin';
    if (path === '/signup-admin') return 'signup-admin';
    if (path === '/login' || path === '/login-client') return 'login-client';
    if (path === '/signup' || path === '/signup-client') return 'signup-client';
    if (path === '/products') return 'products';
    if (path === '/categories') return 'categories';
    if (path === '/search') return 'search';
    if (path === '/perfil' || path === '/profile') return 'profile';
    return 'home';
  };

  const [currentTab, setCurrentTab] = useState<'home' | 'products' | 'categories' | 'search' | 'profile' | 'admin' | 'login-client' | 'login-admin' | 'signup-client' | 'signup-admin'>(getInitialTab);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Configuração global para fundo escuro
  useEffect(() => {
    document.body.style.backgroundColor = '#0b0b0a';
    document.body.style.color = '#f2f0eb';
    
    // Handle browser back/forward buttons
    const handlePopState = () => setCurrentTab(getInitialTab());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (tab: string, categorySlug?: string) => {
    if (categorySlug) {
      setSelectedCategory(categorySlug);
    }
    setCurrentTab(tab as any);
    
    // Update URL to match current tab
    let path = '/';
    if (tab === 'admin' || tab === 'login-admin') path = '/admin';
    else if (tab === 'signup-admin') path = '/signup-admin';
    else if (tab === 'login-client') path = '/login';
    else if (tab === 'signup-client') path = '/signup';
    else if (tab === 'profile') path = '/perfil';
    else if (tab !== 'home') path = `/${tab}`;
    
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategoryFromHomeOrPage = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setCurrentTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <CartProvider>
      <div className="min-h-screen relative overflow-x-clip bg-ink font-sans text-paper">
      

        {/* Dynamic Global Navbar */}
        <Navbar currentTab={currentTab} onNavigate={handleNavigate} />

        {/* VIEW 1: HOME PAGE WITH REACT BITS ANIMATIONS */}
        {currentTab === 'home' && (
          <HomePage onNavigate={handleNavigate} onSelectCategory={handleSelectCategoryFromHomeOrPage} />
        )}

        {/* VIEW 2: PRODUCTS CATALOG PAGE */}
        {currentTab === 'products' && (
          <div className="animate-fadeIn">
            <ProductsPage initialCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          </div>
        )}

        {/* VIEW 3: CATEGORIES PAGE */}
        {currentTab === 'categories' && (
          <div className="animate-fadeIn">
            <CategoriesPage onSelectCategory={handleSelectCategoryFromHomeOrPage} />
          </div>
        )}

        {/* VIEW 4: SEARCH PAGE */}
        {currentTab === 'search' && (
          <div className="animate-fadeIn">
            <SearchPage />
          </div>
        )}

        {/* VIEW: CLIENT PROFILE */}
        {currentTab === 'profile' && (
          <div className="animate-fadeIn">
            <ProfilePage onNavigate={handleNavigate} />
          </div>
        )}

        {/* VIEW 5: TOMATO ADMIN PANEL */}
        {currentTab === 'admin' && (
          <div className="animate-fadeIn">
            {isAuthenticated && isAdmin ? (
              <TomatoAdminPanel />
            ) : (
              <AdminLoginPage 
                onLoginSuccess={() => handleNavigate('admin')} 
                onNavigateToSignUp={() => handleNavigate('signup-admin')}
              />
            )}
          </div>
        )}

        {/* VIEW 6: CLIENT LOGIN */}
        {currentTab === 'login-client' && (
          <div className="animate-fadeIn">
            <ClientLoginPage 
              onLoginSuccess={() => handleNavigate('home')}
              onNavigateToSignUp={() => handleNavigate('signup-client')}
            />
          </div>
        )}

        {/* VIEW 7: ADMIN LOGIN */}
        {currentTab === 'login-admin' && (
          <div className="animate-fadeIn">
            <AdminLoginPage 
              onLoginSuccess={() => handleNavigate('admin')} 
              onNavigateToSignUp={() => handleNavigate('signup-admin')}
            />
          </div>
        )}

        {/* VIEW 8: CLIENT SIGNUP */}
        {currentTab === 'signup-client' && (
          <div className="animate-fadeIn">
            <ClientSignUpPage 
              onSignUpSuccess={() => handleNavigate('home')} 
              onNavigateToLogin={() => handleNavigate('login-client')} 
            />
          </div>
        )}

        {/* VIEW 9: ADMIN SIGNUP */}
        {currentTab === 'signup-admin' && (
          <div className="animate-fadeIn">
            <AdminSignUpPage 
              onSignUpSuccess={() => handleNavigate('admin')} 
              onNavigateToLogin={() => handleNavigate('login-admin')} 
            />
          </div>
        )}

        {/* Global Modals & Drawers */}
        <Footer onNavigate={handleNavigate} />
        <ToastContainer />
        <CartDrawer onNavigate={handleNavigate} />
        <SearchModal />
        <ProductQuickViewModal />
      </div>
    </CartProvider>
  );
}
