import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MyselfProfile, Company, Contact, RelationshipStatus } from '../types';
import { 
  User, Building2, Users, Calendar, Sparkles, ArrowRight, ArrowLeft, Check, Play
} from 'lucide-react';
import { useToast } from './Toast';

interface GuidedSetupProps {
  profile: MyselfProfile;
  onUpdateProfile: (profile: MyselfProfile) => void;
  onAddCompany: (company: Company) => void;
  onAddContact: (contact: Contact) => void;
  onComplete: () => void;
}

export default function GuidedSetup({
  profile,
  onUpdateProfile,
  onAddCompany,
  onAddContact,
  onComplete
}: GuidedSetupProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1: Profile
  const [userName, setUserName] = useState('');
  const [userTitle, setUserTitle] = useState('');
  const [userCompany, setUserCompany] = useState('');
  const [userPersonality, setUserPersonality] = useState('Pragmatic, action-oriented advisor');
  const [userCommunication, setUserCommunication] = useState('Concise and direct');
  const [userGoals, setUserGoals] = useState('Scale strategic partnerships');

  // Step 2: Company
  const [compName, setCompName] = useState('');
  const [compIndustry, setCompIndustry] = useState('');
  const [compWebsite, setCompWebsite] = useState('');
  const [compDesc, setCompDesc] = useState('');

  // Step 3: Contact
  const [conName, setConName] = useState('');
  const [conPosition, setConPosition] = useState('');
  const [conEmail, setConEmail] = useState('');

  const nextStep = () => {
    if (step === 1) {
      if (!userName.trim() || !userTitle.trim() || !userCompany.trim()) {
        showToast('Please fill out Name, Position, and Company', 'warning');
        return;
      }
      // Update profile
      onUpdateProfile({
        name: userName.trim(),
        position: userTitle.trim(),
        company: userCompany.trim(),
        personality: userPersonality.trim(),
        coreStrengths: 'Strategic planning, negotiation support',
        communicationStyle: userCommunication.trim(),
        careerGoals: userGoals.trim()
      });
    }

    if (step === 2) {
      if (!compName.trim()) {
        showToast('Please provide a Company name to establish your first client company', 'warning');
        return;
      }
      // Create company
      const companyId = 'cp_setup';
      onAddCompany({
        id: companyId,
        name: compName.trim(),
        industry: compIndustry.trim() || undefined,
        website: compWebsite.trim() || undefined,
        description: compDesc.trim() || undefined,
        historicalData: 'Created during guided onboarding setup.'
      });
    }

    if (step === 3) {
      if (!conName.trim() || !conPosition.trim()) {
        showToast('Please provide Contact Name and Position', 'warning');
        return;
      }
      // Create contact
      onAddContact({
        id: 'c_setup',
        name: conName.trim(),
        position: conPosition.trim(),
        company: compName.trim() || 'Setup Client',
        companyId: 'cp_setup',
        email: conEmail.trim(),
        relationStatus: 'Active',
        affiliation: 'External',
        status: 'Good',
        tags: ['Key Stakeholder']
      });
    }

    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const finishSetup = () => {
    onComplete();
    showToast('Setup completed successfully! Welcome to Lumina.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 overflow-hidden flex flex-col justify-between min-h-[460px] animate-glow-border"
      >
        
        {/* Onboarding Wizard Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Welcome Onboarding</h2>
              <p className="text-[10px] text-slate-500">Configure your business advisory environment</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 border border-slate-200/50 px-2 py-1 rounded-md">
            Step {step} of 4
          </span>
        </div>

        {/* Wizard Form steps content */}
        <div className="flex-1 mb-8">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Personal Profile */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 font-mono">
                  <User size={14} /> Profile Parameters
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Title / Role *</label>
                    <input
                      type="text"
                      value={userTitle}
                      onChange={(e) => setUserTitle(e.target.value)}
                      placeholder="e.g. Senior Partner"
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Business / Company Name *</label>
                  <input
                    type="text"
                    value={userCompany}
                    onChange={(e) => setUserCompany(e.target.value)}
                    placeholder="e.g. Acme Advisory Partners"
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Advisory Style / Personality</label>
                    <input
                      type="text"
                      value={userPersonality}
                      onChange={(e) => setUserPersonality(e.target.value)}
                      placeholder="e.g. Analytical, pragmatic"
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Communication Style</label>
                    <input
                      type="text"
                      value={userCommunication}
                      onChange={(e) => setUserCommunication(e.target.value)}
                      placeholder="e.g. Direct and evidence-based"
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: First Company */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 font-mono">
                  <Building2 size={14} /> Register First Business Partner
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      placeholder="e.g. TechCorp Solutions"
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Industry Sector</label>
                    <input
                      type="text"
                      value={compIndustry}
                      onChange={(e) => setCompIndustry(e.target.value)}
                      placeholder="e.g. Technology, Retail"
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Description</label>
                  <textarea
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    placeholder="Briefly describe what this company does..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 resize-none font-sans"
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 3: First Lead Contact */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 font-mono">
                  <Users size={14} /> Add First Lead Contact at {compName || 'Selected Company'}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Full Name *</label>
                    <input
                      type="text"
                      value={conName}
                      onChange={(e) => setConName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Position / Title *</label>
                    <input
                      type="text"
                      value={conPosition}
                      onChange={(e) => setConPosition(e.target.value)}
                      placeholder="e.g. Director of Product"
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={conEmail}
                    onChange={(e) => setConEmail(e.target.value)}
                    placeholder="e.g. sarah@techcorp.com"
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 4: Tutorial and Finish */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 font-mono">
                  <Play size={14} /> Ready to Scale!
                </div>
                
                <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4.5 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-800">Quick Tips for Getting Started:</h4>
                  
                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      <strong>AI Meeting Transcriber</strong>: Click "Record Meeting" on the Meeting Notes tab to transcribe conversations. Make sure your sessions are at least 30 seconds long.
                    </p>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      <strong>AI Advisor Blueprints</strong>: Head to the AI Advisor tab, choose a blueprint (like Meeting Prep or Friction & Redline), and let the AI generate customized advice briefs.
                    </p>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      <strong>SOP Reference Repository</strong>: Upload standard documentation to the SOPs tab. The AI Advisor automatically cross-references these rules when making plans.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="flex items-center gap-1 text-xs font-bold text-slate-650 hover:text-slate-800 transition"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/10"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={finishSetup}
              className="flex items-center gap-1 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/10"
            >
              Finish Setup & Start <Check size={14} />
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
}
