// Version comes from package.json at build time (see vite.config.js).
/* global __APP_VERSION__ */
export default function Footer() {
  return (
    <footer className="site-footer">
      <span><b>Grocify</b> v{__APP_VERSION__}</span>
      <span>Online Grocery E-Commerce System</span>
      <span>UC25CA2303 · GM University</span>
    </footer>
  );
}
