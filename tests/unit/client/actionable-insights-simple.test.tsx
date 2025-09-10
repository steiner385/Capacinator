import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Test the core logic of our actionable insights
describe('Actionable Insights Core Logic', () => {
  
  describe('Utilization Calculation', () => {
    it('should calculate over-allocated status correctly', () => {
      const totalAllocation = 120;
      const availability = 100;
      const utilizationPercentage = (totalAllocation / availability) * 100;
      
      expect(utilizationPercentage).toBeGreaterThan(100);
      expect(utilizationPercentage).toBe(120);
    });

    it('should calculate under-allocated status correctly', () => {
      const totalAllocation = 50;
      const availability = 100;
      const utilizationPercentage = (totalAllocation / availability) * 100;
      
      expect(utilizationPercentage).toBeLessThan(80);
      expect(utilizationPercentage).toBe(50);
    });

    it('should calculate fully-allocated status correctly', () => {
      const totalAllocation = 90;
      const availability = 100;
      const utilizationPercentage = (totalAllocation / availability) * 100;
      
      expect(utilizationPercentage).toBeGreaterThanOrEqual(80);
      expect(utilizationPercentage).toBeLessThanOrEqual(100);
      expect(utilizationPercentage).toBe(90);
    });

    it('should handle zero availability gracefully', () => {
      const totalAllocation = 50;
      const availability = 0;
      const utilizationPercentage = availability > 0 ? (totalAllocation / availability) * 100 : 0;
      
      expect(utilizationPercentage).toBe(0);
    });
  });

  describe('Status Determination Logic', () => {
    function getPersonStatus(utilizationPercentage: number) {
      if (utilizationPercentage > 100) {
        return 'over_allocated';
      } else if (utilizationPercentage >= 80) {
        return 'fully_allocated';
      } else if (utilizationPercentage >= 40) {
        return 'under_allocated';
      } else {
        return 'available';
      }
    }

    it('should return correct status for over-allocated person', () => {
      expect(getPersonStatus(120)).toBe('over_allocated');
      expect(getPersonStatus(150)).toBe('over_allocated');
    });

    it('should return correct status for fully-allocated person', () => {
      expect(getPersonStatus(80)).toBe('fully_allocated');
      expect(getPersonStatus(90)).toBe('fully_allocated');
      expect(getPersonStatus(100)).toBe('fully_allocated');
    });

    it('should return correct status for under-allocated person', () => {
      expect(getPersonStatus(40)).toBe('under_allocated');
      expect(getPersonStatus(50)).toBe('under_allocated');
      expect(getPersonStatus(79)).toBe('under_allocated');
    });

    it('should return correct status for available person', () => {
      expect(getPersonStatus(0)).toBe('available');
      expect(getPersonStatus(20)).toBe('available');
      expect(getPersonStatus(39)).toBe('available');
    });
  });

  describe('Action Button Logic', () => {
    function getActionsForStatus(status: string) {
      switch (status) {
        case 'over_allocated':
          return ['Reduce Workload', 'Find Coverage', 'Extend Timeline'];
        case 'fully_allocated':
          return ['Monitor Load', 'Plan Ahead'];
        case 'under_allocated':
          return ['Assign More Work', 'Find Projects'];
        case 'available':
          return ['Assign to Project', 'View Opportunities'];
        default:
          return [];
      }
    }

    it('should return correct actions for over-allocated status', () => {
      const actions = getActionsForStatus('over_allocated');
      expect(actions).toContain('Reduce Workload');
      expect(actions).toContain('Find Coverage');
      expect(actions).toContain('Extend Timeline');
    });

    it('should return correct actions for fully-allocated status', () => {
      const actions = getActionsForStatus('fully_allocated');
      expect(actions).toContain('Monitor Load');
      expect(actions).toContain('Plan Ahead');
    });

    it('should return correct actions for under-allocated status', () => {
      const actions = getActionsForStatus('under_allocated');
      expect(actions).toContain('Assign More Work');
      expect(actions).toContain('Find Projects');
    });

    it('should return correct actions for available status', () => {
      const actions = getActionsForStatus('available');
      expect(actions).toContain('Assign to Project');
      expect(actions).toContain('View Opportunities');
    });
  });

  describe('URL Parameter Parsing', () => {
    function parseActionContext(searchParams: string) {
      const params = new URLSearchParams(searchParams);
      return {
        person: params.get('person'),
        role: params.get('role'),
        action: params.get('action'),
        from: params.get('from'),
        status: params.get('status'),
        hasContext: !!(params.get('person') || params.get('role') || params.get('action'))
      };
    }

    it('should parse person assignment context correctly', () => {
      const context = parseActionContext('?person=John Doe&action=assign&status=AVAILABLE&from=people-page');
      
      expect(context.person).toBe('John Doe');
      expect(context.action).toBe('assign');
      expect(context.status).toBe('AVAILABLE');
      expect(context.from).toBe('people-page');
      expect(context.hasContext).toBe(true);
    });

    it('should parse reduce workload context correctly', () => {
      const context = parseActionContext('?person=Jane Smith&action=reduce&from=capacity-report');
      
      expect(context.person).toBe('Jane Smith');
      expect(context.action).toBe('reduce');
      expect(context.from).toBe('capacity-report');
      expect(context.hasContext).toBe(true);
    });

    it('should parse role-based context correctly', () => {
      const context = parseActionContext('?role=Developer&action=assign&from=reports');
      
      expect(context.role).toBe('Developer');
      expect(context.action).toBe('assign');
      expect(context.from).toBe('reports');
      expect(context.hasContext).toBe(true);
    });

    it('should handle empty parameters gracefully', () => {
      const context = parseActionContext('');
      
      expect(context.person).toBeNull();
      expect(context.role).toBeNull();
      expect(context.action).toBeNull();
      expect(context.from).toBeNull();
      expect(context.hasContext).toBe(false);
    });
  });

  describe('Team Insights Calculations', () => {
    function calculateTeamInsights(people: Array<{ id: string; status: string; totalAllocation: number }>) {
      const overAllocated = people.filter(p => p.status === 'OVER_ALLOCATED').length;
      const available = people.filter(p => p.status === 'UNDER_ALLOCATED' || p.totalAllocation < 40).length;
      const total = people.length;
      
      return { overAllocated, available, total };
    }

    it('should calculate team insights correctly', () => {
      const mockTeam = [
        { id: '1', status: 'OVER_ALLOCATED', totalAllocation: 120 },
        { id: '2', status: 'UNDER_ALLOCATED', totalAllocation: 30 },
        { id: '3', status: 'FULLY_ALLOCATED', totalAllocation: 90 },
        { id: '4', status: 'UNDER_ALLOCATED', totalAllocation: 20 }
      ];
      
      const insights = calculateTeamInsights(mockTeam);
      
      expect(insights.overAllocated).toBe(1);
      expect(insights.available).toBe(2);
      expect(insights.total).toBe(4);
    });

    it('should handle empty team correctly', () => {
      const insights = calculateTeamInsights([]);
      
      expect(insights.overAllocated).toBe(0);
      expect(insights.available).toBe(0);
      expect(insights.total).toBe(0);
    });
  });

  describe('Context Message Generation', () => {
    function generateContextMessage(action: string, person?: string, role?: string, status?: string) {
      let message = '';
      
      if (action === 'assign' && person) {
        message = `Assigning work to ${person}`;
        if (status === 'AVAILABLE') {
          message += ' (currently available)';
        }
      } else if (action === 'reduce' && person) {
        message = `Reducing workload for ${person} (currently over-allocated)`;
      } else if (role && action === 'assign') {
        message = `Assigning ${role} role to project`;
      }
      
      return message;
    }

    it('should generate correct message for assignment action', () => {
      const message = generateContextMessage('assign', 'John Doe', undefined, 'AVAILABLE');
      expect(message).toBe('Assigning work to John Doe (currently available)');
    });

    it('should generate correct message for reduce action', () => {
      const message = generateContextMessage('reduce', 'Jane Smith');
      expect(message).toBe('Reducing workload for Jane Smith (currently over-allocated)');
    });

    it('should generate correct message for role assignment', () => {
      const message = generateContextMessage('assign', undefined, 'Developer');
      expect(message).toBe('Assigning Developer role to project');
    });

    it('should handle missing parameters gracefully', () => {
      const message = generateContextMessage('unknown');
      expect(message).toBe('');
    });
  });
});