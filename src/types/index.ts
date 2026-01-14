export interface TCode {
  id: number;
  tcode: string;
  program: string | null;
  description: string | null;
  descriptionEnriched: string | null;
  module: string | null;
  subModule: string | null;
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
}

export interface AISearchResponse {
  results: AISearchResult[];
  query: string;
  processingTimeMs: number;
}
