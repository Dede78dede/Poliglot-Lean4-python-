import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import type { SupportedLanguage } from '../../types/language';
import type { KernelVerificationCertificate } from '../../types/blueprint';

export type ProofTab = 'auto-prove' | 'axle-cloud' | 'blueprint-sync' | 'veriphy-cas';

export interface ProofAutomationPanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentCode: string;
  readonly language: SupportedLanguage;
  readonly onApplyCode: (newCode: string) => void;
  readonly currentWorkspaceId?: string;
}

export interface KernelVerificationBadgeProps {
  readonly certificate?: KernelVerificationCertificate;
  readonly title?: string;
  readonly subtitle?: string;
}

export const KernelVerificationBadge: React.FC<KernelVerificationBadgeProps> = ({
  certificate,
  title = 'Verified by Lean 4 Kernel',
  subtitle,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        <span>{title}</span>
      </div>
      {subtitle && <div className="text-[11px] text-slate-400 font-mono">{subtitle}</div>}
      {certificate && (
        <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded font-mono text-[10px] text-slate-400 space-y-0.5">
          <div>Seal: {certificate.signatureSeal}</div>
          <div>Toolchain: {certificate.toolchain}</div>
          <div>Hash: {certificate.contentHash}</div>
        </div>
      )}
    </div>
  );
};

export interface AxleConsentModalProps {
  readonly show: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

export const AxleConsentModal: React.FC<AxleConsentModalProps> = ({
  show,
  onClose,
  onConfirm,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0e1420] border border-slate-700 rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-semibold text-sm uppercase">Cloud Data Transmission Consent</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          AXLE Advanced Metaprogramming executes through the Axiom cloud infrastructure.
          Sending mathematical conjectures or proof states transmits your code payload over HTTPS.
          All synthesized proof certificates undergo local Lean 4 kernel verification before injection.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors"
          >
            Agree & Proceed
          </button>
        </div>
      </div>
    </div>
  );
};
