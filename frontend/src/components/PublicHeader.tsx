import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Features', path: '/features' },
    { name: 'Courses', path: '/courses' },
    { name: 'Tools', path: '/tools' },
    { name: 'Pricing', path: '/pricing', hasPulse: true },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <header className={`ss-landing-header ${scrolled ? 'ss-header-scrolled' : ''}`}>
      <div className="ss-landing-nav-inner">
        {/* Brand Logo */}
        <Link to="/" className="ss-landing-brand" title="StudySync AI — Home">
          <img
            src="/studysync-logo-horizontal.png"
            alt="StudySync AI"
            className="ss-landing-brand-logo-img"
          />
        </Link>

        {/* Center: Desktop Modern Unified Nav Links (No pill/dock border) */}
        <nav className="ss-landing-nav-menu ss-desktop-only" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `ss-landing-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <span>{link.name}</span>
              {link.hasPulse && <span className="ss-pulse-dot" />}
            </NavLink>
          ))}
        </nav>

        {/* Right: Modern Actions */}
        <div className="ss-landing-header-actions ss-desktop-only">
          <Link to="/login" className="ss-landing-btn-ghost">
            Sign In
          </Link>
          <Link to="/register" className="ss-landing-btn-cta">
            <span>Get Started</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="ss-mobile-toggle-btn ss-mobile-only"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="ss-mobile-drawer">
          <nav className="ss-mobile-nav-list">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `ss-mobile-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <span>{link.name}</span>
                {link.hasPulse && <span className="ss-pulse-dot" />}
              </NavLink>
            ))}
          </nav>
          <div className="ss-mobile-actions-row">
            <Link to="/login" className="ss-landing-btn-ghost" style={{ textAlign: 'center', width: '100%' }}>
              Sign In
            </Link>
            <Link to="/register" className="ss-landing-btn-cta" style={{ textAlign: 'center', width: '100%', justifyContent: 'center' }}>
              <span>Get Started</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
