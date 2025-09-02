'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  Menu, Search, Settings, Grid3X3, Edit, Inbox, Star, Send, FileText, 
  ChevronDown, Archive, Trash2, Mail, Clock, ChevronLeft, ChevronRight,
  MapPin, Check, ExternalLink, Building2, Reply, MoreVertical, Target
} from 'lucide-react';

interface JobCardProps {
  index: number;
}

// Loading component for better UX
function JobCardLoading() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <div className="h-12 bg-[#374151] rounded-lg mb-6 animate-pulse"></div>
        <div className="h-6 bg-[#374151] rounded max-w-2xl mx-auto animate-pulse"></div>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1F1F23] rounded-lg p-6 animate-pulse">
          <div className="h-8 bg-[#374151] rounded mb-4"></div>
          <div className="h-6 bg-[#374151] rounded mb-2"></div>
          <div className="h-6 bg-[#374151] rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}

export function JobCard({ index }: JobCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading delay for better UX
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  const jobs = [
    {
      title: "Frontend Developer",
      company: "Adyen",
      location: "Amsterdam, Netherlands",
      type: "Full-time",
      match: 94,
      applicants: 12,
      posted: "3 hours ago",
      logo: "A",
      logoColor: "#4285F4"
    },
    {
      title: "Junior Software Engineer", 
      company: "Spotify",
      location: "Stockholm, Sweden",
      type: "Full-time", 
      match: 87,
      applicants: 31,
      posted: "5 hours ago",
      logo: "S",
      logoColor: "#1DB954"
    },
    {
      title: "Graduate Product Analyst",
      company: "Stripe", 
      location: "Dublin, Ireland",
      type: "Graduate Program",
      match: 91,
      applicants: 47,
      posted: "1 day ago",
      logo: "S", 
      logoColor: "#635BFF"
    }
  ];

  if (!isLoaded) {
    return <JobCardLoading />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="max-w-5xl mx-auto"
    >
      <div className="text-center mb-16">
        <h2 className="text-[#F8F9FA] font-bold text-4xl lg:text-5xl mb-6 tracking-tight">
          What Gets Delivered to Your Email
        </h2>
        <p className="text-[#9CA3AF] text-xl max-w-2xl mx-auto leading-relaxed">
          <strong className="text-[#D1D5DB]">6-8 curated opportunities</strong> every 48 hours. No spam, no irrelevant jobs.<br />
          Just quality roles you can actually get.
        </p>
      </div>

      {/* Gmail Interface */}
      <div className="gmail-container max-w-4xl mx-auto">
        {/* Gmail Header Bar */}
        <div className="gmail-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-[#2D2D30] rounded-full transition-colors">
              <Menu className="w-5 h-5 text-[#E8EAED]" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#EA4335] rounded flex items-center justify-center">
                <span className="text-white font-medium text-sm">G</span>
              </div>
              <span className="text-[#E8EAED] font-medium text-lg">Gmail</span>
            </div>
          </div>
          
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9AA0A6]" />
              <input 
                type="text" 
                placeholder="Search mail"
                className="w-full bg-[#2D2D30] border-0 rounded-lg py-2 pl-10 pr-4 text-[#E8EAED] placeholder-[#9AA0A6] focus:bg-[#3C4043] focus:outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-[#2D2D30] rounded-full transition-colors">
              <Settings className="w-5 h-5 text-[#9AA0A6]" />
            </button>
            <button className="p-2 hover:bg-[#2D2D30] rounded-full transition-colors">
              <Grid3X3 className="w-5 h-5 text-[#9AA0A6]" />
            </button>
            <div className="w-8 h-8 bg-[#8AB4F8] rounded-full flex items-center justify-center ml-2">
              <span className="text-[#1F1F1F] font-medium text-sm">U</span>
            </div>
            <span className="ml-2 rounded-full border border-[#2D2D30] px-2 py-0.5 text-[11px] text-[#9AA0A6]">
              Sample preview
            </span>
          </div>
        </div>

        {/* Gmail Main Layout */}
        <div className="flex min-h-[600px]">
          {/* Gmail Sidebar */}
          <div className="gmail-sidebar p-4">
            <button className="w-full bg-[#8AB4F8] hover:bg-[#93BAF9] text-[#1F1F1F] py-3 px-6 rounded-2xl font-medium mb-6 flex items-center gap-3">
              <Edit className="w-5 h-5" />
              Compose
            </button>
            
            <nav className="space-y-1">
              <div className="flex items-center gap-3 px-4 py-2 text-[#E8EAED] bg-[#D93025]/10 rounded-r-full border-r-4 border-[#D93025]">
                <Inbox className="w-5 h-5" />
                <span className="font-medium">Inbox</span>
                <span className="ml-auto text-sm text-[#E8EAED]">12</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 text-[#9AA0A6] hover:bg-[#2D2D30] rounded-r-full cursor-pointer">
                <Star className="w-5 h-5" />
                <span>Starred</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 text-[#9AA0A6] hover:bg-[#2D2D30] rounded-r-full cursor-pointer">
                <Send className="w-5 h-5" />
                <span>Sent</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 text-[#9AA0A6] hover:bg-[#2D2D30] rounded-r-full cursor-pointer">
                <FileText className="w-5 h-5" />
                <span>Drafts</span>
              </div>
            </nav>
          </div>

          {/* Gmail Main Content */}
          <div className="flex-1 gmail-content">
            {/* Gmail Toolbar */}
            <div className="bg-[#1F1F1F] px-6 py-3 border-b border-[#2D2D30] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 rounded border-[#5F6368] bg-transparent" />
                  <button className="p-1 hover:bg-[#2D2D30] rounded">
                    <ChevronDown className="w-4 h-4 text-[#9AA0A6]" />
                  </button>
                </div>
                
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-[#2D2D30] rounded text-[#9AA0A6]">
                    <Archive className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-[#2D2D30] rounded text-[#9AA0A6]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-[#2D2D30] rounded text-[#9AA0A6]">
                    <Mail className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[#9AA0A6] text-sm">
                <span>1-50 of 1,234</span>
                <button className="p-1 hover:bg-[#2D2D30] rounded">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="p-1 hover:bg-[#2D2D30] rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Email List */}
            <div className="bg-[#1F1F1F]">
              {/* Other emails */}
              <div className="gmail-email-item flex items-center gap-4">
                <input type="checkbox" className="w-4 h-4 rounded border-[#5F6368] bg-transparent" />
                <Star className="w-4 h-4 text-[#9AA0A6]" />
                <div className="w-8 h-8 bg-[#34A853] rounded-full flex items-center justify-center text-white text-sm font-medium">L</div>
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[#E8EAED] font-medium w-48 truncate">LinkedIn</span>
                    <span className="text-[#9AA0A6] truncate">You have 5 new connection requests</span>
                  </div>
                  <span className="text-[#9AA0A6] text-sm">2:30 PM</span>
                </div>
              </div>
              
              {/* JobPing Email (Selected) */}
              <div className="gmail-email-item selected flex items-center gap-4">
                <input type="checkbox" className="w-4 h-4 rounded border-[#5F6368] bg-transparent checked:bg-[#8AB4F8]" defaultChecked />
                <Star className="w-4 h-4 text-[#FBBC04]" />
                <div className="w-8 h-8 bg-[#4285F4] rounded-full flex items-center justify-center text-white text-sm font-medium">J</div>
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[#E8EAED] font-medium w-48 truncate">JobPing Daily</span>
                    <span className="text-[#E8EAED] truncate font-medium">🎯 Your AI-Matched Jobs for {new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#EA4335] text-white text-xs px-2 py-1 rounded-full">New</span>
                    <span className="text-[#E8EAED] text-sm">8:00 AM</span>
                  </div>
                </div>
              </div>
              
              {/* More emails */}
              <div className="gmail-email-item flex items-center gap-4">
                <input type="checkbox" className="w-4 h-4 rounded border-[#5F6368] bg-transparent" />
                <Star className="w-4 h-4 text-[#9AA0A6]" />
                <div className="w-8 h-8 bg-[#FF6D01] rounded-full flex items-center justify-center text-white text-sm font-medium">S</div>
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[#9AA0A6] font-normal w-48 truncate">Spotify</span>
                    <span className="text-[#9AA0A6] truncate">Your weekly music summary is ready</span>
                  </div>
                  <span className="text-[#9AA0A6] text-sm">Yesterday</span>
                </div>
              </div>
            </div>

            {/* Selected Email Content */}
            <div className="bg-[#1F1F1F] p-6 border-t border-[#2D2D30]">
              {/* Email Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-[#E8EAED] text-2xl font-normal mb-2">
                      🎯 Your AI-Matched Jobs for {new Date().toLocaleDateString()}
                    </h1>
                    <div className="flex items-center gap-2 text-[#9AA0A6] text-sm">
                      <span className="bg-[#EA4335] text-white px-2 py-1 rounded text-xs">Important</span>
                      <span className="bg-[#34A853] text-white px-2 py-1 rounded text-xs">Category: Updates</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-[#2D2D30] rounded text-[#9AA0A6]">
                      <Star className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-[#2D2D30] rounded text-[#9AA0A6]">
                      <Reply className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-[#2D2D30] rounded text-[#9AA0A6]">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Sender Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#4285F4] rounded-full flex items-center justify-center text-white font-medium">J</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#E8EAED] font-medium">JobPing Daily</span>
                      <span className="text-[#9AA0A6] text-sm">&lt;jobs@jobping.ai&gt;</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#9AA0A6] text-sm">
                      <span>to me</span>
                      <button className="hover:underline">show details</button>
                    </div>
                  </div>
                  <div className="ml-auto text-[#9AA0A6] text-sm">
                    Today, 8:00 AM
                  </div>
                </div>
              </div>
              
              {/* Email Body */}
              <div className="text-[#E8EAED] leading-relaxed">
                <p className="mb-6 text-base">Good morning! 👋</p>
                <p className="mb-6 text-base">
                  Your AI assistant has analyzed 2,847 new job postings overnight and found these perfect matches for your profile:
                </p>
                
                {/* Job Cards */}
                <div className="space-y-6 mb-8">
                  {jobs.map((job, jobIndex) => (
                    <div key={jobIndex} className="job-card-email">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                            style={{ backgroundColor: job.logoColor }}
                          >
                            {job.logo}
                          </div>
                          <div>
                            <h3 className="text-[#E8EAED] font-semibold text-lg mb-1">{job.title}</h3>
                            <p className="text-[#9AA0A6] font-medium">{job.company} • {job.location.split(',')[0]}</p>
                          </div>
                        </div>
                        <div className="job-match-badge">
                          {job.match}% match
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 mb-4 text-sm text-[#9AA0A6]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1 text-[#34A853]">
                          <Check className="w-4 h-4" />
                          Visa sponsored
                        </span>
                      </div>
                      
                      <div className="bg-[#1F1F1F] rounded-lg p-4 mb-4 border-l-4" style={{ borderColor: job.logoColor }}>
                        <p className="text-[#E8EAED] text-sm leading-relaxed">
                          <span className="font-semibold" style={{ color: job.logoColor }}>🎯 Why this matches you:</span> This role perfectly aligns with your React and TypeScript expertise. {job.company} is known for hiring international talent and offers comprehensive visa support.
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <a 
                          href="#" 
                          className="px-8 py-3 rounded-lg font-bold text-lg transition-all duration-200 inline-flex items-center gap-2 text-white hover:transform hover:scale-105 shadow-lg hover:shadow-xl"
                          style={{ backgroundColor: job.logoColor }}
                        >
                          🚀 APPLY NOW
                          <ExternalLink className="w-5 h-5" />
                        </a>
                        <div className="text-xs text-[#9AA0A6] space-x-4">
                          <span className="text-[#FBBC04] font-medium bg-[#FBBC04]/10 px-2 py-1 rounded-full">
                            ⚡ Only {job.applicants} applied
                          </span>
                          <span className="text-[#10B981]">
                            ⏰ {job.posted}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Email Footer */}
                <div className="border-t border-[#2D2D30] pt-6">
                  <p className="text-[#9AA0A6] text-sm mb-4">
                    💡 <strong>AI Insight:</strong> These companies have historically hired candidates with your profile. Apply early for the best chance of success.
                  </p>
                  
                  <p className="text-[#9AA0A6] text-sm mb-4">
                    Want to adjust your preferences? Simply reply to this email with your feedback.
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-[#9AA0A6]">Best regards,</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-[#E8EAED] font-medium">The JobPing AI Team</span>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-[#2D2D30] text-xs text-[#9AA0A6]">
                    <p>This email was sent to you because you subscribed to JobPing AI job alerts.</p>
                    <p className="mt-2">
                      <a href="#" className="text-[#8AB4F8] hover:underline">Unsubscribe</a> • 
                      <a href="#" className="text-[#8AB4F8] hover:underline ml-2">Update preferences</a> • 
                      <a href="#" className="text-[#8AB4F8] hover:underline ml-2">Privacy policy</a>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Gmail Reply Box */}
              <div className="mt-8 pt-6 border-t border-[#2D2D30]">
                <div className="flex items-center gap-4">
                  <button className="bg-[#8AB4F8] hover:bg-[#93BAF9] text-[#1F1F1F] px-6 py-2 rounded-2xl font-medium flex items-center gap-2">
                    <Reply className="w-4 h-4" />
                    Reply
                  </button>
                  <button className="text-[#9AA0A6] hover:text-[#E8EAED] px-4 py-2 rounded-lg hover:bg-[#2D2D30] transition-colors">
                    Forward
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}