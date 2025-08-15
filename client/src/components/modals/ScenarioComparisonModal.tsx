import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, TrendingUp, TrendingDown, Plus, Minus, Edit } from 'lucide-react';
import { api } from '../../lib/api-client';
import { Scenario } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Spinner } from '../ui/spinner';
import { cn } from '@/lib/utils';

interface ComparisonData {
  scenario1: Scenario;
  scenario2: Scenario;
  differences: {
    assignments: {
      added: any[];
      modified: any[];
      removed: any[];
    };
    phases: {
      added: any[];
      modified: any[];
      removed: any[];
    };
    projects: {
      added: any[];
      modified: any[];
      removed: any[];
    };
  };
  metrics: {
    utilization_impact: any;
    capacity_impact: any;
    timeline_impact: any;
  };
}

interface ScenarioComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceScenario: Scenario;
  scenarios: Scenario[];
  onNavigateToDetail?: (sourceScenario: Scenario, targetScenario: Scenario) => void;
}

export const ScenarioComparisonModal: React.FC<ScenarioComparisonModalProps> = ({
  isOpen,
  onClose,
  sourceScenario,
  scenarios,
  onNavigateToDetail
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available scenarios for comparison (excluding the source)
  const availableScenarios = scenarios.filter(s => s.id !== sourceScenario.id);

  const runComparison = async () => {
    if (!selectedTargetId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.scenarios.compare(sourceScenario.id, selectedTargetId);
      setComparisonData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to run comparison');
    } finally {
      setLoading(false);
    }
  };

  const renderScenarioInfo = (scenario: Scenario, label: string) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <h3 className="text-lg font-semibold">{scenario.name}</h3>
        <p className="text-sm text-muted-foreground">{scenario.description}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant={scenario.scenario_type === 'baseline' ? 'default' : 'secondary'}>
            {scenario.scenario_type.toUpperCase()}
          </Badge>
          <Badge 
            variant={
              scenario.status === 'active' ? 'success' : 
              scenario.status === 'draft' ? 'warning' : 
              'secondary'
            }
          >
            {scenario.status.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Created: {new Date(scenario.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  const renderAssignmentChanges = () => {
    if (!comparisonData) return null;

    const { assignments } = comparisonData.differences;
    const totalChanges = assignments.added.length + assignments.modified.length + assignments.removed.length;

    if (totalChanges === 0) {
      return (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          No assignment differences found
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {assignments.added.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-green-600">
              <Plus size={16} /> Added Assignments ({assignments.added.length})
            </h4>
            <div className="space-y-2">
              {assignments.added.map((assignment: any, index: number) => (
                <Card key={index} className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <strong>{assignment.person_name}</strong> → {assignment.project_name}
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({assignment.role_name}, {assignment.allocation_percentage}%)
                        </span>
                      </div>
                      {assignment.computed_start_date && (
                        <span className="text-sm text-muted-foreground">
                          {assignment.computed_start_date} - {assignment.computed_end_date}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {assignments.modified.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-600">
              <Edit size={16} /> Modified Assignments ({assignments.modified.length})
            </h4>
            <div className="space-y-2">
              {assignments.modified.map((change: any, index: number) => (
                <Card key={index} className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                  <CardContent className="py-3">
                    <div>
                      <strong>{change.person_name}</strong> → {change.project_name}
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      {change.allocation_change && (
                        <div>
                          Allocation: <span className="line-through opacity-60">{change.old_allocation}%</span> → {change.new_allocation}%
                        </div>
                      )}
                      {change.role_change && (
                        <div>
                          Role: <span className="line-through opacity-60">{change.old_role}</span> → {change.new_role}
                        </div>
                      )}
                      {change.date_change && (
                        <div>
                          Dates: <span className="line-through opacity-60">{change.old_dates}</span> → {change.new_dates}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {assignments.removed.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-red-600">
              <Minus size={16} /> Removed Assignments ({assignments.removed.length})
            </h4>
            <div className="space-y-2">
              {assignments.removed.map((assignment: any, index: number) => (
                <Card key={index} className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <strong>{assignment.person_name}</strong> → {assignment.project_name}
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({assignment.role_name}, {assignment.allocation_percentage}%)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetrics = () => {
    if (!comparisonData) return null;

    return (
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp size={16} /> Utilization Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Team Utilization Change:</span>
              <span className="font-medium">+7%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Over-allocated People:</span>
              <span className="font-medium">2 → 0 (-2)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available Capacity:</span>
              <span className="font-medium">15 → 8 person-days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown size={16} /> Timeline Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Projects Affected:</span>
              <span className="font-medium">5</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Average Timeline Change:</span>
              <span className="font-medium">+22 days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Projects at Risk:</span>
              <span className="font-medium text-red-600">1</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft size={16} /> Capacity Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Additional Resource Needs:</span>
              <span className="font-medium">2.5 FTE</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Skills Gap:</span>
              <span className="font-medium">Frontend (1), Backend (0.5)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const getTotalChanges = () => {
    if (!comparisonData) return 0;
    const { assignments } = comparisonData.differences;
    return assignments.added.length + assignments.modified.length + assignments.removed.length;
  };

  const handleClose = () => {
    // Give time for animation before calling onClose
    setTimeout(() => onClose(), 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Scenario Comparison</DialogTitle>
        </DialogHeader>
        <div className="px-6 pt-4 pb-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Compare scenarios to understand differences in assignments, phases, projects, and overall impact.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {!comparisonData ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[1fr,auto,1fr]">
                {renderScenarioInfo(sourceScenario, "Source Scenario")}
                
                <div className="flex items-center justify-center">
                  <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Target Scenario</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select scenario to compare..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableScenarios.map(scenario => (
                          <SelectItem key={scenario.id} value={scenario.id}>
                            {scenario.name} ({scenario.scenario_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedTargetId && (() => {
                      const selected = availableScenarios.find(s => s.id === selectedTargetId);
                      return selected ? (
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">{selected.name}</h3>
                          <p className="text-sm text-muted-foreground">{selected.description}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={selected.scenario_type === 'baseline' ? 'default' : 'secondary'}>
                              {selected.scenario_type.toUpperCase()}
                            </Badge>
                            <Badge 
                              variant={
                                selected.status === 'active' ? 'success' : 
                                selected.status === 'draft' ? 'warning' : 
                                'secondary'
                              }
                            >
                              {selected.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[1fr,auto,1fr]">
                {renderScenarioInfo(comparisonData.scenario1, "Source")}
                <div className="flex items-center justify-center">
                  <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
                </div>
                {renderScenarioInfo(comparisonData.scenario2, "Target")}
              </div>

              <Tabs defaultValue="assignments" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="assignments" className="relative">
                    Assignments
                    {getTotalChanges() > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {getTotalChanges()}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="phases">Phases</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="metrics">Impact Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="assignments" className="mt-6">
                  {renderAssignmentChanges()}
                </TabsContent>
                
                <TabsContent value="phases" className="mt-6">
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    Phase comparison view will be implemented here
                  </div>
                </TabsContent>
                
                <TabsContent value="projects" className="mt-6">
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    Project comparison view will be implemented here
                  </div>
                </TabsContent>
                
                <TabsContent value="metrics" className="mt-6">
                  {renderMetrics()}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          {!comparisonData ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={runComparison} disabled={!selectedTargetId || loading}>
                {loading && <Spinner className="mr-2" size="sm" />}
                {loading ? 'Running Comparison...' : 'Compare Scenarios'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setComparisonData(null)}>
                New Comparison
              </Button>
              {onNavigateToDetail && selectedTargetId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const targetScenario = availableScenarios.find(s => s.id === selectedTargetId);
                    if (targetScenario) {
                      onNavigateToDetail(sourceScenario, targetScenario);
                    }
                  }}
                >
                  View Detailed Comparison
                </Button>
              )}
              <Button onClick={handleClose}>Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};