import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Company, Contact } from '../types';
import { 
  Building2, Globe, Tag, Search, Plus, Trash2, Edit2, 
  X, Check, Users, FileText, ClipboardList, Info
} from 'lucide-react';
import { useToast } from './Toast';

interface CompanyManagerProps {
  companies: Company[];
  contacts: Contact[];
  onAddCompany: (company: Company) => void;
  onUpdateCompany: (company: Company) => void;
  onDeleteCompany: (id: string) => void;
  triggerAdd?: number;
}

export default function CompanyManager({
  companies,
  contacts,
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
  triggerAdd
}: CompanyManagerProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    companies.length > 0 ? companies[0].id : null
  );
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [historicalData, setHistoricalData] = useState('');

  // Search filter
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const searchString = `${c.name} ${c.industry || ''} ${c.description || ''}`.toLowerCase();
      return searchString.includes(searchTerm.toLowerCase());
    });
  }, [companies, searchTerm]);

  // Set default selection if current one is invalid
  useEffect(() => {
    if (companies.length > 0 && (!selectedCompanyId || !companies.some(c => c.id === selectedCompanyId))) {
      setSelectedCompanyId(companies[0].id);
    } else if (companies.length === 0) {
      setSelectedCompanyId(null);
    }
  }, [companies, selectedCompanyId]);

  // Trigger add from external header button
  useEffect(() => {
    if (triggerAdd && triggerAdd > 0) {
      startAdd();
    }
  }, [triggerAdd]);

  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  // Find contacts linked to this company
  const companyContacts = useMemo(() => {
    if (!selectedCompanyId) return [];
    return contacts.filter(c => c.companyId === selectedCompanyId || c.company.toLowerCase() === selectedCompany?.name.toLowerCase());
  }, [contacts, selectedCompanyId, selectedCompany]);

  const resetForm = () => {
    setName('');
    setIndustry('');
    setWebsite('');
    setDescription('');
    setHistoricalData('');
  };

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
  };

  const startEdit = (c: Company) => {
    setName(c.name);
    setIndustry(c.industry || '');
    setWebsite(c.website || '');
    setDescription(c.description || '');
    setHistoricalData(c.historicalData || '');
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Company Name is required', 'error');
      return;
    }

    if (isAdding) {
      const newCompany: Company = {
        id: 'cp_' + Date.now(),
        name: name.trim(),
        industry: industry.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        historicalData: historicalData.trim() || undefined
      };
      onAddCompany(newCompany);
      setSelectedCompanyId(newCompany.id);
      setIsAdding(false);
      showToast(`Company "${newCompany.name}" created`, 'success');
    } else if (isEditing && selectedCompanyId) {
      const updatedCompany: Company = {
        id: selectedCompanyId,
        name: name.trim(),
        industry: industry.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        historicalData: historicalData.trim() || undefined
      };
      onUpdateCompany(updatedCompany);
      setIsEditing(false);
      showToast(`Company "${updatedCompany.name}" updated`, 'success');
    }
  };

  const executeDelete = (id: string) => {
    const comp = companies.find(c => c.id === id);
    onDeleteCompany(id);
    const remaining = companies.filter(c => c.id !== id);
    setSelectedCompanyId(remaining.length > 0 ? remaining[0].id : null);
    setDeleteConfirmId(null);
    showToast(`Deleted company "${comp?.name || ''}"`, 'info');
  };

  return (
    <div id="company-manager-stage" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: List & Search */}
      <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_22px_-5px_rgba(15,34,64,0.04)] overflow-hidden flex flex-col h-[calc(100vh-140px)] lg:h-[720px]">
        {/* Search Header */}
        <div className="p-5 border-b border-slate-100 space-y-3.5 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              Companies Database
            </h3>
            <button
              onClick={startAdd}
              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
              title="Add New Company"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search companies by name/industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 transition"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400 italic">No companies found</p>
            </div>
          ) : (
            filteredCompanies.map(c => {
              const isActive = selectedCompanyId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCompanyId(c.id);
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 ${
                    isActive 
                      ? 'bg-slate-900 text-white border-slate-950 shadow-md shadow-slate-950/20 translate-x-0.5' 
                      : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                    <Building2 size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold truncate leading-snug">{c.name}</h4>
                    {c.industry && (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isActive ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {c.industry}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Details / Forms */}
      <div className="lg:col-span-8 h-auto lg:h-[720px] flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* ADDING / EDITING FORM */}
          {(isAdding || isEditing) ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_22px_-5px_rgba(15,34,64,0.04)] p-6 space-y-5 flex-1 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800">
                  {isAdding ? 'Register New Company' : `Update ${name}`}
                </h3>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Industry Sector</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Technology, Finance, Health"
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="e.g. www.acme.com"
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Company Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description of the company operations, products, or services..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Historical Data & Context</label>
                  <textarea
                    value={historicalData}
                    onChange={(e) => setHistoricalData(e.target.value)}
                    placeholder="Record notes on negotiation timelines, past issues, sales pipeline history, or long-term alignment context..."
                    rows={6}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 resize-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 animate-glow-border"
                  >
                    <Check size={14} />
                    Save Company
                  </button>
                </div>
              </form>
            </motion.div>
          ) : selectedCompany ? (
            
            /* COMPANY DETAILS PANEL */
            <motion.div
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_22px_-5px_rgba(15,34,64,0.04)] p-6 space-y-6 flex-1 overflow-y-auto"
            >
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-600 shrink-0">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{selectedCompany.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCompany.industry && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          {selectedCompany.industry}
                        </span>
                      )}
                      {selectedCompany.website && (
                        <a
                          href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition"
                        >
                          <Globe size={11} />
                          {selectedCompany.website}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(selectedCompany)}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-600 rounded-xl transition flex items-center justify-center"
                    title="Edit Company"
                  >
                    <Edit2 size={15} />
                  </button>
                  {deleteConfirmId === selectedCompany.id ? (
                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-xl p-1 animate-pulse">
                      <button
                        onClick={() => executeDelete(selectedCompany.id)}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[10px] transition"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(selectedCompany.id)}
                      className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-200/50 text-red-600 rounded-xl transition flex items-center justify-center"
                      title="Delete Company"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedCompany.description && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Overview</h4>
                  <p className="text-xs text-slate-650 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    {selectedCompany.description}
                  </p>
                </div>
              )}

              {/* Historical Logs */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <FileText size={12} className="text-slate-400" />
                  Historical Data & Records
                </h4>
                {selectedCompany.historicalData ? (
                  <div className="bg-slate-900 border border-slate-950 p-5 rounded-2xl text-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner max-h-[220px] overflow-y-auto">
                    {selectedCompany.historicalData}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center italic text-xs text-slate-400">
                    No historical logs captured. Click edit to add organizational context.
                  </div>
                )}
              </div>

              {/* Attached Contacts Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Users size={12} className="text-slate-400" />
                  Linked Contacts ({companyContacts.length})
                </h4>
                {companyContacts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                    No contacts are currently linked to this company. Update a contact's company to link them.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {companyContacts.map(con => (
                      <div key={con.id} className="p-3 bg-white hover:bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between transition-colors shadow-2xs">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{con.name}</p>
                          <p className="text-[10px] text-slate-450 truncate mt-0.5">{con.position}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                          con.relationStatus === 'Warm' ? 'bg-amber-50 text-amber-600' :
                          con.relationStatus === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                          con.relationStatus === 'Cold' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {con.relationStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* BLANK STATE */
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_22px_-5px_rgba(15,34,64,0.04)] p-12 text-center flex-1 flex flex-col justify-center items-center">
              <Building2 size={40} className="text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700">No Company Selected</h3>
              <p className="text-slate-400 text-xs max-w-xs mt-1 mb-6">Select a company from the left column database or register a new client company context.</p>
              <button
                onClick={startAdd}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} /> Register New Company
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
