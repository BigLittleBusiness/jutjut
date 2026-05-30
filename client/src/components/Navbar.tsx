import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { isAuthenticated, logout, userProfile } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const primaryItems = [
    { id: "dashboard", label: "Dashboard", icon: "fa-house" },
    { id: "my-kit", label: "My Kit", icon: "fa-briefcase" },
    { id: "jobs", label: "Job Board", icon: "fa-clipboard-list" },
    { id: "drops", label: "The Drop", icon: "fa-fire" },
  ];

  const secondaryItems = [
    { id: "university", label: "Uni Portal", icon: "fa-graduation-cap" },
    { id: "your-way", label: "Your Way", icon: "fa-sliders" },
  ];

  const allItems = [...primaryItems, ...secondaryItems];
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-card border-b-2 border-border text-foreground transition-all duration-200">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleNavClick("dashboard")}>
          <svg className="w-10 h-10 transition-transform hover:rotate-3 active:scale-95" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="24" fill="#0D9488" className="brutal-border"/>
            <path d="M35 30H48V60C48 65.5 44 70 38 70C32 70 28 65.5 28 60H40V58C40 54 35 54 35 54V30Z" fill="white"/>
            <path d="M58 30H71V60C58 60 58 66 58 70C52 70 51 66 51 60H63V58C63 54 58 54 58 54V30Z" fill="#F59E0B"/>
          </svg>
          <span className="font-extrabold text-2xl tracking-tight hidden sm:block font-sans text-neutralDark">
            jut<span className="text-primary">jut</span>
          </span>
        </div>

        {/* Desktop Nav Items */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-3 relative ml-10">
            {primaryItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNavClick(item.id);
                    setIsMoreOpen(false);
                  }}
                  className={`relative px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-all duration-200 ${
                    isActive
                      ? "text-primary-foreground scale-105 mx-0.5 z-10"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground border-2 border-transparent"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-primary brutal-border brutal-shadow-amber rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <i className={`fa-solid ${item.icon} z-10`}></i>
                  <span className="z-10">{item.label}</span>
                </button>
              );
            })}

            {/* Desktop "More" Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={`relative px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-all duration-200 ${
                  secondaryItems.some(i => i.id === currentPage)
                    ? "text-primary-foreground scale-105 mx-0.5 z-10"
                    : isMoreOpen
                      ? "bg-accent text-foreground border-2 border-transparent"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground border-2 border-transparent"
                }`}
              >
                {secondaryItems.some(i => i.id === currentPage) && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-primary brutal-border brutal-shadow-amber rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <i className="fa-solid fa-ellipsis z-10"></i>
                <span className="z-10">More</span>
                <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 z-10 ${isMoreOpen ? "rotate-180" : ""}`}></i>
              </button>

              {/* Dropdown Menu List */}
              <AnimatePresence>
                {isMoreOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsMoreOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                      className="absolute right-0 mt-2 w-48 bg-card brutal-border rounded-xl p-1.5 brutal-shadow-amber z-30 flex flex-col gap-1 origin-top-right"
                    >
                      {secondaryItems.map((item) => {
                        const isActive = currentPage === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              handleNavClick(item.id);
                              setIsMoreOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-all text-left ${
                              isActive
                                ? "bg-primary text-primary-foreground brutal-border"
                                : "hover:bg-accent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

          {/* Actions / Theme Toggle / Profile */}
        <div className="flex items-center gap-3">
          {/* Brand Guidelines Link */}
          <a
            href="/brand-assets.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex h-10 px-3 brutal-border rounded-xl items-center justify-center bg-background text-foreground hover:bg-accent brutal-shadow font-bold text-xs gap-1.5"
            title="View Brand Assets Guidelines"
          >
            <i className="fa-solid fa-palette text-primary"></i>
            <span>Brand Assets</span>
          </a>
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="h-10 w-10 brutal-border rounded-xl flex items-center justify-center bg-background text-foreground hover:bg-accent brutal-shadow transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            title="Toggle Dark Mode"
          >
            {theme === "dark" ? (
              <i className="fa-solid fa-sun text-secondary"></i>
            ) : (
              <i className="fa-solid fa-moon text-primary"></i>
            )}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Profile Dropdown */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 brutal-border rounded-xl p-1 pr-3 bg-card hover:bg-accent transition-all brutal-shadow active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.name}
                    className="h-8 w-8 rounded-lg object-cover brutal-border"
                  />
                  <div className="text-left">
                    <p className="text-xs font-extrabold leading-none">{userProfile.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{userProfile.school}</p>
                  </div>
                  <i className={`fa-solid fa-chevron-down text-xs text-muted-foreground transition-transform duration-200 ml-1 ${isProfileOpen ? "rotate-180" : ""}`}></i>
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsProfileOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute right-0 mt-2 w-52 bg-card brutal-border rounded-xl p-1.5 brutal-shadow-amber z-30 flex flex-col gap-1 origin-top-right"
                      >
                        {/* User info header */}
                        <div className="px-3 py-2 border-b-2 border-border mb-1">
                          <p className="text-xs font-extrabold leading-none text-foreground">{userProfile.name}</p>
                          <p className="text-[10px] text-muted-foreground leading-none mt-1">{userProfile.school}</p>
                        </div>

                        {/* My Kit / Profile */}
                        <button
                          onClick={() => { handleNavClick("my-kit"); setIsProfileOpen(false); }}
                          className="w-full px-3 py-2 rounded-lg font-bold flex items-center gap-2.5 transition-all text-left hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <i className="fa-solid fa-id-card w-4 text-center text-primary"></i>
                          <span>My Profile</span>
                        </button>

                        {/* Settings */}
                        <button
                          onClick={() => { handleNavClick("settings"); setIsProfileOpen(false); }}
                          className="w-full px-3 py-2 rounded-lg font-bold flex items-center gap-2.5 transition-all text-left hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <i className="fa-solid fa-gear w-4 text-center text-primary"></i>
                          <span>Settings</span>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-border my-0.5" />

                        {/* Logout */}
                        <button
                          onClick={() => { logout(); setIsProfileOpen(false); }}
                          className="w-full px-3 py-2 rounded-lg font-bold flex items-center gap-2.5 transition-all text-left hover:bg-destructive/10 text-destructive"
                        >
                          <i className="fa-solid fa-right-from-bracket w-4 text-center"></i>
                          <span>Log out</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleNavClick("login")}
              className="brutal-btn bg-primary text-primary-foreground text-sm py-1.5 px-4"
            >
              Sign In
            </button>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          {isAuthenticated && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden h-10 w-10 brutal-border rounded-xl flex items-center justify-center bg-card text-foreground hover:bg-accent brutal-shadow transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <i className={`fa-solid ${isOpen ? "fa-xmark" : "fa-bars"}`}></i>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {isAuthenticated && isOpen && (
        <div className="md:hidden border-t-2 border-border bg-card text-foreground p-4 flex flex-col gap-2">
          {/* Primary Mobile Items */}
          {primaryItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full p-3 rounded-lg font-bold flex items-center gap-3 transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground brutal-border brutal-shadow-amber text-left"
                    : "hover:bg-accent text-left text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Secondary Mobile Items Group Header */}
          <div className="border-t border-border/60 my-1 pt-2 px-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">More Features</p>
          </div>

          {/* Secondary Mobile Items */}
          {secondaryItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full p-2.5 rounded-lg font-bold flex items-center gap-3 transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground brutal-border brutal-shadow-amber text-left"
                    : "hover:bg-accent text-left text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="border-t border-border my-2 pt-2">
            <button
              onClick={logout}
              className="w-full p-3 rounded-lg font-bold flex items-center gap-3 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all text-left"
            >
              <i className="fa-solid fa-right-from-bracket w-5 text-center"></i>
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
