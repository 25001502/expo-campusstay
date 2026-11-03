"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  House,
  LayoutDashboard,
  Menu,
  ScrollText,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { previewNotice } from "@/lib/mock-data";
import { usePreview } from "./preview-context";
export const navigation = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  {
    href: "/admin/applications",
    label: "Manager Applications",
    icon: ClipboardCheck,
  },
  { href: "/admin/properties", label: "Property Reviews", icon: Building2 },
  { href: "/admin/users", label: "Users & Managers", icon: Users },
  { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (mobileOpen) mobileDialog.current?.showModal();
  }, [mobileOpen]);
  const pathname = usePathname();
  const { state } = usePreview();
  const current = navigation.find((n) =>
    n.href === "/admin" ? pathname === n.href : pathname.startsWith(n.href),
  );
  const pending = state.records.filter(
    (r) => r.application.status === "pending",
  ).length;
  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Administration sidebar">
        <Link
          href="/admin"
          className="brand"
          aria-label="CampusStay Admin overview"
        >
          <span className="brand-mark">
            <House size={23} aria-hidden="true" />
          </span>
          <span className="brand-name">
            CampusStay<small>ADMIN WORKSPACE</small>
          </span>
        </Link>
        <span className="nav-caption">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map((n) => {
            const active =
              n.href === "/admin"
                ? pathname === n.href
                : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`nav-link ${active ? "active" : ""}`}
                aria-label={n.label}
                aria-current={active ? "page" : undefined}
                title={collapsed ? n.label : undefined}
              >
                <n.icon size={20} aria-hidden="true" />
                <span className="nav-label">{n.label}</span>
                {n.label === "Manager Applications" && (
                  <span
                    className="nav-count"
                    aria-label={`${pending} pending example applications`}
                  >
                    {pending}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <ShieldCheck size={21} aria-hidden="true" />
            <span>
              Designed for careful decisions
              <small>Student accommodation, thoughtfully reviewed.</small>
            </span>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span>{collapsed ? "Expand" : "Collapse sidebar"}</span>
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={13} aria-hidden="true" />{" "}
              <strong>{current?.label ?? "Application details"}</strong>
              {pathname.split("/").length > 3 && (
                <>
                  <ChevronRight size={13} aria-hidden="true" />
                  <span>Details</span>
                </>
              )}
            </span>
          </div>
          <div className="topbar-actions">
            <span className="header-label">Synthetic data</span>
            <button
              className="icon-button"
              disabled
              aria-label="Notifications unavailable in preview"
              title="Notifications are not connected"
            >
              <Bell size={19} />
            </button>
            <details className="profile-menu">
              <summary aria-label="Preview reviewer information">
                <span className="profile-avatar">CS</span>
                <span className="profile-label">
                  Preview reviewer<small>No authenticated account</small>
                </span>
              </summary>
              <div className="profile-popover">
                <strong>Visual preview only</strong>
                <p>
                  No administrator identity or permissions have been assigned.
                </p>
                <Link href="/sign-in">View sign-in layout</Link>
              </div>
            </details>
          </div>
        </header>
        {mobileOpen && (
          <dialog
            ref={mobileDialog}
            className="mobile-menu"
            aria-label="Mobile navigation"
            onClose={() => setMobileOpen(false)}
          >
            <div className="mobile-menu-heading">
              <strong>CampusStay Admin</strong>
              <button
                autoFocus
                className="icon-button"
                onClick={() => mobileDialog.current?.close()}
                aria-label="Close navigation"
              >
                <X />
              </button>
            </div>
            <nav aria-label="Mobile main navigation">
              {navigation.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => mobileDialog.current?.close()}
                  aria-current={
                    (
                      n.href === "/admin"
                        ? pathname === n.href
                        : pathname.startsWith(n.href)
                    )
                      ? "page"
                      : undefined
                  }
                >
                  <n.icon size={20} aria-hidden="true" />
                  {n.label}
                </Link>
              ))}
            </nav>
          </dialog>
        )}
        <main id="main-content" tabIndex={-1}>
          <div className="preview-banner">
            <span className="preview-marker" />
            {previewNotice}
            <span className="banner-detail">
              All people, properties and activity shown are synthetic.
            </span>
          </div>
          {state.notice && (
            <div role="status" className="feedback success">
              {state.notice}
            </div>
          )}
          {state.error && (
            <div role="alert" className="feedback error">
              {state.error}
            </div>
          )}
          {children}
          <footer className="page-footer">
            <span>CampusStay · Administration</span>
            <span>Frontend preview · No live services connected</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
