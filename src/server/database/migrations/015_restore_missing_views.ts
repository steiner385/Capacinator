import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Restoring missing database views...');

  // 1. Project demands view - updated to handle project_sub_types
  await knex.raw(`
    CREATE VIEW project_demands_view AS
    WITH standard_demands AS (
      -- Calculate demands from resource templates (updated table name)
      SELECT 
        p.id as project_id,
        ppt.phase_id,
        rt.role_id,
        ppt.start_date,
        ppt.end_date,
        -- Calculate hours based on allocation percentage and working days
        CAST(
          rt.allocation_percentage * 
          (julianday(ppt.end_date) - julianday(ppt.start_date) + 1) * 
          8 / 100 AS DECIMAL(10,2)
        ) as demand_hours,
        0 as is_override
      FROM projects p
      INNER JOIN project_phases_timeline ppt ON p.id = ppt.project_id
      INNER JOIN resource_templates rt ON (
        (p.project_sub_type_id IS NOT NULL AND rt.project_sub_type_id = p.project_sub_type_id) OR
        (p.project_sub_type_id IS NULL AND rt.project_type_id = p.project_type_id)
      ) AND ppt.phase_id = rt.phase_id
      WHERE p.include_in_demand = 1
    ),
    override_demands AS (
      -- Get all override demands
      SELECT 
        project_id,
        phase_id,
        role_id,
        start_date,
        end_date,
        demand_hours,
        1 as is_override
      FROM demand_overrides
    ),
    -- Combine demands, with overrides taking precedence
    all_demands AS (
      SELECT * FROM override_demands
      UNION ALL
      -- Only include standard demands that don't have overlapping overrides
      SELECT sd.* 
      FROM standard_demands sd
      WHERE NOT EXISTS (
        SELECT 1 
        FROM override_demands od
        WHERE od.project_id = sd.project_id
          AND od.role_id = sd.role_id
          AND (
            (od.phase_id IS NULL OR od.phase_id = sd.phase_id)
            AND od.start_date <= sd.end_date
            AND od.end_date >= sd.start_date
          )
      )
    )
    SELECT 
      project_id,
      phase_id,
      role_id,
      start_date,
      end_date,
      demand_hours,
      is_override
    FROM all_demands
  `);

  // 2. Project demands summary view
  await knex.raw(`
    CREATE VIEW project_demands_summary AS
    SELECT 
      pd.project_id,
      p.name as project_name,
      pd.role_id,
      r.name as role_name,
      pd.start_date,
      pd.end_date,
      SUM(pd.demand_hours) as total_demand_hours,
      MAX(pd.is_override) as has_override
    FROM project_demands_view pd
    INNER JOIN projects p ON pd.project_id = p.id
    INNER JOIN roles r ON pd.role_id = r.id
    GROUP BY pd.project_id, p.name, pd.role_id, r.name, pd.start_date, pd.end_date
  `);

  // 3. Person availability view
  await knex.raw(`
    CREATE VIEW person_availability_view AS
    SELECT 
      p.id as person_id,
      p.name as person_name,
      p.supervisor_id,
      sup.name as supervisor_name,
      p.default_availability_percentage,
      p.default_hours_per_day,
      -- Current override if any
      pao.start_date as override_start,
      pao.end_date as override_end,
      pao.availability_percentage as override_percentage,
      pao.override_type,
      pao.reason as override_reason,
      -- Effective availability (use override if within date range, else default)
      CASE 
        WHEN pao.id IS NOT NULL 
          AND DATE('now') BETWEEN pao.start_date AND pao.end_date 
          AND pao.is_approved = 1
        THEN pao.availability_percentage
        ELSE p.default_availability_percentage
      END as effective_availability_percentage,
      -- Effective hours
      CASE 
        WHEN pao.id IS NOT NULL 
          AND DATE('now') BETWEEN pao.start_date AND pao.end_date 
          AND pao.is_approved = 1
        THEN COALESCE(pao.hours_per_day, p.default_hours_per_day * pao.availability_percentage / 100.0)
        ELSE p.default_hours_per_day
      END as effective_hours_per_day,
      -- Status
      CASE 
        WHEN pao.id IS NOT NULL 
          AND DATE('now') BETWEEN pao.start_date AND pao.end_date 
          AND pao.is_approved = 1
        THEN 
          CASE 
            WHEN pao.availability_percentage = 0 THEN 'UNAVAILABLE'
            WHEN pao.availability_percentage < 50 THEN 'LIMITED'
            WHEN pao.availability_percentage < 100 THEN 'PARTIAL'
            ELSE 'AVAILABLE'
          END
        ELSE 'AVAILABLE'
      END as availability_status
    FROM people p
    LEFT JOIN people sup ON p.supervisor_id = sup.id
    LEFT JOIN person_availability_overrides pao ON p.id = pao.person_id
      AND DATE('now') BETWEEN pao.start_date AND pao.end_date
      AND pao.is_approved = 1
  `);

  // 4. Person utilization view
  await knex.raw(`
    CREATE VIEW person_utilization_view AS
    SELECT 
      p.id as person_id,
      p.name as person_name,
      p.supervisor_id,
      sup.name as supervisor_name,
      COALESCE(SUM(pa.allocation_percentage), 0) as total_allocation,
      COUNT(DISTINCT pa.project_id) as project_count,
      GROUP_CONCAT(DISTINCT pr.name) as projects,
      p.default_availability_percentage,
      p.default_hours_per_day,
      -- Current availability considering overrides
      COALESCE(
        (SELECT pao.availability_percentage 
         FROM person_availability_overrides pao 
         WHERE pao.person_id = p.id 
           AND DATE('now') BETWEEN pao.start_date AND pao.end_date 
           AND pao.is_approved = 1 
         LIMIT 1),
        p.default_availability_percentage
      ) as current_availability_percentage,
      CASE 
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) > 100 THEN 'OVER_ALLOCATED'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) >= 90 THEN 'FULLY_ALLOCATED'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) >= 50 THEN 'PARTIALLY_ALLOCATED'
        ELSE 'UNDER_ALLOCATED'
      END as allocation_status
    FROM people p
    LEFT JOIN people sup ON p.supervisor_id = sup.id
    LEFT JOIN project_assignments pa ON p.id = pa.person_id 
      AND pa.computed_start_date <= DATE('now', '+30 days')
      AND pa.computed_end_date >= DATE('now')
    LEFT JOIN projects pr ON pa.project_id = pr.id
    GROUP BY p.id, p.name, p.supervisor_id, sup.name, p.default_availability_percentage, p.default_hours_per_day
  `);

  // 5. Capacity gaps view - updated to handle resource_templates instead of standard_allocations
  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    WITH role_summary AS (
      SELECT 
        r.id as role_id,
        r.name as role_name,
        COUNT(DISTINCT pr.person_id) as people_count,
        SUM(
          COALESCE(
            (SELECT pao.availability_percentage 
             FROM person_availability_overrides pao 
             WHERE pao.person_id = p.id 
               AND DATE('now') BETWEEN pao.start_date AND pao.end_date 
               AND pao.is_approved = 1 
             LIMIT 1),
            p.default_availability_percentage
          ) / 100.0
        ) as total_capacity_fte,
        GROUP_CONCAT(
          people_planners.name || CASE WHEN rp.is_primary = 1 THEN ' (Primary)' ELSE '' END,
          ', '
        ) as role_planners
      FROM roles r
      LEFT JOIN person_roles pr ON r.id = pr.role_id
      LEFT JOIN people p ON pr.person_id = p.id
      LEFT JOIN role_planners rp ON r.id = rp.role_id
      LEFT JOIN people people_planners ON rp.person_id = people_planners.id
      GROUP BY r.id, r.name
    ),
    role_demand AS (
      SELECT 
        rt.role_id,
        COUNT(DISTINCT p.id) as projects_needing_role,
        AVG(rt.allocation_percentage) as avg_allocation_needed,
        SUM(rt.allocation_percentage) / 100.0 as total_demand_fte
      FROM resource_templates rt
      INNER JOIN projects p ON (
        (p.project_sub_type_id IS NOT NULL AND rt.project_sub_type_id = p.project_sub_type_id) OR
        (p.project_sub_type_id IS NULL AND rt.project_type_id = p.project_type_id)
      )
      WHERE p.include_in_demand = 1
        AND (p.aspiration_start IS NULL OR p.aspiration_start <= DATE('now', '+90 days'))
        AND (p.aspiration_finish IS NULL OR p.aspiration_finish >= DATE('now'))
      GROUP BY rt.role_id
    )
    SELECT 
      rs.role_id,
      rs.role_name,
      rs.role_planners,
      rs.people_count,
      rs.total_capacity_fte,
      COALESCE(rd.projects_needing_role, 0) as projects_needing_role,
      COALESCE(rd.avg_allocation_needed, 0) as avg_allocation_needed,
      COALESCE(rd.total_demand_fte, 0) as total_demand_fte,
      rs.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) as gap_fte,
      CASE 
        WHEN rs.total_capacity_fte < COALESCE(rd.total_demand_fte, 0) THEN 'GAP'
        WHEN rs.total_capacity_fte < COALESCE(rd.total_demand_fte, 0) * 1.2 THEN 'TIGHT'
        ELSE 'OK'
      END as status
    FROM role_summary rs
    LEFT JOIN role_demand rd ON rs.role_id = rd.role_id
  `);

  // 6. Project health view - updated to handle project_sub_types
  await knex.raw(`
    CREATE VIEW project_health_view AS
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.project_type_id,
      pt.name as project_type,
      p.project_sub_type_id,
      pst.name as project_sub_type,
      p.location_id,
      l.name as location,
      p.priority,
      p.aspiration_start,
      p.aspiration_finish,
      p.owner_id,
      owner.name as owner_name,
      -- Count phases
      (SELECT COUNT(*) FROM project_phases_timeline WHERE project_id = p.id) as phase_count,
      -- Count assignments
      (SELECT COUNT(DISTINCT person_id) FROM project_assignments WHERE project_id = p.id) as people_assigned,
      -- Count planners
      (SELECT COUNT(*) FROM project_planners WHERE project_id = p.id) as planner_count,
      -- Primary planner
      (SELECT pp_person.name 
       FROM project_planners pp 
       INNER JOIN people pp_person ON pp.person_id = pp_person.id
       WHERE pp.project_id = p.id AND pp.is_primary_planner = 1 
       LIMIT 1) as primary_planner_name,
      -- Calculate health status
      CASE 
        WHEN p.aspiration_start IS NULL OR p.aspiration_finish IS NULL THEN 'PLANNING'
        WHEN DATE('now') < p.aspiration_start THEN 'NOT_STARTED'
        WHEN DATE('now') > p.aspiration_finish THEN 'OVERDUE'
        WHEN (SELECT COUNT(*) FROM project_assignments WHERE project_id = p.id) = 0 THEN 'NO_RESOURCES'
        WHEN (SELECT COUNT(*) FROM project_phases_timeline WHERE project_id = p.id) = 0 THEN 'NO_TIMELINE'
        ELSE 'ACTIVE'
      END as health_status
    FROM projects p
    LEFT JOIN project_types pt ON p.project_type_id = pt.id
    LEFT JOIN project_sub_types pst ON p.project_sub_type_id = pst.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN people owner ON p.owner_id = owner.id
  `);

  // 7. Supervisor permissions view
  await knex.raw(`
    CREATE VIEW supervisor_permissions_view AS
    SELECT 
      p.id as person_id,
      p.name as person_name,
      p.supervisor_id,
      sup.name as supervisor_name,
      1 as can_modify_availability,
      'DIRECT_SUPERVISOR' as permission_type
    FROM people p
    INNER JOIN people sup ON p.supervisor_id = sup.id
    
    UNION ALL
    
    SELECT 
      sd.person_id,
      p.name as person_name,
      sd.delegate_id as supervisor_id,
      del.name as supervisor_name,
      CASE WHEN sd.can_approve_availability = 1 THEN 1 ELSE 0 END as can_modify_availability,
      'DELEGATED_SUPERVISOR' as permission_type
    FROM supervisor_delegations sd
    INNER JOIN people p ON sd.person_id = p.id
    INNER JOIN people del ON sd.delegate_id = del.id
    WHERE (sd.start_date IS NULL OR sd.start_date <= DATE('now'))
      AND (sd.end_date IS NULL OR sd.end_date >= DATE('now'))
    
    UNION ALL
    
    SELECT 
      p.id as person_id,
      p.name as person_name,
      p.id as supervisor_id,
      p.name as supervisor_name,
      1 as can_modify_availability,
      'SELF' as permission_type
    FROM people p
  `);

  // 8. Role planner permissions view
  await knex.raw(`
    CREATE VIEW role_planner_permissions_view AS
    SELECT 
      r.id as role_id,
      r.name as role_name,
      rp.person_id,
      p.name as person_name,
      rp.is_primary,
      rp.can_allocate_resources,
      rp.can_approve_assignments,
      rp.can_modify_standard_allocations,
      rp.notes,
      rp.assigned_at,
      ap.name as assigned_by_name
    FROM roles r
    INNER JOIN role_planners rp ON r.id = rp.role_id
    INNER JOIN people p ON rp.person_id = p.id
    LEFT JOIN people ap ON rp.assigned_by = ap.id
    ORDER BY r.name, rp.is_primary DESC, p.name
  `);

  // 9. Project access view - updated to handle project_sub_types
  await knex.raw(`
    CREATE VIEW project_access_view AS
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.owner_id,
      po.name as owner_name,
      pp.person_id as planner_id,
      ppl.name as planner_name,
      pp.permission_level,
      pp.can_modify_type,
      pp.can_modify_roadmap,
      pp.can_add_overrides,
      pp.can_assign_resources,
      pp.is_primary_planner,
      CASE 
        WHEN p.owner_id = pp.person_id THEN 1
        ELSE 0
      END as is_owner
    FROM projects p
    LEFT JOIN people po ON p.owner_id = po.id
    LEFT JOIN project_planners pp ON p.id = pp.project_id
    LEFT JOIN people ppl ON pp.person_id = ppl.id
  `);

  console.log('✅ All database views restored successfully');
}

export async function down(knex: Knex): Promise<void> {
  const viewsToDropBackward = [
    'project_access_view',
    'role_planner_permissions_view',
    'supervisor_permissions_view',
    'project_health_view',
    'capacity_gaps_view',
    'person_utilization_view',
    'person_availability_view',
    'project_demands_summary',
    'project_demands_view'
  ];

  for (const viewName of viewsToDropBackward) {
    await knex.raw(`DROP VIEW IF EXISTS ${viewName}`);
  }
}