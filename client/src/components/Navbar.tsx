import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { isAuthenticated, logout, userProfile } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "fa-house" },
    { id: "my-kit", label: "My Kit", icon: "fa-briefcase" },
    { id: "jobs", label: "Job Board", icon: "fa-clipboard-list" },
    { id: "drops", label: "The Drop", icon: "fa-fire" },
    { id: "university", label: "Uni Portal", icon: "fa-graduation-cap" },
    { id: "your-way", label: "Your Way", icon: "fa-sliders" },
  ];

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
          <div className="hidden md:flex items-center gap-3">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
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
              {/* Profile Shortcut */}
              <button
                onClick={() => handleNavClick("my-kit")}
                className="hidden sm:flex items-center gap-2 brutal-border rounded-xl p-1 pr-3 bg-card hover:bg-accent transition-all brutal-shadow active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
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
              </button>

              {/* Logout */}
              <button
                onClick={logout}
                className="h-10 px-3 brutal-border rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-sm brutal-shadow transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hidden md:flex items-center gap-1"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Log out</span>
              </button>
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
          {navItems.map((item) => {
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
