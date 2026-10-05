import type { RaymarchOverride, RaymarchStatus } from './blackholeTier';

type RaymarchDisableReason = 'shader-error' | 'frame-budget-3-strikes';
type RaymarchActivationReason = 'attached' | 'auto' | 'override-on' | 'quality-restore' | 're-armed';

interface RaymarchPolicyInput {
  override: RaymarchOverride;
  tierCapable: boolean;
  softwareRenderer: boolean;
  disabledReason: RaymarchDisableReason | null;
  stoodDown: boolean;
  activationReason: RaymarchActivationReason;
}

interface RaymarchPolicyDecision {
  enabled: boolean;
  state: RaymarchStatus['state'];
  reason: string;
  clearStandDown: boolean;
}

/**
 * The single policy for creating and changing the geodesic black-hole tier.
 * Always On bypasses the quality tier and temporary frame-budget stand-down,
 * but never a software renderer or a permanent safety disarm.
 */
export function resolveRaymarchPolicy(input: RaymarchPolicyInput): RaymarchPolicyDecision {
  if (input.override === 'off') {
    return { enabled: false, state: 'off', reason: 'override-off', clearStandDown: false };
  }

  if (input.disabledReason) {
    return { enabled: false, state: 'fallback', reason: input.disabledReason, clearStandDown: false };
  }

  if (input.softwareRenderer) {
    return { enabled: false, state: 'off', reason: 'software-renderer', clearStandDown: false };
  }

  if (input.override === 'auto' && !input.tierCapable) {
    return { enabled: false, state: 'off', reason: 'tier-low', clearStandDown: false };
  }

  if (input.override === 'auto' && input.stoodDown) {
    return { enabled: false, state: 'fallback', reason: 'frame-budget', clearStandDown: false };
  }

  return {
    enabled: true,
    state: input.override === 'on' ? 'forced' : 'active',
    reason: input.activationReason,
    clearStandDown: input.override === 'on' && input.stoodDown,
  };
}
