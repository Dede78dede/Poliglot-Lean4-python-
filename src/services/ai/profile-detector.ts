import {
  type AiProfile,
  AI_PROFILE_CONFIGS,
} from '../../types/ai-profile';

export interface HardwareResources {
  readonly ramGb: number;
  readonly vramGb: number;
}

export class ProfileDetector {
  private customOverride: HardwareResources | null = null;

  public setMockResources(resources: HardwareResources | null): void {
    this.customOverride = resources;
  }

  public async probeHardware(): Promise<HardwareResources> {
    if (this.customOverride) {
      return this.customOverride;
    }

    let ramGb = 2; // Default conservative minimum
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      const devMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
      if (typeof devMem === 'number') {
        ramGb = devMem;
      }
    } else if (typeof process !== 'undefined' && process.env['MOCK_RAM_GB']) {
      ramGb = Number(process.env['MOCK_RAM_GB']);
    }

    let vramGb = 0; // Default zero VRAM if WebGPU is absent or unconfigured
    if (typeof process !== 'undefined' && process.env['MOCK_VRAM_GB']) {
      vramGb = Number(process.env['MOCK_VRAM_GB']);
    } else if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
        if (gpu && typeof gpu.requestAdapter === 'function') {
          const adapter = await gpu.requestAdapter();
          if (adapter) {
            // WebGPU adapter detected. If not headless, estimate consumer GPU minimum (~6 GB)
            vramGb = 6;
          }
        }
      } catch {
        vramGb = 0;
      }
    }

    return { ramGb, vramGb };
  }

  public async detectAvailableProfiles(): Promise<readonly AiProfile[]> {
    const hw = await this.probeHardware();
    const available: AiProfile[] = ['lite']; // Lite always available

    if (hw.ramGb >= AI_PROFILE_CONFIGS.standard.minRamGb && hw.vramGb >= AI_PROFILE_CONFIGS.standard.minVramGb) {
      available.push('standard');
    }

    if (hw.ramGb >= AI_PROFILE_CONFIGS.full.minRamGb && hw.vramGb >= AI_PROFILE_CONFIGS.full.minVramGb) {
      available.push('full');
    }

    return available;
  }

  public async recommendProfile(): Promise<AiProfile> {
    const available = await this.detectAvailableProfiles();
    if (available.includes('full')) return 'full';
    if (available.includes('standard')) return 'standard';
    return 'lite';
  }
}

export const profileDetector = new ProfileDetector();
