import React, { useState } from 'react';
import { Icon } from '../ui/Icon';

interface AdminSidebarProps {
  adminName: string;
  adminRole: string;
  pathname: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Ringkasan', href: '/admin', icon: 'dashboard' },
  { label: 'Event', href: '/admin/events', icon: 'event' },
  { label: 'Halaman', href: '/admin/halaman', icon: 'article' },
  { label: 'Kategori', href: '/admin/kategori', icon: 'category' },
  { label: 'Pengaturan', href: '/admin/pengaturan', icon: 'settings', superAdminOnly: true },
  { label: 'Log', href: '/admin/log', icon: 'history' },
];

export function AdminSidebar({ adminName, adminRole, pathname }: AdminSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isSuperAdmin = adminRole === 'super_admin';

  const filteredItems = navItems.filter((item) =>
    !item.superAdminOnly || isSuperAdmin
  );

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin' || pathname === '/admin/';
    return pathname.startsWith(href);
  };

  const NavLinks = () => (
    <nav aria-label="Menu admin">
      <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={`sidebar-nav-item ${active ? 'sidebar-nav-item-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setDrawerOpen(false)}
              >
                <Icon
                  name={item.icon}
                  size={22}
                  style={{ color: active ? 'var(--pink-500)' : 'var(--ink-400)' }}
                  aria-hidden
                />
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Mobile drawer toggle */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setDrawerOpen(true)}
        aria-label="Buka sidebar menu"
        aria-expanded={drawerOpen}
      >
        <Icon name="menu" size={24} aria-hidden />
      </button>

      {/* Desktop sidebar */}
      <aside className="sidebar" aria-label="Panel navigasi admin">
        <div className="sidebar-logo-wrap">
          <a href="/admin" className="sidebar-logo-link" aria-label="Dashboard admin">
            <img src="/img/logo.png" alt="" width="32" height="32" />
            <div className="sidebar-logo-text">
              <span className="sidebar-brand-name">Happy Couple</span>
              <span className="sidebar-brand-sub">Class</span>
            </div>
          </a>
        </div>
        <div className="sidebar-body">
          <NavLinks />
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{adminName}</span>
              <span className="sidebar-user-role">{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="sidebar-drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="sidebar sidebar-drawer" role="dialog" aria-label="Menu navigasi admin">
            <div className="sidebar-logo-wrap">
              <a href="/admin" className="sidebar-logo-link" onClick={() => setDrawerOpen(false)}>
                <img src="/img/logo.png" alt="" width="32" height="32" />
                <div className="sidebar-logo-text">
                  <span className="sidebar-brand-name">Happy Couple</span>
                  <span className="sidebar-brand-sub">Class</span>
                </div>
              </a>
              <button
                className="sidebar-drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
              >
                <Icon name="close" size={24} aria-hidden />
              </button>
            </div>
            <div className="sidebar-body">
              <NavLinks />
            </div>
            <div className="sidebar-footer">
              <div className="sidebar-user">
                <div className="sidebar-user-avatar">{adminName.charAt(0).toUpperCase()}</div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{adminName}</span>
                  <span className="sidebar-user-role">{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      <style>{`
        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: var(--white);
          border-right: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }

        .sidebar-logo-wrap {
          padding: 20px 16px;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-logo-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .sidebar-logo-link img {
          height: 32px;
          width: 32px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .sidebar-logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .sidebar-brand-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--ink-900);
          letter-spacing: -0.01em;
        }
        .sidebar-brand-sub {
          font-size: 10px;
          font-weight: 600;
          color: var(--pink-600);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .sidebar-body {
          flex: 1;
          padding: 12px 8px;
          overflow-y: auto;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          color: var(--ink-600);
          text-decoration: none;
          transition: all 150ms ease;
        }

        .sidebar-nav-item:hover {
          background: var(--pink-50);
          color: var(--ink-900);
        }

        .sidebar-nav-item-active {
          background: var(--pink-50);
          color: var(--pink-500);
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--line);
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sidebar-user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--pink-100);
          color: var(--pink-600);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .sidebar-user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-900);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-user-role {
          font-size: 11px;
          color: var(--ink-400);
        }

        .sidebar-mobile-toggle {
          display: none;
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 30;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--pink-500);
          color: white;
          border: none;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
        }

        .sidebar-mobile-toggle .material-symbols-outlined { color: white; }

        .sidebar-drawer {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 50;
          animation: slideInLeft 200ms ease;
        }

        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        .sidebar-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(31, 26, 29, 0.4);
          z-index: 49;
        }

        .sidebar-drawer-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: var(--ink-400);
          display: flex;
          align-items: center;
          border-radius: var(--radius-sm);
        }

        @media (max-width: 768px) {
          .sidebar:not(.sidebar-drawer) { display: none; }
          .sidebar-mobile-toggle { display: flex; }
        }
      `}</style>
    </>
  );
}

export default AdminSidebar;
