export interface TCode {
  id: number;
  tcode: string;
  program: string | null;
  description: string | null;
  descriptionEnriched: string | null;
  module: string | null;
  subModule: string | null;
  packageDesc: string | null;
  isDeprecated: boolean;
  s4hanaStatus: string | null;
  usageCategory: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  tcode: string;
  program: string | null;
  description: string | null;
  module: string | null;
  relevanceScore: number;
  matchType: 'exact' | 'fuzzy' | 'fulltext' | 'semantic';
  isDeprecated: boolean;
  highlights?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  clarification?: {
    question: string;
    options: ClarificationOption[];
  };
  metadata: {
    totalResults: number;
    searchMode: string;
    processingTimeMs: number;
  };
}

export interface ClarificationOption {
  label: string;
  value: string;
}

export interface TCodeRelationship {
  id: number;
  sourceTcodeId: number;
  targetTcodeId: number;
  relationshipType: 'variant' | 'alternative' | 'related' | 'successor';
  confidence: number;
}

export interface Bookmark {
  id: string;
  tcode: string;
  notes: string | null;
  createdAt: string;
}

export interface SAPModule {
  code: string;
  name: string;
  description: string | null;
  parentModule: string | null;
  tcodeCount?: number;
}

export interface Feedback {
  id: number;
  tcodeId: number;
  vote: -1 | 1;
  comment: string | null;
  createdAt: Date;
}

export interface AISearchResult {
  tcode: string;
  description: string | null;
  module: string | null;
  explanation: string;
  confidence: number;
  aiGenerated?: boolean; // true if T-code is AI-suggested, not from database
  source?: 'database' | 'ai-generated' | 'web'; // origin of the result
}

export interface AISearchResponse {
  results: AISearchResult[];
  query: string;
  processingTimeMs: number;
  cached: boolean;
}

// LLM Judge Types
export interface JudgeVerdict {
  tcode: string;
  isExplanationAccurate: boolean;
  isConfidenceReasonable: boolean;
  correctedExplanation: string | null;
  correctedConfidence: number | null;
  reasoning: string;
}

export interface JudgeMetrics {
  verdicts: JudgeVerdict[];
  judgeModel: string;
  processingTimeMs: number;
  corrections: {
    explanationsFixed: number;
    confidencesAdjusted: number;
  };
}

// Fiori Reference Library Types
export interface FioriApp {
  id: number;
  appId: string;
  appName: string;
  appLauncherTitle: string | null;
  uiTechnology: string;
  appComponentDesc: string | null;
  lineOfBusiness: string[];
  semanticObjectAction: string[];
  businessCatalogTitle: string | null;
  productVersion: string | null;
  createdAt: Date;
}

export interface FioriTCodeMapping {
  id: number;
  fioriAppId: number;
  tcodeId: number | null;
  tcodeRaw: string;
}

export interface FioriAppWithMappings extends FioriApp {
  tcodeMappings: FioriTCodeMapping[];
}

export interface FioriAppsResponse {
  apps: FioriApp[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FioriSearchResult extends FioriApp {
  relevanceScore: number;
  matchType: 'exact' | 'fuzzy' | 'semantic';
}

export type UITechnology =
  | 'SAP GUI'
  | 'SAP Fiori elements'
  | 'SAP Fiori (SAPUI5)'
  | 'Web Dynpro'
  | 'SAP Fiori: Generic Job Scheduling Framework'
  | 'Web Client UI'
  | string;
