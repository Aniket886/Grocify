import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Navbar from './components/Navbar.jsx';
import BottomNav from './components/BottomNav.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Footer from './components/Footer.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="container">
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </main>
            <BottomNav />
            <Footer />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
