import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, AlertTriangle, Check, Shield } from 'lucide-react';
import {
  type AiProfile,
  AI_PROFILES,
  AI_PROFILE_CONFIGS,
} from '../../types/ai-profile';
import { profileDetector } from '../../services/ai/profile-detector';

export interface AiProfileSelectorProps {
  readonly activeProfile: AiProfile;
  readonly onSelectProfile: (profile: AiProfile) => void;
  readonly className?: string;
}

export function AiProfileSelector({
  activeProfile,
  onSelectProfile,
  className = '',
}: AiProfileSelectorProps): React.JSX.Element {
  const [detectedProfiles, setDetectedProfiles] = useState<readonly AiProfile[]>(['lite']);
  const [recommended, setRecommended] = useState<AiProfile>('lite');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    profileDetector.detectAvailableProfiles().then((profiles) => {
      if (mounted) {
        setDetectedProfiles(profiles);
        profileDetector.recommendProfile().then((rec) => {
          if (mounted) {
            setRecommended(rec);
            setLoading(false);
          }
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={`p-4 bg-[#0a0d14] border border-slate-800 space-y-4 font-sans text-slate-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-100">
            Hardware-Aware AI Profile
          </h3>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 border border-slate-800 text-slate-400 bg-slate-900">
          {loading ? 'PROBING...' : `RECOMMENDED: ${recommended.toUpperCase()}`}
        </span>
      </div>

      {/* Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {AI_PROFILES.map((prof) => {
          const cfg = AI_PROFILE_CONFIGS[prof];
          const isSelected = activeProfile === prof;
          const isSupported = detectedProfiles.includes(prof);
          const isRec = recommended === prof;

          return (
            <div
              key={prof}
              onClick={() => onSelectProfile(prof)}
              className={`p-3.5 border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-950/20'
                  : isSupported
                  ? 'border-slate-800 bg-[#0e121b] hover:border-slate-700'
                  : 'border-slate-900 bg-[#07090e] opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
                      {prof}
                    </span>
                    {isRec && (
                      <span className="text-[9px] font-mono px-1 border border-cyan-800 text-cyan-300 bg-cyan-950/40">
                        REC
                      </span>
                    )}
                  </div>
                  {isSelected ? (
                    <div className="w-4 h-4 rounded-none bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-300">
                      <Check className="w-3 h-3" />
                    </div>
                  ) : null}
                </div>

                {/* Specs */}
                <div className="space-y-1 font-mono text-[11px] text-slate-400 mb-3">
                  <div className="flex items-center justify-between">
                    <span>Min RAM:</span>
                    <span className="text-slate-200">{cfg.minRamGb} GB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Min VRAM:</span>
                    <span className="text-slate-200">{cfg.minVramGb} GB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Local Model:</span>
                    <span className="text-slate-200">{cfg.localModel}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {cfg.description}
                </p>
              </div>

              {/* Explicit Warnings */}
              <div className="pt-2 border-t border-slate-800/60">
                {prof === 'standard' && (
                  <div className="text-[10px] text-amber-300/90 flex items-start gap-1 font-mono">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-400" />
                    <span>Requires 8 GB RAM + 6 GB VRAM. Uses a 7B-class model with quality below full Leanstral.</span>
                  </div>
                )}
                {prof === 'full' && (
                  <div className="text-[10px] text-rose-300/90 flex items-start gap-1 font-mono">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-rose-400" />
                    <span>Requires 78.5 GB VRAM. No consumer GPU qualifies.</span>
                  </div>
                )}
                {prof === 'lite' && (
                  <div className="text-[10px] text-emerald-300/90 flex items-start gap-1 font-mono">
                    <Shield className="w-3 h-3 shrink-0 mt-0.5 text-emerald-400" />
                    <span>All non-AI features functional. Cloud APIs optional.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
