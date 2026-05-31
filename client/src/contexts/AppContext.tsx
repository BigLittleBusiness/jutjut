import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

// Define Types
export interface UserProfile {
  name: string;
  email: string;
  school: string;
  isVerified: boolean;
  avatar: string;
  vouchedBy: Array<{ name: string; role: string; status: "verified" | "pending" }>;
  achievements: Array<{ title: string; detail: string; verified: boolean; verifier?: string }>;
  certs: Array<{ name: string; issuer: string; connected: boolean }>;
  gradesVerified: boolean;
  sportsVerified: boolean;
  clubVerified: boolean;
}

export type JobCategory = "Tutoring" | "Hospitality" | "Retail" | "Library & Admin" | "Digital & Remote";

export interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  radius: number; // in km
  wage: number; // hourly rate
  timing: "evenings" | "weekends" | "flexible";
  noCoverLetter: boolean;
  neuroFriendly: boolean;
  category: JobCategory;
  description: string;
  simplifiedDescription: string;
}

export interface Drop {
  id: string;
  title: string;
  offer: string;
  code: string;
  countdown: string;
  isActive: boolean;
  date: string;
  redemptionCount: number;
  isClaimed?: boolean;
}

export interface Message {
  id: string;
  sender: { name: string; role: string; avatar: string; isSelf: boolean };
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  participant: { name: string; role: string; avatar: string; online: boolean };
  lastMessage: string;
  unread: boolean;
  messages: Message[];
}

interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => void;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  
  // Jobs
  jobs: Job[];
  applyToJob: (jobId: string) => void;
  
  // Drops
  drops: Drop[];
  claimDrop: (dropId: string) => void;
  createDrop: (newDrop: Omit<Drop, "id" | "redemptionCount" | "isActive" | "isClaimed" | "countdown">) => void;
  
  // Chat/Messages
  conversations: Conversation[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  sendMessage: (chatId: string, text: string) => void;
  
  // Accessibility / Your Way Settings
  quietMode: boolean;
  setQuietMode: (val: boolean) => void;
  taskBreakdown: boolean;
  setTaskBreakdown: (val: boolean) => void;
  simplifyJobs: boolean;
  setSimplifyJobs: (val: boolean) => void;

  // Anonymous Avatar Setting
  anonymousAvatarSetting: "question" | "fox" | "unicorn" | "alien";
  setAnonymousAvatarSetting: (val: "question" | "fox" | "unicorn" | "alien") => void;

  // Selected Kit User (for viewing others' profiles)
  selectedKitUser: UserProfile | null;
  setSelectedKitUser: (profile: UserProfile | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("jutjut_auth") === "true";
  });

  // Your Way Preferences
  const [quietMode, setQuietMode] = useState<boolean>(() => {
    return localStorage.getItem("jutjut_quiet") === "true";
  });
  const [taskBreakdown, setTaskBreakdown] = useState<boolean>(() => {
    return localStorage.getItem("jutjut_task_breakdown") === "true";
  });
  const [simplifyJobs, setSimplifyJobs] = useState<boolean>(() => {
    return localStorage.getItem("jutjut_simplify_jobs") === "true";
  });

  // Anonymous Avatar Setting state
  const [anonymousAvatarSetting, setAnonymousAvatarSetting] = useState<"question" | "fox" | "unicorn" | "alien">(() => {
    return (localStorage.getItem("jutjut_anon_avatar") as any) || "question";
  });

  // Selected Kit User state
  const [selectedKitUser, setSelectedKitUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    localStorage.setItem("jutjut_anon_avatar", anonymousAvatarSetting);
  }, [anonymousAvatarSetting]);

  // Apply Quiet Mode Class to body
  useEffect(() => {
    if (quietMode) {
      document.body.classList.add("quiet-mode");
    } else {
      document.body.classList.remove("quiet-mode");
    }
    localStorage.setItem("jutjut_quiet", quietMode.toString());
  }, [quietMode]);

  useEffect(() => {
    localStorage.setItem("jutjut_task_breakdown", taskBreakdown.toString());
  }, [taskBreakdown]);

  useEffect(() => {
    localStorage.setItem("jutjut_simplify_jobs", simplifyJobs.toString());
  }, [simplifyJobs]);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Alex Mercer",
    email: "alex.mercer@school.edu",
    school: "West High School",
    isVerified: true,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    vouchedBy: [
      { name: "Coach Harris", role: "Basketball Coach", status: "verified" },
      { name: "Mrs. Gable", role: "Chemistry Teacher", status: "pending" }
    ],
    achievements: [
      { title: "State Basketball Championship", detail: "Scored 24 points in final game to win state squad trophy", verified: true, verifier: "Coach Harris" },
      { title: "100m Athletics Sprint", detail: "Finished 1st place with 11.2s race time", verified: false }
    ],
    certs: [
      { name: "Google Analytics Certification", issuer: "Google", connected: false },
      { name: "HubSpot Inbound Marketing", issuer: "HubSpot", connected: false }
    ],
    gradesVerified: false,
    sportsVerified: true,
    clubVerified: false
  });

  // Mock Jobs
  const [jobs] = useState<Job[]>([
    {
      id: "job-1",
      title: "Specialist Tutor (Math & Physics)",
      company: "Apex Tutoring",
      logo: "🎓",
      location: "Downtown (2.5 km)",
      radius: 2.5,
      wage: 28,
      timing: "weekends",
      noCoverLetter: true,
      neuroFriendly: true,
      category: "Tutoring" as const,
      description: "Looking for an enthusiastic tutor to help Year 9-10 students with Math and Physics. Requires good communication and solid high school grade records. We offer training materials and pre-designed lessons to take the pressure off.",
      simplifiedDescription: "Help younger students with high school Math and Physics. We give you all the lessons and worksheets. You just need to show up, explain things simply, and support them. Perfect for weekends."
    },
    {
      id: "job-2",
      title: "Barista & Cafe Assistant",
      company: "Teal Mug Specialty Coffee",
      logo: "☕",
      location: "Metro Station (1.2 km)",
      radius: 1.2,
      wage: 19,
      timing: "flexible",
      noCoverLetter: true,
      neuroFriendly: false,
      category: "Hospitality" as const,
      description: "Join our busy cafe team! Learn specialty espresso brewing, customer service, and food handling. Must be reliable, quick on your feet, and love morning energy.",
      simplifiedDescription: "Make coffee, serve pastries, and chat with customers in a friendly, fast cafe. No experience needed—we will train you how to brew perfect espresso."
    },
    {
      id: "job-3",
      title: "Weekend Retail Associate",
      company: "Retro & Thrift Apparel",
      logo: "👕",
      location: "Fashion District (4.0 km)",
      radius: 4.0,
      wage: 18,
      timing: "weekends",
      noCoverLetter: false,
      neuroFriendly: true,
      category: "Retail" as const,
      description: "Help customers find unique vintage styles, organize clothing racks, and manage cash registers. We value a quiet, highly organized, and structured work environment where attention to visual detail is appreciated.",
      simplifiedDescription: "Work at a cool vintage clothing shop. Help keep clothes neat, assist customers when they ask, and checkout sales. The shop has a calm, structured routine."
    },
    {
      id: "job-4",
      title: "Evening Library Helper",
      company: "Community Library Services",
      logo: "📚",
      location: "Civic Center (0.8 km)",
      radius: 0.8,
      wage: 17,
      timing: "evenings",
      noCoverLetter: true,
      neuroFriendly: true,
      category: "Library & Admin" as const,
      description: "Quiet evening role. Sort returned books, update database catalogs, and maintain shelf organization. Ideal for detail-oriented individuals who thrive in peaceful, low-sensory environments.",
      simplifiedDescription: "A peaceful evening job sorting and organizing library books. Very quiet environment, repetitive structured tasks, and almost zero high-pressure situations."
    },
    {
      id: "job-5",
      title: "Social Media Content Assistant",
      company: "Launchpad Marketing Agency",
      logo: "📱",
      location: "Remote",
      radius: 0,
      wage: 22,
      timing: "flexible",
      noCoverLetter: true,
      neuroFriendly: false,
      category: "Digital & Remote" as const,
      description: "Help schedule TikTok and Instagram posts, draft captions, and research trending meme audios. Must be active on social media and understand current Gen-Z humor.",
      simplifiedDescription: "Create and schedule social media posts from home. Help find funny trends, write short captions, and monitor comments. Fully remote and highly flexible."
    }
  ]);

  // Mock Drops
  const [drops, setDrops] = useState<Drop[]>([
    {
      id: "drop-1",
      title: "Chipotle Burrito Feast",
      offer: "50% off burrito at Chipotle",
      code: "STEP50",
      countdown: "14:25:08",
      isActive: true,
      date: "Active Now",
      redemptionCount: 1482
    },
    {
      id: "drop-2",
      title: "Spotify Student Promo",
      offer: "3 Months Spotify Premium Free",
      code: "STEP3FREE",
      countdown: "Starts Tuesday 12pm",
      isActive: false,
      date: "May 28, 2026",
      redemptionCount: 0
    },
    {
      id: "drop-3",
      title: "Boost Juice Special",
      offer: "Free Boost Juice Booster Upgrade",
      code: "BOOSTSTEP",
      countdown: "Expired",
      isActive: false,
      date: "May 19, 2026",
      redemptionCount: 342,
      isClaimed: true
    },
    {
      id: "drop-4",
      title: "Chatime Bubble Tea",
      offer: "Buy 1 Get 1 Free on all milk teas",
      code: "BOBASTEP",
      countdown: "Expired",
      isActive: false,
      date: "May 12, 2026",
      redemptionCount: 891,
      isClaimed: false
    }
  ]);

  // Mock Conversations
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "chat-1",
      participant: { name: "Coach Harris", role: "Basketball Coach", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80", online: true },
      lastMessage: "Vouch is completed, good luck with the jobs!",
      unread: false,
      messages: [
        { id: "m1", sender: { name: "Alex Mercer", role: "Student", avatar: "", isSelf: true }, text: "Hey Coach, can you vouch for my basketball achievements on JutJut?", timestamp: "Yesterday, 4:15 PM" },
        { id: "m2", sender: { name: "Coach Harris", role: "Coach", avatar: "", isSelf: false }, text: "Absolutely Alex! I've approved your state squad record. Vouch is completed, good luck with the jobs!", timestamp: "Yesterday, 5:30 PM" }
      ]
    },
    {
      id: "chat-2",
      participant: { name: "Teal Mug Specialty Coffee", role: "Employer", avatar: "☕", online: false },
      lastMessage: "Hi Alex, we reviewed your Kit and loved your coach's vouch.",
      unread: true,
      messages: [
        { id: "m3", sender: { name: "Teal Mug Specialty Coffee", role: "Employer", avatar: "", isSelf: false }, text: "Hi Alex, we reviewed your Kit and loved your coach's vouch. Are you available for a quick chat this Thursday afternoon?", timestamp: "Today, 10:11 AM" }
      ]
    },
    {
      id: "chat-3",
      participant: { name: "Mrs. Gable", role: "Chemistry Teacher", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80", online: true },
      lastMessage: "I'll review your vouch request tonight after school.",
      unread: false,
      messages: [
        { id: "m4", sender: { name: "Alex Mercer", role: "Student", avatar: "", isSelf: true }, text: "Hello Mrs. Gable, I submitted a request to verify my chemistry project.", timestamp: "2 days ago" },
        { id: "m5", sender: { name: "Mrs. Gable", role: "Teacher", avatar: "", isSelf: false }, text: "I'll review your vouch request tonight after school.", timestamp: "2 days ago" }
      ]
    }
  ]);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Authentication Handlers
  const login = (email: string) => {
    setIsAuthenticated(true);
    localStorage.setItem("jutjut_auth", "true");
    setUserProfile(prev => ({ ...prev, email }));
    toast.success("Successfully logged in to JutJut!");
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem("jutjut_auth", "false");
    toast.info("Logged out of JutJut.");
  };

  // Job Board Handler
  const applyToJob = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      toast.success(`Application sent! Your Kit has been shared with ${job.company}.`);
    }
  };

  // Drop Handlers
  const claimDrop = (dropId: string) => {
    setDrops(prev => prev.map(d => {
      if (d.id === dropId) {
        toast.success(`Claimed! Show code "${d.code}" at store to redeem.`);
        return { ...d, isClaimed: true, redemptionCount: d.redemptionCount + 1 };
      }
      return d;
    }));
  };

  const createDrop = (newDrop: Omit<Drop, "id" | "redemptionCount" | "isActive" | "isClaimed" | "countdown">) => {
    const formattedDrop: Drop = {
      ...newDrop,
      id: `drop-${Date.now()}`,
      isActive: false,
      isClaimed: false,
      countdown: "Starts in 2 Weeks",
      redemptionCount: 0
    };
    setDrops(prev => [...prev, formattedDrop]);
    toast.success("Drop submitted for approval! It will undergo our 2-week lead time review.");
  };

  // Messaging Handler
  const sendMessage = (chatId: string, text: string) => {
    // Guardrail: No image sharing or media link simulations
    if (text.toLowerCase().includes(".jpg") || text.toLowerCase().includes(".png") || text.toLowerCase().includes("http") || text.toLowerCase().includes("image")) {
      toast.error("Security Alert: Image and external link sharing is disabled for student safety.");
      return;
    }

    setConversations(prev => prev.map(c => {
      if (c.id === chatId) {
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          sender: { name: userProfile.name, role: "Student", avatar: userProfile.avatar, isSelf: true },
          text,
          timestamp: "Just now"
        };
        return {
          ...c,
          lastMessage: text,
          unread: false,
          messages: [...c.messages, newMessage]
        };
      }
      return c;
    }));
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated, login, logout, userProfile, setUserProfile,
      jobs, applyToJob,
      drops, claimDrop, createDrop,
      conversations, activeChatId, setActiveChatId, sendMessage,
      quietMode, setQuietMode, taskBreakdown, setTaskBreakdown, simplifyJobs, setSimplifyJobs,
      anonymousAvatarSetting, setAnonymousAvatarSetting,
      selectedKitUser, setSelectedKitUser
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
