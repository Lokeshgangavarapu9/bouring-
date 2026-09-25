import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import {
  ZODIAC_MOLECULE_LIST,
  DEFAULT_MOLECULE,
  getMoleculeIdentity,
  MoleculeIdentityId,
} from '../components/molecule/moleculeIdentities';
import { SingleMoleculePreview } from '../components/molecule/SingleMoleculePreview';
import {
  Sparkles,
  Check,
  CheckCircle2,
  RotateCcw,
  Boxes,
  Compass,
} from 'lucide-react';

export const MoleculePage: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();
  const { refreshNetworkData } = useNetwork();

  // Authoritative molecule identity saved on user profile
  const savedIdentityId = (currentUser?.moleculeIdentity as MoleculeIdentityId) || 'default';

  // Selection state
  const [selectedId, setSelectedId] = useState<MoleculeIdentityId>(savedIdentityId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedIdentity = getMoleculeIdentity(selectedId);
  const isDirty = selectedId !== savedIdentityId;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        moleculeIdentity: selectedId,
      });
      await refreshNetworkData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = () => {
    setSelectedId(savedIdentityId);
  };

  const ALL_MOLECULES = [DEFAULT_MOLECULE, ...ZODIAC_MOLECULE_LIST];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification on Save */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-slate-900 px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Your personal molecular identity is saved as {selectedIdentity.name}.</span>
        </div>
      )}

      {/* Header Card (Consistent with Profile/People/Requests UI Language) */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>Personal Identity</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-slate-900 tracking-tight">
              Molecular Avatar
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              What molecule represents you? Your molecular avatar is your personal 3D identity in the Boring social network.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <Link
              to="/3d-lab"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <Boxes className="h-3.5 w-3.5 text-indigo-600" />
              <span>View in 3D Lab</span>
            </Link>

            {isDirty && (
              <button
                type="button"
                onClick={handleRevert}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="Revert to current molecule"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Revert</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all shadow-xs ${
                isDirty
                  ? 'bg-slate-900 text-white hover:bg-slate-800 ring-2 ring-indigo-400/40 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : isDirty ? 'Save Avatar' : 'Saved'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Area: Left Selection + Main 3D Molecule Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDE: Molecular Identity Selection & List */}
        <div className="lg:col-span-5 xl:col-span-4 glass-panel rounded-3xl p-5 border border-slate-200/80 shadow-md flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-indigo-600" />
              <span>Choose Your Molecule ({ALL_MOLECULES.length})</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Personalized
            </span>
          </div>

          {/* Molecule Selection List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {ALL_MOLECULES.map((identity) => {
              const isSelected = selectedId === identity.id;
              const isCurrent = savedIdentityId === identity.id;

              return (
                <button
                  key={identity.id}
                  type="button"
                  onClick={() => setSelectedId(identity.id as MoleculeIdentityId)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500'
                      : 'border-slate-200/80 bg-white/70 hover:bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Glowing color dot */}
                    <div
                      className="w-4 h-4 rounded-full shrink-0 shadow-xs ring-2 ring-white"
                      style={{ backgroundColor: identity.theme.glowColor }}
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {identity.name}
                        </span>
                        {identity.symbol && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({identity.symbol})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                        {identity.motif}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Current
                      </span>
                    )}
                    {isSelected && !isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN AREA: Large 3D Molecular Preview */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-md flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>{selectedIdentity.name}</span>
                  <span className="text-xs font-normal text-slate-500">· {selectedIdentity.motif}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedIdentity.tagline}
                </p>
              </div>

              {selectedId === savedIdentityId ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Molecule
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Unsaved Selection
                </span>
              )}
            </div>

            {/* Large 3D Molecular Viewport */}
            <div className="w-full h-[480px] sm:h-[540px] rounded-2xl overflow-hidden shadow-inner">
              <SingleMoleculePreview identity={selectedIdentity} />
            </div>

            {/* Bottom info helper */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Interactive 360° view — rotate to inspect realistic materials and internal geometry.</span>
              <span>1 Host Molecule</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
