import { z } from 'zod';

// =========================================================================
// Central Settings: AI & Integrations Configuration Authority Schemas
// =========================================================================

export const ProviderTypeEnum = z.enum([
  'google_vertex',
  'openai',
  'anthropic',
  'azure_openai',
  'aws_bedrock',
  'local_ollama',
  'tesseract_ocr',
  'pure_js_pdf',
  'e3_rentals',
  'e3_purchasetracker',
]);
export type ProviderType = z.infer<typeof ProviderTypeEnum>;

export const SecretStatusEnum = z.enum([
  'not_configured',
  'active_encrypted',
  'rotated',
  'revoked',
]);
export type SecretStatus = z.infer<typeof SecretStatusEnum>;

export const HealthStatusEnum = z.enum([
  'healthy',
  'degraded',
  'unreachable',
  'not_tested',
  'testing',
]);
export type HealthStatus = z.infer<typeof HealthStatusEnum>;

export const TaskCapabilityEnum = z.enum([
  'extraction',
  'structured_classification',
  'semantic_matching',
  'summarisation',
  'vision',
  'embeddings',
  'ocr',
  'document_conversion',
]);
export type TaskCapability = z.infer<typeof TaskCapabilityEnum>;

export const ProviderConnectionSchema = z.object({
  id: z.string(),
  provider: ProviderTypeEnum,
  label: z.string().min(2),
  accountOrProjectId: z.string().default('e3-eos-production'),
  approvedEndpoint: z.string().default('https://api.provider.internal/v1'),
  approvedRegion: z.string().default('me-central1-doha'),
  secretStatus: SecretStatusEnum.default('not_configured'),
  maskedSecret: z.string().default('••••••••••••••••'),
  secretKey: z.string().optional(), // Provided only during set/rotate
  health: HealthStatusEnum.default('not_tested'),
  mode: z.enum(['disabled', 'sandbox', 'production_read_only', 'production_full']).default('disabled').optional(),
  capabilities: z.array(z.string()).default([]).optional(),
  lastTestedAt: z.string().optional(),
  latencyMs: z.number().optional(),
  lastError: z.string().optional(),
  isDefault: z.boolean().default(false),
});
export type ProviderConnectionDto = z.infer<typeof ProviderConnectionSchema>;

export const TaskRoutingRuleSchema = z.object({
  capability: TaskCapabilityEnum,
  primaryProvider: ProviderTypeEnum,
  primaryModel: z.string().min(2),
  contextTokenLimit: z.number().int().positive().default(32000),
  outputTokenLimit: z.number().int().positive().default(4096),
  timeoutSeconds: z.number().int().positive().default(30),
  maxRetries: z.number().int().min(0).max(5).default(2),
  costLimitPerCallQar: z.number().positive().default(0.50),
  fallbackProvider: ProviderTypeEnum.optional(),
  fallbackModel: z.string().optional(),
  active: z.boolean().default(true),
});
export type TaskRoutingRuleDto = z.infer<typeof TaskRoutingRuleSchema>;

export const DocumentMediaAdaptersSchema = z.object({
  ocrEngine: z.enum(['tesseract_wasm', 'native_text_span', 'cloud_vision']).default('native_text_span'),
  pdfEngine: z.enum(['pure_js_in_engine', 'headless_converter']).default('pure_js_in_engine'),
  cadViewerEngine: z.enum(['pure_canvas_2d_3d', 'converted_derivative']).default('pure_canvas_2d_3d'),
  videoPlayerEngine: z.enum(['html5_native', 'streaming_hls']).default('html5_native'),
  signingService: z.enum(['pure_js_visual_stamp', 'crypto_hsm']).default('pure_js_visual_stamp'),
  supportedFormats: z.array(z.string()).default([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'model/gltf-binary',
    'model/gltf+json',
    'video/mp4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
});
export type DocumentMediaAdaptersDto = z.infer<typeof DocumentMediaAdaptersSchema>;

export const DocumentPoliciesConfigSchema = z.object({
  numberingProfiles: z.record(z.string()).default({
    vault: 'E3-EV-<CATEGORY>-<NNNN>',
    pack: 'PACK-<PROJECT>-<ENV>-<NN>',
    drawing: 'DOC-<DISC>-<NNNN>',
  }),
  renewalCriticalDays: z.number().int().default(30),
  renewalUpcomingDays: z.number().int().default(90),
  retentionHoldRules: z.array(z.string()).default([
    'Block deletion when retentionHold=true',
    'Block permanent deletion when referenced in frozen submission packs',
  ]),
  authorizedTestStampCodes: z.array(z.string()).default([
    'TEST_STAMP_AUTHORIZED',
    'TEST_SIGNATURE_MOCK',
  ]),
});
export type DocumentPoliciesConfigDto = z.infer<typeof DocumentPoliciesConfigSchema>;

export const CentralSettingsConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  status: z.enum(['draft', 'active', 'archived']).default('active'),
  activatedAt: z.string().optional(),
  activatedBy: z.string().optional(),
  changeSummary: z.string().optional(),
  connections: z.array(ProviderConnectionSchema).default([]),
  taskRouting: z.array(TaskRoutingRuleSchema).default([]),
  mediaAdapters: DocumentMediaAdaptersSchema.default({}),
  policies: DocumentPoliciesConfigSchema.default({}),
});
export type CentralSettingsConfigDto = z.infer<typeof CentralSettingsConfigSchema>;

export const SyntheticConnectionTestSchema = z.object({
  provider: ProviderTypeEnum,
  secretKey: z.string().optional(),
  accountOrProjectId: z.string().optional(),
  approvedEndpoint: z.string().optional(),
});
export type SyntheticConnectionTestDto = z.infer<typeof SyntheticConnectionTestSchema>;

export const ActivateConfigurationSchema = z.object({
  changeSummary: z.string().min(3),
  activatedBy: z.string().optional(),
});
export type ActivateConfigurationDto = z.infer<typeof ActivateConfigurationSchema>;
