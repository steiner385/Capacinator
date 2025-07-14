# Detailed Scenario Comparison and Merge Workflows

Based on the API analysis and backend implementation, here's what the detailed scenario interfaces should show:

## 🔍 **Detailed Scenario Comparison Interface**

### **API Response Structure:**
```json
{
  "scenario1": {
    "id": "scenario-uuid",
    "name": "Resource Optimization Demo", 
    "description": "Demonstrating resource optimization strategies",
    "scenario_type": "branch",
    "status": "active"
  },
  "scenario2": {
    "id": "scenario-uuid",
    "name": "Advanced Operations Demo",
    "description": "Testing advanced scenario operations", 
    "scenario_type": "branch",
    "status": "active"
  },
  "differences": {
    "assignments": {
      "added": [...],     // New assignments in scenario2
      "modified": [...],  // Changed assignments between scenarios
      "removed": [...]    // Assignments removed in scenario2
    },
    "phases": {
      "added": [...],     // New project phases
      "modified": [...],  // Modified phase timelines
      "removed": [...]    // Removed phases
    },
    "projects": {
      "added": [...],     // New projects
      "modified": [...],  // Modified project details
      "removed": [...]    // Removed projects
    }
  },
  "metrics": {
    "utilization_impact": {
      // Resource utilization changes
    },
    "capacity_impact": {
      // Team capacity changes
    },
    "timeline_impact": {
      // Project timeline impacts
    }
  }
}
```

### **What the UI Should Display:**

#### **1. Scenario Overview Comparison**
```
┌─────────────────────────────────────────────────────────────────┐
│ Scenario Comparison: Resource Optimization vs Advanced Ops     │
├─────────────────────────────────────────────────────────────────┤
│ LEFT: Resource Optimization Demo                               │
│ • Type: Branch                                                  │
│ • Status: Active                                               │
│ • Created: 2025-07-13                                         │
│                                                                │
│ RIGHT: Advanced Operations Demo                                │
│ • Type: Branch                                                 │
│ • Status: Active                                              │
│ • Created: 2025-07-13                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### **2. Assignment Differences Detail**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Assignment Changes                                           │
├─────────────────────────────────────────────────────────────────┤
│ ➕ ADDED (3 assignments)                                        │
│   • Alice Johnson → Project Alpha (Developer, 75%)            │
│   • Bob Smith → Project Beta (Designer, 50%)                  │
│   • Carol Davis → Project Gamma (Manager, 100%)               │
│                                                                │
│ ✏️ MODIFIED (2 assignments)                                     │
│   • John Doe → Project Delta                                  │
│     - Allocation: 50% → 80%                                   │
│     - Role: Developer → Senior Developer                       │
│                                                                │
│ ➖ REMOVED (1 assignment)                                       │
│   • Jane Wilson → Project Echo (Tester, 60%)                  │
└─────────────────────────────────────────────────────────────────┘
```

#### **3. Timeline and Phase Changes**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📅 Timeline Changes                                             │
├─────────────────────────────────────────────────────────────────┤
│ ✏️ MODIFIED PHASES                                              │
│   • Project Alpha - Phase 1                                   │
│     - Start: 2025-01-01 → 2025-01-15 (+14 days)              │
│     - End: 2025-03-01 → 2025-03-31 (+30 days)                │
│                                                                │
│   • Project Beta - Phase 2                                    │
│     - Duration: 60 days → 45 days (-15 days)                  │
└─────────────────────────────────────────────────────────────────┘
```

#### **4. Impact Metrics**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Impact Analysis                                              │
├─────────────────────────────────────────────────────────────────┤
│ RESOURCE UTILIZATION                                           │
│ • Team utilization: 78% → 85% (+7%)                           │
│ • Over-allocated people: 2 → 0 (-2)                           │
│ • Available capacity: 15 person-days → 8 person-days          │
│                                                                │
│ TIMELINE IMPACT                                                │
│ • Projects affected: 5                                        │
│ • Total delay: +22 days                                       │
│ • Projects at risk: 1                                         │
│                                                                │
│ CAPACITY IMPACT                                                │
│ • Additional resource needs: 2.5 FTE                          │
│ • Skills gap: Frontend (1 person), Backend (0.5 person)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 **Detailed Merge Workflow Interface**

### **API Response Structure:**
```json
{
  "success": false,
  "message": "Merge conflicts detected. Manual resolution required.",
  "conflicts": 3,
  "conflict_details": [
    {
      "type": "assignment",
      "entity_id": "assignment-uuid",
      "conflict_description": "Assignment allocation conflict",
      "source_data": {
        "person_id": "alice-uuid",
        "project_id": "project-alpha-uuid", 
        "allocation_percentage": 50,
        "role_id": "developer-uuid"
      },
      "target_data": {
        "person_id": "alice-uuid",
        "project_id": "project-alpha-uuid",
        "allocation_percentage": 75,
        "role_id": "senior-developer-uuid"
      }
    }
  ]
}
```

### **What the UI Should Display:**

#### **1. Merge Initiation Interface**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔄 Merge Scenario: "Advanced Ops Child" → "Advanced Ops Demo"  │
├─────────────────────────────────────────────────────────────────┤
│ SOURCE: Advanced Ops Child                                     │
│ • 15 assignments                                               │
│ • 8 modified projects                                          │
│ • 12 phase changes                                             │
│                                                                │
│ TARGET: Advanced Ops Demo (Parent)                            │
│ • 12 assignments                                               │
│ • 6 projects                                                   │
│ • 10 phases                                                    │
│                                                                │
│ MERGE STRATEGY:                                                │
│ ○ Automatic (Auto-resolve conflicts using target priority)    │
│ ● Manual (Review each conflict individually)                   │
│ ○ Source Priority (Source scenario takes precedence)           │
│                                                                │
│ [Analyze Conflicts] [Cancel] [Proceed with Merge]             │
└─────────────────────────────────────────────────────────────────┘
```

#### **2. Conflict Resolution Interface**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚔️ Merge Conflicts (3 conflicts require resolution)            │
├─────────────────────────────────────────────────────────────────┤
│ CONFLICT 1: Assignment Allocation                              │
│ Person: Alice Johnson                                          │
│ Project: Project Alpha                                         │
│                                                                │
│ SOURCE (Child Scenario):           TARGET (Parent):           │
│ • Role: Senior Developer           • Role: Developer           │
│ • Allocation: 75%                  • Allocation: 50%          │
│ • Start: 2025-02-01                • Start: 2025-01-15        │
│                                                                │
│ RESOLUTION:                                                    │
│ ○ Keep Source (75%, Senior Dev)    ● Keep Target (50%, Dev)   │
│ ○ Create Custom Resolution                                     │
│                                                                │
│ ────────────────────────────────────────────────────────────── │
│                                                                │
│ CONFLICT 2: Project Timeline                                  │
│ Project: Project Beta - Phase 1                               │
│                                                                │
│ SOURCE: Jan 15 - Mar 31            TARGET: Jan 1 - Mar 1      │
│                                                                │
│ RESOLUTION:                                                    │
│ ● Keep Source (Extended timeline)  ○ Keep Target (Original)   │
│                                                                │
│ [Previous] [Next] [Resolve All] [Cancel Merge]                │
└─────────────────────────────────────────────────────────────────┘
```

#### **3. Merge Preview Interface**
```
┌─────────────────────────────────────────────────────────────────┐
│ 👁️ Merge Preview - Changes to be Applied                       │
├─────────────────────────────────────────────────────────────────┤
│ ASSIGNMENTS (5 changes):                                       │
│ ➕ Add: Bob Smith → Project Gamma (Designer, 60%)              │
│ ➕ Add: Carol Davis → Project Delta (Manager, 100%)            │
│ ✏️ Modify: Alice Johnson → Project Alpha (75% → 50%)           │
│ ➖ Remove: Jane Wilson → Project Echo                           │
│                                                                │
│ PROJECTS (2 changes):                                          │
│ ✏️ Modify: Project Beta timeline (Jan 15 - Mar 31)             │
│ ✏️ Modify: Project Alpha priority (High → Medium)              │
│                                                                │
│ PHASES (3 changes):                                            │
│ ➕ Add: Project Gamma - Discovery Phase                        │
│ ✏️ Modify: Project Beta - Development Phase (+15 days)         │
│                                                                │
│ IMPACT SUMMARY:                                                │
│ • Team utilization: 78% → 82%                                 │
│ • Resource conflicts: 0                                        │
│ • Timeline extension: +15 days average                         │
│                                                                │
│ [Back to Conflicts] [Execute Merge] [Cancel]                  │
└─────────────────────────────────────────────────────────────────┘
```

#### **4. Merge Completion Interface**
```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Merge Completed Successfully                                 │
├─────────────────────────────────────────────────────────────────┤
│ MERGE SUMMARY:                                                 │
│ • Source: Advanced Ops Child                                  │
│ • Target: Advanced Ops Demo                                   │
│ • Completed: 2025-07-13 10:30 AM                              │
│                                                                │
│ CHANGES APPLIED:                                               │
│ • 5 assignment changes                                         │
│ • 2 project modifications                                      │
│ • 3 phase updates                                              │
│ • 3 conflicts resolved manually                               │
│                                                                │
│ POST-MERGE STATUS:                                             │
│ • Child scenario: Marked as "merged"                          │
│ • Parent scenario: Updated with changes                        │
│ • Audit trail: Created                                         │
│                                                                │
│ [View Updated Scenario] [Create New Branch] [Back to List]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **Key UI Features for Detailed Workflows**

### **Comparison Interface Features:**
1. **Side-by-Side View**: Visual comparison of two scenarios
2. **Difference Highlighting**: Color-coded additions, modifications, deletions
3. **Impact Metrics**: Quantified resource and timeline impacts
4. **Drill-Down Details**: Click assignments/projects for detailed comparisons
5. **Export Options**: PDF reports, CSV exports of differences

### **Merge Interface Features:**
1. **Conflict Detection**: Automatic identification of conflicts
2. **Conflict Resolution**: Manual and automatic resolution options
3. **Merge Strategies**: Different approaches for handling conflicts
4. **Preview Mode**: See changes before applying them
5. **Rollback Capability**: Undo merges if needed
6. **Audit Trail**: Complete record of merge decisions

### **Data Visualization:**
1. **Resource Allocation Charts**: Before/after utilization
2. **Timeline Gantt Charts**: Project schedule comparisons
3. **Team Capacity Heatmaps**: Availability impact visualization
4. **Conflict Resolution Trees**: Visual workflow for complex merges

This detailed interface design would provide users with comprehensive visibility into scenario differences and full control over merge operations with conflict resolution capabilities.