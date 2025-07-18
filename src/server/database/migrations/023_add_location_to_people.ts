import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop views that depend on the people table
  const viewsToDropForward = [
    'person_utilization_view',
    'person_availability_view',
    'project_health_view',
    'capacity_gaps_view',
    'project_demands_view',
    'project_demands_summary'
  ];
  
  for (const viewName of viewsToDropForward) {
    await knex.raw(`DROP VIEW IF EXISTS ${viewName}`);
  }

  // Add location_id column to people table
  await knex.schema.alterTable('people', (table) => {
    table.uuid('location_id').nullable().references('id').inTable('locations').onDelete('RESTRICT');
    table.index('location_id');
  });

  // Recreate all views that were dropped
  
  // 1. Project demands view
  await knex.raw(`
    CREATE VIEW project_demands_view AS
    WITH standard_demands AS (
      SELECT 
        p.id as project_id,
        ppt.phase_id,
        sa.role_id,
        ppt.start_date,
        ppt.end_date,
        CAST(
          sa.allocation_percentage * 
          (julianday(ppt.end_date) - julianday(ppt.start_date) + 1) * 
          8 / 100 AS DECIMAL(10,2)
        ) as demand_hours,
        0 as is_override
      FROM projects p
      INNER JOIN project_phases_timeline ppt ON p.id = ppt.project_id
      INNER JOIN standard_allocations sa ON p.project_type_id = sa.project_type_id 
        AND ppt.phase_id = sa.phase_id
      WHERE p.include_in_demand = 1
    ),
    override_demands AS (
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
    all_demands AS (
      SELECT * FROM override_demands
      UNION ALL
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
      pao.start_date as override_start,
      pao.end_date as override_end,
      pao.availability_percentage as override_percentage,
      pao.override_type,
      pao.reason as override_reason,
      CASE 
        WHEN pao.id IS NOT NULL 
          AND DATE('now') BETWEEN pao.start_date AND pao.end_date 
          AND pao.is_approved = 1
        THEN pao.availability_percentage
        ELSE p.default_availability_percentage
      END as effective_availability_percentage,
      CASE 
        WHEN pao.id IS NOT NULL 
          AND DATE('now') BETWEEN pao.start_date AND pao.end_date 
          AND pao.is_approved = 1
        THEN COALESCE(pao.hours_per_day, p.default_hours_per_day * pao.availability_percentage / 100.0)
        ELSE p.default_hours_per_day
      END as effective_hours_per_day,
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

  // 4. Person utilization view with location support
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
      -- Calculate current availability (considering overrides)
      CASE 
        WHEN pao.availability_percentage IS NOT NULL THEN pao.availability_percentage
        ELSE p.default_availability_percentage
      END as current_availability_percentage,
      -- Allocation status
      CASE 
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) > CASE 
          WHEN pao.availability_percentage IS NOT NULL THEN pao.availability_percentage
          ELSE p.default_availability_percentage
        END THEN 'OVER_ALLOCATED'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) = CASE 
          WHEN pao.availability_percentage IS NOT NULL THEN pao.availability_percentage
          ELSE p.default_availability_percentage
        END THEN 'FULLY_ALLOCATED'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) > 0 THEN 'PARTIALLY_ALLOCATED'
        ELSE 'UNDER_ALLOCATED'
      END as allocation_status
    FROM people p
    LEFT JOIN people sup ON p.supervisor_id = sup.id
    LEFT JOIN project_assignments pa ON p.id = pa.person_id
    LEFT JOIN projects pr ON pa.project_id = pr.id
    LEFT JOIN person_availability_overrides pao ON p.id = pao.person_id 
      AND date('now') BETWEEN pao.start_date AND pao.end_date
      AND pao.is_approved = 1
    GROUP BY p.id, p.name, p.supervisor_id, sup.name, p.default_availability_percentage, 
             p.default_hours_per_day, pao.availability_percentage
  `);

  // 5. Capacity gaps view
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
        sa.role_id,
        COUNT(DISTINCT p.id) as projects_needing_role,
        AVG(sa.allocation_percentage) as avg_allocation_needed,
        SUM(sa.allocation_percentage) / 100.0 as total_demand_fte
      FROM standard_allocations sa
      INNER JOIN projects p ON sa.project_type_id = p.project_type_id
      WHERE p.include_in_demand = 1
        AND (p.aspiration_start IS NULL OR p.aspiration_start <= DATE('now', '+90 days'))
        AND (p.aspiration_finish IS NULL OR p.aspiration_finish >= DATE('now'))
      GROUP BY sa.role_id
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

  // 6. Project health view
  await knex.raw(`
    CREATE VIEW project_health_view AS
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.project_type_id,
      pt.name as project_type,
      p.location_id,
      l.name as location,
      p.priority,
      p.aspiration_start,
      p.aspiration_finish,
      p.owner_id,
      owner.name as owner_name,
      (SELECT COUNT(*) FROM project_phases_timeline WHERE project_id = p.id) as phase_count,
      (SELECT COUNT(DISTINCT person_id) FROM project_assignments WHERE project_id = p.id) as people_assigned,
      (SELECT COUNT(*) FROM project_planners WHERE project_id = p.id) as planner_count,
      (SELECT pp_person.name 
       FROM project_planners pp 
       INNER JOIN people pp_person ON pp.person_id = pp_person.id
       WHERE pp.project_id = p.id AND pp.is_primary_planner = 1 
       LIMIT 1) as primary_planner_name,
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
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN people owner ON p.owner_id = owner.id
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop views first
  const viewsToDropBackward = [
    'person_utilization_view',
    'person_availability_view',
    'project_health_view',
    'capacity_gaps_view',
    'project_demands_view',
    'project_demands_summary'
  ];
  
  for (const viewName of viewsToDropBackward) {
    await knex.raw(`DROP VIEW IF EXISTS ${viewName}`);
  }

  // Remove location_id column from people table
  await knex.schema.alterTable('people', (table) => {
    table.dropIndex(['location_id']);
    table.dropColumn('location_id');
  });

  // Recreate all views in the correct order
  
  // 1. Project demands view
  await knex.raw(`
    CREATE VIEW project_demands_view AS
    WITH standard_demands AS (
      SELECT 
        p.id as project_id,
        ppt.phase_id,
        sa.role_id,
        ppt.start_date,
        ppt.end_date,
        CAST(
          sa.allocation_percentage * 
          (julianday(ppt.end_date) - julianday(ppt.start_date) + 1) * 
          8 / 100 AS DECIMAL(10,2)
        ) as demand_hours,
        0 as is_override
      FROM projects p
      INNER JOIN project_phases_timeline ppt ON p.id = ppt.project_id
      INNER JOIN standard_allocations sa ON p.project_type_id = sa.project_type_id 
        AND ppt.phase_id = sa.phase_id
      WHERE p.include_in_demand = 1
    ),
    override_demands AS (
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
    all_demands AS (
      SELECT * FROM override_demands
      UNION ALL
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
      pao.start_date as override_start,
      pao.end_date as override_end,
      pao.availability_percentage as override_percentage,
      pao.override_type,
      pao.reason as override_reason,
      CASE 
        WHEN pao.id IS NOT NULL 
          AND DATE('now') BETWEEN pao.start_date AND pao.end_date 
          AND pao.is_approved = 1
        THEN pao.availability_percentage
        ELSE p.default_availability_percentage
      END as effective_availability_percentage,
      CASE 
        WHEN pao.id IS NOT NULL 
          AND DATE('now') BETWEEN pao.start_date AND pao.end_date 
          AND pao.is_approved = 1
        THEN COALESCE(pao.hours_per_day, p.default_hours_per_day * pao.availability_percentage / 100.0)
        ELSE p.default_hours_per_day
      END as effective_hours_per_day,
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

  // 4. Person utilization view (original without location)
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
      AND pa.start_date <= DATE('now', '+30 days')
      AND pa.end_date >= DATE('now')
    LEFT JOIN projects pr ON pa.project_id = pr.id
    GROUP BY p.id, p.name, p.supervisor_id, sup.name, p.default_availability_percentage, p.default_hours_per_day
  `);

  // 5. Capacity gaps view
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
        sa.role_id,
        COUNT(DISTINCT p.id) as projects_needing_role,
        AVG(sa.allocation_percentage) as avg_allocation_needed,
        SUM(sa.allocation_percentage) / 100.0 as total_demand_fte
      FROM standard_allocations sa
      INNER JOIN projects p ON sa.project_type_id = p.project_type_id
      WHERE p.include_in_demand = 1
        AND (p.aspiration_start IS NULL OR p.aspiration_start <= DATE('now', '+90 days'))
        AND (p.aspiration_finish IS NULL OR p.aspiration_finish >= DATE('now'))
      GROUP BY sa.role_id
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

  // 6. Project health view
  await knex.raw(`
    CREATE VIEW project_health_view AS
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.project_type_id,
      pt.name as project_type,
      p.location_id,
      l.name as location,
      p.priority,
      p.aspiration_start,
      p.aspiration_finish,
      p.owner_id,
      owner.name as owner_name,
      (SELECT COUNT(*) FROM project_phases_timeline WHERE project_id = p.id) as phase_count,
      (SELECT COUNT(DISTINCT person_id) FROM project_assignments WHERE project_id = p.id) as people_assigned,
      (SELECT COUNT(*) FROM project_planners WHERE project_id = p.id) as planner_count,
      (SELECT pp_person.name 
       FROM project_planners pp 
       INNER JOIN people pp_person ON pp.person_id = pp_person.id
       WHERE pp.project_id = p.id AND pp.is_primary_planner = 1 
       LIMIT 1) as primary_planner_name,
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
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN people owner ON p.owner_id = owner.id
  `);
}