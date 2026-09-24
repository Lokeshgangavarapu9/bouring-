import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ZODIAC_MOLECULE_LIST,
  DEFAULT_MOLECULE,
  getMoleculeIdentity, 
  MoleculeIdentityId,
  MoleculeCategory
} from '../components/molecule/moleculeIdentities';
import { SingleMoleculePreview } from '../components/molecule/SingleMoleculePreview';
import { MoleculeChoiceButton } from '../components/molecule/MoleculeChoiceButton';
import { 
  ArrowLeft, 
  Sparkles, 
  Check, 
  CheckCircle2, 
  RotateCcw,
  Boxes,
  Orbit,
  Compass,
  Cloud
} from 'lucide-react';

export const MoleculePage: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();

  // Active saved identity on user profile (fallback to default)
  const savedIdentityId = (currentUser?.moleculeIdentity as MoleculeIdentityId) || 'default';
  const savedSmoky = currentUser?.moleculeSmoky ?? false;
  const savedTwinkling = currentUser?.moleculeTwinkling ?? false;

  // Selection state
  const [selectedId, setSelectedId] = useState<MoleculeIdentityId>(savedIdentityId);
  const [activeTab, setActiveTab] = useState<MoleculeCategory>(savedIdentityId === 'default' ? 'default' : 'zodiac');
  const [isSmoky, setIsSmoky] = useState<boolean>(savedSmoky);
  const [isTwinkling, setIsTwinkling] = useState<boolean>(savedTwinkling);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedIdentity = getMoleculeIdentity(selectedId);
  const isDirty =
    selectedId !== savedIdentityId ||
    isSmoky !== savedSmoky ||
    isTwinkling !== savedTwinkling;

  const handleSave = () => {
    updateProfile({
      moleculeIdentity: selectedId,
      moleculeSmoky: isSmoky,
      moleculeTwinkling: isTwinkling,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRevert = () => {
    setSelectedId(savedIdentityId);
    setIsSmoky(savedSmoky);
    setIsTwinkling(savedTwinkling);
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] bg-[#060810] text-slate-100 flex flex-col overflow-y-auto">
      {/* Toast Notification on Save */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Your personal molecule identity is saved as {selectedIdentity.name}.</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 px-4 sm:px-6 py-3.5 backdrop-blur-md shrink-0 flex items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Back to Profile"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Profile</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                Molecule Studio
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-2.5 h-2.5" />
                Personal Avatar
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Choose the molecule that represents you.
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/3d-lab"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Boxes className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open 3D Lab</span>
          </Link>

          {isDirty && (
            <button
              type="button"
              onClick={handleRevert}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
              title="Revert to saved molecule"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revert</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold transition-all shadow-md ${
              isDirty
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/30 ring-2 ring-indigo-400/40 cursor-pointer animate-pulse'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 cursor-default'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isDirty ? 'Save Molecule' : 'Saved'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8">
        {/* Comet-style Headline */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
            Make your molecule yours
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Choose the spherical world that represents you inside Boring&apos;s 3D social graph. Your chosen appearance belongs to you and follows you across your network and all mutual connections.
          </p>
        </div>

        {/* Live 3D Molecule Preview Stage */}
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="w-full h-72 sm:h-84">
            <SingleMoleculePreview
              identity={selectedIdentity}
              smoky={isSmoky}
              twinkling={isTwinkling}
            />
          </div>

          {/* Active selection banner with motif & colors */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full px-4 py-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 gap-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full shadow-md shrink-0"
                style={{ backgroundColor: selectedIdentity.theme.glowColor }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {selectedIdentity.name}
                  </span>
                  <span className="text-xs text-indigo-400 font-medium">
                    · {selectedIdentity.motif}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {selectedIdentity.tagline}
                </p>
              </div>
            </div>

            {/* Optional Smoky & Twinkling Effect Toggles (PDF Pages 19-20) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSmoky(!isSmoky)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  isSmoky
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Toggle soft translucent cloud-like wisps (PDF Page 19)"
              >
                <Cloud className="w-3 h-3" />
                <span>Smoky</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTwinkling(!isTwinkling)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  isTwinkling
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Toggle tiny controlled light points & gentle pulse (PDF Page 20)"
              >
                <Sparkles className="w-3 h-3" />
                <span>Twinkling</span>
              </button>
            </div>
          </div>
        </div>

        {/* Circular Molecule Choices Section */}
        <div className="w-full max-w-4xl mx-auto pt-4 border-t border-slate-800/80 space-y-6">
          {/* Collection Filter: 12 Zodiacs vs Default Neutral */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>Choose your molecule</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Small, smooth, polished spherical worlds with subtle smoky interiors and delicate light
              </p>
            </div>

            {/* Segmented Filter Control */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('zodiac')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'zodiac'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Orbit className="w-3.5 h-3.5" />
                <span>12 Zodiacs</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('default');
                  setSelectedId('default');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'default'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Default (Signature Molecule)</span>
              </button>
            </div>
          </div>

          {/* Comet-style Grid of Circular Molecule Avatars */}
          {activeTab === 'zodiac' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-5 justify-items-center">
              {ZODIAC_MOLECULE_LIST.map((identity) => (
                <MoleculeChoiceButton
                  key={identity.id}
                  identity={identity}
                  isSelected={selectedId === identity.id}
                  isCurrent={savedIdentityId === identity.id}
                  onSelect={(id) => setSelectedId(id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center py-6">
              <MoleculeChoiceButton
                key={DEFAULT_MOLECULE.id}
                identity={DEFAULT_MOLECULE}
                isSelected={selectedId === DEFAULT_MOLECULE.id}
                isCurrent={savedIdentityId === DEFAULT_MOLECULE.id}
                onSelect={(id) => setSelectedId(id)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
