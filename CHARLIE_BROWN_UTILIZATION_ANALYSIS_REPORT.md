# Charlie Brown Utilization Analysis Report

## Executive Summary

This report analyzes Charlie Brown's assignment schedule to understand the UX issue where he shows **57% utilization in filtered view** but **116% total utilization**. The analysis reveals significant insights about how utilization calculations work and provides concrete recommendations for improving the user experience.

## Person Profile

- **Name:** Charlie Brown
- **Person ID:** `123e4567-e89b-12d3-a456-426614174002`
- **Primary Role:** Business Analyst (Proficiency Level 4)
- **Location:** New York City
- **Availability:** 100% (8 hours/day)
- **Worker Type:** Full-Time Employee (FTE)

## Assignment Overview

Charlie Brown has **14 total assignments** spanning from March 2023 to April 2026, with varying roles and allocation percentages.

### Assignments by Date Range

#### Within Filtered Range (2025-07-23 to 2025-10-23): 3 assignments
1. **Quantum Computing Research Prototype**
   - Role: Frontend Developer
   - Dates: 2025-07-17 to 2025-08-01
   - Allocation: 50%

2. **SOX Compliance Automation** (Duplicate Entry #1)
   - Role: Backend Developer
   - Dates: 2025-07-23 to 2025-10-21
   - Allocation: 13%

3. **SOX Compliance Automation** (Duplicate Entry #2)
   - Role: Backend Developer
   - Dates: 2025-07-23 to 2025-10-21
   - Allocation: 13%

#### Outside Filtered Range: 11 assignments
Historical assignments from 2023-2024 and future assignments in 2026, totaling 701% if all overlapped.

## Monthly Utilization Breakdown

### Filtered Period Analysis

| Month | Utilization | Status | Assignments |
|-------|-------------|--------|-------------|
| 2025-07 | 76.0% | 🔍 IN FILTER | Quantum Computing (50%) + SOX Compliance (13% × 2) |
| 2025-08 | 26.0% | 🔍 IN FILTER | SOX Compliance (13% × 2) |
| 2025-09 | 26.0% | 🔍 IN FILTER | SOX Compliance (13% × 2) |
| 2025-10 | 26.0% | 🔍 IN FILTER | SOX Compliance (13% × 2) |

- **Peak Filtered Utilization:** 76.0% (July 2025)
- **Average Filtered Utilization:** 38.5%

### Historical Peak Analysis

- **Peak Overall Utilization:** 100.0% (June & July 2023)
- **Average Overall Utilization:** 57.2%
- **Active Months:** 18 months total

## Key Findings

### 1. Discrepancy in Reported Numbers

- **User Reported:** Filtered 57% | Total 116%
- **Database Shows:** Filtered 76% | Total 100%

The numbers don't exactly match, suggesting:
- Different calculation methods in the UI
- Possible caching issues
- Different date ranges being used
- UI might be showing scenario data vs. actual assignments

### 2. Root Cause of UX Confusion

The confusion arises because:
1. **Filtered view** only shows assignments within the selected date range
2. **Total view** shows peak utilization across all time periods
3. Users expect these numbers to be related or clearly explained
4. There's no visual indication of what each percentage represents

### 3. Data Quality Issues

- **Duplicate Assignments:** SOX Compliance Automation appears twice with identical details
- **Role Diversity:** Charlie is assigned to roles outside his primary Business Analyst role (Frontend Developer, Backend Developer, etc.)
- **Over-allocation:** Some months show 100% utilization from overlapping assignments

## UX Improvement Recommendations

### 1. Clear Labeling & Context
```
Current: "57% | 116%"
Improved: "Current Period: 76% (Jul-Oct 2025) | Peak Historical: 100% (All Time)"
```

### 2. Visual Design Improvements
- **Color Coding:** Blue for filtered period, Gray for historical data
- **Progress Bars:** Visual representation of utilization levels
- **Warning Indicators:** Red highlighting for over-allocation (>100%)
- **Assignment Timeline:** Interactive Gantt chart showing all assignments

### 3. Interactive Features
- **Toggle Button:** "Show filtered assignments only" / "Show all assignments"
- **Hoverable Tooltips:** Detailed explanations for each metric
- **Monthly Breakdown:** Expandable section showing month-by-month utilization
- **Assignment Details:** Click to view project information and role details

### 4. Information Architecture
```
📊 Charlie Brown - Utilization Summary
┌─ Current Period (Jul 23 - Oct 23, 2025)    ┐
│  🔍 76% Peak Utilization                   │
│  📋 3 Active Assignments                   │
│  📅 4 Months Coverage                      │
└─────────────────────────────────────────────┘

┌─ Historical Overview (All Time)            ┐
│  📈 100% Peak Utilization                  │
│  📋 14 Total Assignments                   │
│  📅 18 Active Months                       │
│  ⚠️  2 Over-allocated Months               │
└─────────────────────────────────────────────┘
```

### 5. Warning System
- **Capacity Alerts:** Highlight months with >100% utilization
- **Data Quality Warnings:** Flag duplicate assignments
- **Workload Balance:** Suggest redistribution for over-allocated periods

## Technical Implementation Notes

### Database Structure
- **Table:** `project_assignments`
- **Key Fields:** `person_id`, `start_date`, `end_date`, `allocation_percentage`
- **Joins:** Projects, roles, and phases for context

### Calculation Method
The utilization timeline uses the existing `getPersonUtilizationTimeline` method:
1. Query assignments for person within date range
2. Generate monthly data points
3. Sum overlapping assignment percentages per month
4. Filter timeline to relevant months only

### API Endpoint
```
GET /api/people/{id}/utilization-timeline?startDate=2023-01-01&endDate=2026-12-31
```

## Next Steps

1. **Immediate Fixes:**
   - Remove duplicate SOX Compliance assignments
   - Add clear labels to utilization displays
   - Implement warning indicators for over-allocation

2. **Short-term Improvements:**
   - Add tooltip explanations
   - Create toggle for filtered vs. total view
   - Implement color coding system

3. **Long-term Enhancements:**
   - Interactive timeline visualization
   - Workload balancing recommendations
   - Enhanced mobile responsiveness

## Conclusion

The analysis reveals that Charlie Brown's utilization discrepancy is primarily a UX issue rather than a data problem. The filtered view (76%) represents his current period workload, while the total view (100%) shows his historical peak utilization. By implementing the recommended UX improvements, users will have a much clearer understanding of resource allocation and capacity planning.

The solution involves better information architecture, clearer labeling, visual improvements, and interactive features that help users understand the difference between current and historical utilization metrics.

---

*Report generated by Charlie Brown Assignment Analysis Tool*  
*Database: `/home/tony/GitHub/Capacinator/data/capacinator.db`*  
*Analysis Date: 2025-07-23*