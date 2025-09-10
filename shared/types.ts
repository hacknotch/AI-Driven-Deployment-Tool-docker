// Shared types used across frontend and backend

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface Deployment {
  id: string
  userId: string
  name: string
  description?: string
  status: 'pending' | 'building' | 'success' | 'failed'
  dockerfile?: string
  logs?: string[]
  createdAt: string
  updatedAt: string
}

export interface DockerBuildResult {
  success: boolean
  imageId?: string
  logs: string[]
  error?: string
}

export interface FileAnalysisResult {
  language: string
  framework?: string
  dependencies: string[]
  recommendations: string[]
  dockerfile?: string
}

export interface AIServiceConfig {
  openaiApiKey: string
  model?: string
  temperature?: number
}

export interface SupabaseConfig {
  url: string
  anonKey: string
  serviceKey?: string
}

export interface EnvironmentConfig {
  nodeEnv: 'development' | 'production' | 'test'
  port: number
  openaiApiKey: string
  supabase: SupabaseConfig
  docker?: {
    user?: string
    autoBuild?: boolean
  }
}
