import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { 
  Upload, 
  Search, 
  Settings, 
  Rocket, 
  Monitor, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  FileText,
  Terminal,
  Globe,
  Activity
} from 'lucide-react';

export interface DeploymentPhase {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  logs: string[];
  details?: any;
}

export interface DeploymentProgress {
  id: string;
  phases: DeploymentPhase[];
  currentPhase: string;
  overallProgress: number;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  totalDuration?: number;
}

interface DeploymentProgressTrackerProps {
  deployment: DeploymentProgress | null;
  onCancel?: () => void;
  onRetry?: () => void;
  onViewLogs?: (phaseId: string) => void;
}

const phaseIcons = {
  upload: <Upload className="h-5 w-5" />,
  analysis: <Search className="h-5 w-5" />,
  build: <Settings className="h-5 w-5" />,
  deploy: <Rocket className="h-5 w-5" />,
  monitor: <Monitor className="h-5 w-5" />
};

const phaseColors = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-600',
  completed: 'bg-green-100 text-green-600',
  failed: 'bg-red-100 text-red-600',
  skipped: 'bg-yellow-100 text-yellow-600'
};

const statusIcons = {
  pending: <Clock className="h-4 w-4" />,
  in_progress: <Loader2 className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  skipped: <Clock className="h-4 w-4" />
};

export function DeploymentProgressTracker({ 
  deployment, 
  onCancel, 
  onRetry, 
  onViewLogs 
}: DeploymentProgressTrackerProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  if (!deployment) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Deployment Process
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No deployment in progress</p>
            <p className="text-sm">Upload files or provide a repository URL to start</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPhaseStatus = (phase: DeploymentPhase) => {
    switch (phase.status) {
      case 'completed':
        return { icon: <CheckCircle className="h-5 w-5 text-green-500" />, color: 'border-green-500' };
      case 'in_progress':
        return { icon: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />, color: 'border-blue-500' };
      case 'failed':
        return { icon: <XCircle className="h-5 w-5 text-red-500" />, color: 'border-red-500' };
      case 'skipped':
        return { icon: <Clock className="h-5 w-5 text-yellow-500" />, color: 'border-yellow-500' };
      default:
        return { icon: <Clock className="h-5 w-5 text-gray-400" />, color: 'border-gray-300' };
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Deployment Process
            <Badge variant={deployment.status === 'completed' ? 'default' : 
                          deployment.status === 'failed' ? 'destructive' : 
                          deployment.status === 'running' ? 'secondary' : 'outline'}>
              {deployment.status.toUpperCase()}
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            {deployment.status === 'running' && onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {deployment.status === 'failed' && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Overall Progress</span>
            <span>{deployment.overallProgress}%</span>
          </div>
          <Progress value={deployment.overallProgress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deployment.phases.map((phase, index) => {
            const phaseStatus = getPhaseStatus(phase);
            const isExpanded = expandedPhase === phase.id;
            
            return (
              <div key={phase.id} className="relative">
                {/* Connection Line */}
                {index < deployment.phases.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
                )}
                
                <div className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                  phase.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                  phase.status === 'completed' ? 'bg-green-50 border-green-200' :
                  phase.status === 'failed' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  {/* Phase Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${phaseStatus.color}`}>
                    {phaseStatus.icon}
                  </div>
                  
                  {/* Phase Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{phase.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={phaseColors[phase.status]}>
                          {statusIcons[phase.status]}
                          <span className="ml-1 capitalize">{phase.status.replace('_', ' ')}</span>
                        </Badge>
                        {phase.duration && (
                          <span className="text-sm text-gray-500">
                            {formatDuration(phase.duration)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{phase.description}</p>
                    
                    {/* Phase Progress */}
                    {phase.status === 'in_progress' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Progress</span>
                          <span>{phase.progress}%</span>
                        </div>
                        <Progress value={phase.progress} className="h-1" />
                      </div>
                    )}
                    
                    {/* Phase Details */}
                    {phase.details && (
                      <div className="mt-3 space-y-2">
                        {phase.details.filesGenerated && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <FileText className="h-4 w-4" />
                            <span>{phase.details.filesGenerated} files generated</span>
                          </div>
                        )}
                        {phase.details.imageName && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Globe className="h-4 w-4" />
                            <span>Image: {phase.details.imageName}</span>
                          </div>
                        )}
                        {phase.details.deploymentUrl && (
                          <div className="flex items-center gap-2 text-sm text-purple-600">
                            <Rocket className="h-4 w-4" />
                            <span>URL: {phase.details.deploymentUrl}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Logs Toggle */}
                    {phase.logs.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                        className="mt-2"
                      >
                        <Terminal className="h-4 w-4 mr-2" />
                        {isExpanded ? 'Hide' : 'Show'} Logs ({phase.logs.length})
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Expanded Logs */}
                {isExpanded && phase.logs.length > 0 && (
                  <div className="mt-2 ml-16 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-48 overflow-y-auto">
                    {phase.logs.map((log, logIndex) => (
                      <div key={logIndex} className="mb-1">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Deployment Summary */}
        {deployment.status === 'completed' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">✅ Deployment Completed Successfully!</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>Total Duration: {deployment.totalDuration ? formatDuration(deployment.totalDuration) : 'N/A'}</p>
              <p>All phases completed successfully</p>
            </div>
          </div>
        )}
        
        {deployment.status === 'failed' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">❌ Deployment Failed</h4>
            <div className="text-sm text-red-700">
              <p>Check the logs above for error details</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DeploymentProgressTracker;
