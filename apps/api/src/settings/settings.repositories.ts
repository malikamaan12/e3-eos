import {
  CentralSettingsConfigDto,
  ProviderConnectionDto,
  TaskRoutingRuleDto,
} from '@e3-eos/contracts';

import { globalEncryptedSecretVault } from './encrypted-secret-vault.js';

// Seed default initial secrets if not yet present in persistent encrypted vault
const defaultSecrets: [string, string][] = [
  ['conn-vertex-doha', 'AIzaSy_SECURE_DOHA_VERTEX_KEY_98124792184719'],
  ['conn-anthropic', 'sk-ant-api03-SECURE_ANTHROPIC_KEY_1248912481'],
  ['conn-pure-pdf', 'INTERNAL_IN_ENGINE_ZERO_DEPENDENCY_TOKEN'],
  ['conn-tesseract', 'INTERNAL_WASM_TEXT_SPAN_TOKEN'],
];

for (const [k, v] of defaultSecrets) {
  if (!globalEncryptedSecretVault.hasSecret(k)) {
    globalEncryptedSecretVault.setSecret(k, v);
  }
}

// Durable AES-256-GCM Encrypted Secret Vault Map Adapter
class EncryptedSecretVaultMapAdapter extends Map<string, string> {
  override get(key: string): string | undefined {
    return globalEncryptedSecretVault.getSecret(key);
  }

  override set(key: string, value: string): this {
    globalEncryptedSecretVault.setSecret(key, value);
    super.set(key, value);
    return this;
  }

  override has(key: string): boolean {
    return globalEncryptedSecretVault.hasSecret(key);
  }

  override delete(key: string): boolean {
    super.delete(key);
    return globalEncryptedSecretVault.deleteSecret(key);
  }

  override clear(): void {
    super.clear();
    globalEncryptedSecretVault.clear();
  }
}

export const serverSideSecretVault = new EncryptedSecretVaultMapAdapter(defaultSecrets);

// Initial active production-ready configuration snapshot (Version 1)
const initialConnections: ProviderConnectionDto[] = [
  {
    id: 'conn-vertex-doha',
    provider: 'google_vertex',
    label: 'Google Vertex AI (Doha Regional Endpoint)',
    accountOrProjectId: 'e3-eos-qatar-prod',
    approvedEndpoint: 'https://me-central1-aiplatform.googleapis.com/v1',
    approvedRegion: 'me-central1-doha',
    secretStatus: 'active_encrypted',
    maskedSecret: 'AIzaSy••••••••••••••••••••78kL',
    health: 'healthy',
    lastTestedAt: '2026-09-18T12:00:00.000Z',
    latencyMs: 42,
    isDefault: true,
  },
  {
    id: 'conn-anthropic',
    provider: 'anthropic',
    label: 'Anthropic Claude (Contract Review Model)',
    accountOrProjectId: 'e3-eos-enterprise',
    approvedEndpoint: 'https://api.anthropic.com/v1',
    approvedRegion: 'eu-west-1',
    secretStatus: 'active_encrypted',
    maskedSecret: 'sk-ant••••••••••••••••••••98wQ',
    health: 'healthy',
    lastTestedAt: '2026-09-18T12:05:00.000Z',
    latencyMs: 58,
    isDefault: false,
  },
  {
    id: 'conn-pure-pdf',
    provider: 'pure_js_pdf',
    label: 'E3 Pure-JS PDF Assembly Engine',
    accountOrProjectId: 'internal-engine',
    approvedEndpoint: 'in-engine://pdf-assembler',
    approvedRegion: 'local-memory',
    secretStatus: 'active_encrypted',
    maskedSecret: 'LOCAL-IN-ENGINE-ACTIVE',
    health: 'healthy',
    lastTestedAt: '2026-09-19T06:00:00.000Z',
    latencyMs: 2,
    isDefault: true,
  },
  {
    id: 'conn-tesseract',
    provider: 'tesseract_ocr',
    label: 'E3 Text-Span & Optical Alignment Engine',
    accountOrProjectId: 'internal-engine',
    approvedEndpoint: 'in-engine://text-span-ocr',
    approvedRegion: 'local-memory',
    secretStatus: 'active_encrypted',
    maskedSecret: 'LOCAL-IN-ENGINE-ACTIVE',
    health: 'healthy',
    lastTestedAt: '2026-09-19T06:00:00.000Z',
    latencyMs: 4,
    isDefault: true,
  },
];

const initialTaskRouting: TaskRoutingRuleDto[] = [
  {
    capability: 'extraction',
    primaryProvider: 'google_vertex',
    primaryModel: 'gemini-1.5-pro',
    contextTokenLimit: 128000,
    outputTokenLimit: 8192,
    timeoutSeconds: 30,
    maxRetries: 2,
    costLimitPerCallQar: 0.15,
    fallbackProvider: 'anthropic',
    fallbackModel: 'claude-3-5-sonnet',
    active: true,
  },
  {
    capability: 'structured_classification',
    primaryProvider: 'google_vertex',
    primaryModel: 'gemini-1.5-flash',
    contextTokenLimit: 32000,
    outputTokenLimit: 2048,
    timeoutSeconds: 15,
    maxRetries: 2,
    costLimitPerCallQar: 0.05,
    active: true,
  },
  {
    capability: 'semantic_matching',
    primaryProvider: 'google_vertex',
    primaryModel: 'text-embedding-004',
    contextTokenLimit: 8192,
    outputTokenLimit: 768,
    timeoutSeconds: 10,
    maxRetries: 2,
    costLimitPerCallQar: 0.01,
    active: true,
  },
  {
    capability: 'vision',
    primaryProvider: 'google_vertex',
    primaryModel: 'gemini-1.5-pro',
    contextTokenLimit: 64000,
    outputTokenLimit: 4096,
    timeoutSeconds: 40,
    maxRetries: 1,
    costLimitPerCallQar: 0.25,
    active: true,
  },
  {
    capability: 'ocr',
    primaryProvider: 'tesseract_ocr',
    primaryModel: 'deterministic-text-spans',
    contextTokenLimit: 50000,
    outputTokenLimit: 50000,
    timeoutSeconds: 10,
    maxRetries: 0,
    costLimitPerCallQar: 0.00,
    active: true,
  },
  {
    capability: 'document_conversion',
    primaryProvider: 'pure_js_pdf',
    primaryModel: 'pure-js-pdf-builder-v1',
    contextTokenLimit: 100000,
    outputTokenLimit: 100000,
    timeoutSeconds: 20,
    maxRetries: 1,
    costLimitPerCallQar: 0.00,
    active: true,
  },
];

export const activeConfigurationStore: CentralSettingsConfigDto = {
  version: 1,
  status: 'active',
  activatedAt: '2026-09-18T10:00:00.000Z',
  activatedBy: 'Executive Security Lead (Admin)',
  changeSummary: 'Baseline certified configuration with Doha Vertex, Anthropic fallback, and in-engine PDF/OCR adapters.',
  connections: initialConnections,
  taskRouting: initialTaskRouting,
  mediaAdapters: {
    ocrEngine: 'native_text_span',
    pdfEngine: 'pure_js_in_engine',
    cadViewerEngine: 'pure_canvas_2d_3d',
    videoPlayerEngine: 'html5_native',
    signingService: 'pure_js_visual_stamp',
    supportedFormats: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'model/gltf-binary',
      'model/gltf+json',
      'video/mp4',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  policies: {
    numberingProfiles: {
      vault: 'E3-EV-<CATEGORY>-<NNNN>',
      pack: 'PACK-<PROJECT>-<ENV>-<NN>',
      drawing: 'DOC-<DISC>-<NNNN>',
    },
    renewalCriticalDays: 30,
    renewalUpcomingDays: 90,
    retentionHoldRules: [
      'Block deletion when retentionHold=true',
      'Block permanent deletion when referenced in frozen submission packs',
    ],
    authorizedTestStampCodes: [
      'TEST_STAMP_AUTHORIZED',
      'TEST_SIGNATURE_MOCK',
    ],
  },
};

export let draftConfigurationStore: CentralSettingsConfigDto = {
  ...activeConfigurationStore,
  status: 'draft',
};

export function setDraftConfiguration(config: CentralSettingsConfigDto) {
  draftConfigurationStore = config;
}

export function setActiveConfiguration(config: CentralSettingsConfigDto) {
  Object.assign(activeConfigurationStore, config);
}

export const configurationHistoryStore: CentralSettingsConfigDto[] = [
  { ...activeConfigurationStore },
];
