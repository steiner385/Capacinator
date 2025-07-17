import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating user permissions system...');
  
  // Temporarily disable foreign key checks for SQLite
  await knex.raw('PRAGMA foreign_keys = OFF');

  // 1. Create system_permissions table
  await knex.schema.createTable('system_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.string('name').notNullable().unique();
    table.string('description').notNullable();
    table.string('category').notNullable(); // 'system', 'project', 'people', 'reporting', etc.
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['category', 'is_active']);
  });

  // 2. Create user_roles table
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.string('name').notNullable().unique();
    table.string('description').notNullable();
    table.integer('priority').notNullable().defaultTo(100); // Lower number = higher priority
    table.boolean('is_system_admin').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index('priority');
    table.index('is_system_admin');
  });

  // 3. Create user_role_permissions table (many-to-many)
  await knex.schema.createTable('user_role_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('user_role_id').references('id').inTable('user_roles').onDelete('CASCADE');
    table.uuid('permission_id').references('id').inTable('system_permissions').onDelete('CASCADE');
    table.timestamps(true, true);
    
    table.unique(['user_role_id', 'permission_id']);
    table.index(['user_role_id', 'permission_id']);
  });

  // 4. Create user_permissions table (user-specific overrides) - create without foreign keys first
  await knex.schema.createTable('user_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('person_id').notNullable();
    table.uuid('permission_id').notNullable();
    table.boolean('granted').notNullable(); // true = granted, false = denied
    table.uuid('granted_by').nullable();
    table.timestamp('granted_at').defaultTo(knex.fn.now());
    table.string('reason').nullable();
    table.timestamps(true, true);
    
    table.unique(['person_id', 'permission_id']);
    table.index(['person_id', 'granted']);
  });

  // 5. Drop all views that might depend on people table
  await knex.raw('DROP VIEW IF EXISTS scenario_assignments_view');
  await knex.raw('DROP VIEW IF EXISTS supervisor_permissions_view');
  await knex.raw('DROP VIEW IF EXISTS role_planner_permissions_view');
  await knex.raw('DROP VIEW IF EXISTS project_access_view');
  await knex.raw('DROP VIEW IF EXISTS person_availability_view');
  await knex.raw('DROP VIEW IF EXISTS project_demands_summary');
  await knex.raw('DROP VIEW IF EXISTS project_health_view');
  await knex.raw('DROP VIEW IF EXISTS person_utilization_view');
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');

  // 6. Add user_role_id to people table
  await knex.schema.table('people', (table) => {
    table.uuid('user_role_id').nullable();
    table.boolean('is_system_admin').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login').nullable();
    
    table.index('user_role_id');
    table.index('is_system_admin');
    table.index('is_active');
  });
  
  // Add foreign key constraint after the column is created
  await knex.schema.table('people', (table) => {
    table.foreign('user_role_id').references('id').inTable('user_roles').onDelete('SET NULL');
  });

  // 7. Recreate views that depend on people table
  await knex.raw(`
    CREATE VIEW project_demands_view AS
    WITH standard_demands AS (
      -- Calculate demands from standard allocations
      SELECT 
        p.id as project_id,
        ppt.phase_id,
        sa.role_id,
        ppt.start_date,
        ppt.end_date,
        -- Calculate hours based on allocation percentage and working days
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
          AND od.phase_id = sd.phase_id
          AND od.role_id = sd.role_id
          AND od.start_date <= sd.end_date
          AND od.end_date >= sd.start_date
      )
    )
    SELECT * FROM all_demands
  `);

  await knex.raw(`
    CREATE VIEW person_utilization_view AS
    SELECT 
      p.id as person_id,
      p.name as person_name,
      pr.name as primary_role,
      p.default_availability_percentage,
      p.default_hours_per_day,
      -- Calculate total allocation percentage
      COALESCE(
        (
          SELECT SUM(pa.allocation_percentage)
          FROM project_assignments pa
          WHERE pa.person_id = p.id
            AND pa.start_date <= date('now')
            AND pa.end_date >= date('now')
        ), 0
      ) as total_allocation,
      -- Calculate available capacity
      p.default_availability_percentage - COALESCE(
        (
          SELECT SUM(pa.allocation_percentage)
          FROM project_assignments pa
          WHERE pa.person_id = p.id
            AND pa.start_date <= date('now')
            AND pa.end_date >= date('now')
        ), 0
      ) as available_capacity,
      -- Count active assignments
      COALESCE(
        (
          SELECT COUNT(*)
          FROM project_assignments pa
          WHERE pa.person_id = p.id
            AND pa.start_date <= date('now')
            AND pa.end_date >= date('now')
        ), 0
      ) as active_assignments
    FROM people p
    LEFT JOIN roles pr ON p.primary_role_id = pr.id
    WHERE p.is_active = 1
  `);

  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    WITH role_capacity AS (
      SELECT 
        r.id as role_id,
        r.name as role_name,
        COUNT(DISTINCT p.id) as total_people,
        -- Calculate total capacity in FTE
        SUM(p.default_availability_percentage / 100.0) as total_capacity_fte
      FROM roles r
      LEFT JOIN people p ON r.id = p.primary_role_id AND p.is_active = 1
      GROUP BY r.id, r.name
    ),
    role_demand AS (
      SELECT 
        pdv.role_id,
        -- Calculate current demand in FTE (assuming 8 hours per day, 5 days per week)
        SUM(pdv.demand_hours) / (8 * 5) as total_demand_fte
      FROM project_demands_view pdv
      WHERE pdv.start_date <= date('now')
        AND pdv.end_date >= date('now')
      GROUP BY pdv.role_id
    )
    SELECT 
      rc.role_id,
      rc.role_name,
      rc.total_people,
      rc.total_capacity_fte,
      COALESCE(rd.total_demand_fte, 0) as total_demand_fte,
      -- Calculate gap (negative means shortage)
      rc.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) as gap_fte,
      -- Determine status
      CASE 
        WHEN rc.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) < 0 THEN 'GAP'
        WHEN rc.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) = 0 THEN 'EXACT'
        ELSE 'SURPLUS'
      END as status
    FROM role_capacity rc
    LEFT JOIN role_demand rd ON rc.role_id = rd.role_id
    ORDER BY gap_fte ASC
  `);

  await knex.raw(`
    CREATE VIEW project_health_view AS
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.priority,
      pt.name as project_type,
      l.name as location,
      -- Calculate project health metrics
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM project_assignments pa 
          WHERE pa.project_id = p.id 
            AND pa.start_date <= date('now') 
            AND pa.end_date >= date('now')
        ) THEN 'ACTIVE'
        WHEN p.aspiration_start > date('now') THEN 'PLANNED'
        ELSE 'INACTIVE'
      END as status,
      -- Count assigned people
      COALESCE(
        (
          SELECT COUNT(DISTINCT pa.person_id)
          FROM project_assignments pa
          WHERE pa.project_id = p.id
            AND pa.start_date <= date('now')
            AND pa.end_date >= date('now')
        ), 0
      ) as assigned_people,
      -- Calculate total demand
      COALESCE(
        (
          SELECT SUM(pdv.demand_hours)
          FROM project_demands_view pdv
          WHERE pdv.project_id = p.id
            AND pdv.start_date <= date('now')
            AND pdv.end_date >= date('now')
        ), 0
      ) as current_demand_hours,
      -- Calculate fulfillment percentage
      CASE 
        WHEN COALESCE(
          (
            SELECT SUM(pdv.demand_hours)
            FROM project_demands_view pdv
            WHERE pdv.project_id = p.id
              AND pdv.start_date <= date('now')
              AND pdv.end_date >= date('now')
          ), 0
        ) = 0 THEN 100
        ELSE CAST(
          COALESCE(
            (
              SELECT SUM(pa.allocation_percentage * pa.default_hours_per_day)
              FROM project_assignments pa
              INNER JOIN people pe ON pa.person_id = pe.id
              WHERE pa.project_id = p.id
                AND pa.start_date <= date('now')
                AND pa.end_date >= date('now')
            ), 0
          ) * 100.0 / 
          COALESCE(
            (
              SELECT SUM(pdv.demand_hours)
              FROM project_demands_view pdv
              WHERE pdv.project_id = p.id
                AND pdv.start_date <= date('now')
                AND pdv.end_date >= date('now')
            ), 0
          ) AS INTEGER
        )
      END as fulfillment_percentage
    FROM projects p
    LEFT JOIN project_types pt ON p.project_type_id = pt.id
    LEFT JOIN locations l ON p.location_id = l.id
    WHERE p.include_in_demand = 1
    ORDER BY p.priority ASC, p.name ASC
  `);

  // 8. Insert default system permissions
  const permissions = [
    // System Administration
    { name: 'system:admin', description: 'Full system administration access', category: 'system' },
    { name: 'system:settings', description: 'Manage system settings', category: 'system' },
    { name: 'system:users', description: 'Manage user accounts and permissions', category: 'system' },
    { name: 'system:audit', description: 'View audit logs', category: 'system' },
    { name: 'system:backup', description: 'Manage system backups', category: 'system' },
    
    // Project Management
    { name: 'project:create', description: 'Create new projects', category: 'project' },
    { name: 'project:view', description: 'View project details', category: 'project' },
    { name: 'project:edit', description: 'Edit project details', category: 'project' },
    { name: 'project:delete', description: 'Delete projects', category: 'project' },
    { name: 'project:assign', description: 'Assign people to projects', category: 'project' },
    { name: 'project:phases', description: 'Manage project phases', category: 'project' },
    { name: 'project:types', description: 'Manage project types', category: 'project' },
    
    // People Management
    { name: 'people:create', description: 'Create new people records', category: 'people' },
    { name: 'people:view', description: 'View people information', category: 'people' },
    { name: 'people:edit', description: 'Edit people information', category: 'people' },
    { name: 'people:delete', description: 'Delete people records', category: 'people' },
    { name: 'people:availability', description: 'Manage people availability', category: 'people' },
    { name: 'people:assignments', description: 'Manage people assignments', category: 'people' },
    
    // Role Management
    { name: 'role:create', description: 'Create new roles', category: 'role' },
    { name: 'role:view', description: 'View role information', category: 'role' },
    { name: 'role:edit', description: 'Edit role information', category: 'role' },
    { name: 'role:delete', description: 'Delete roles', category: 'role' },
    { name: 'role:planning', description: 'Manage role planning permissions', category: 'role' },
    
    // Reporting
    { name: 'report:view', description: 'View reports', category: 'reporting' },
    { name: 'report:export', description: 'Export reports', category: 'reporting' },
    { name: 'report:advanced', description: 'Access advanced reporting features', category: 'reporting' },
    
    // Scenarios
    { name: 'scenario:create', description: 'Create new scenarios', category: 'scenario' },
    { name: 'scenario:view', description: 'View scenarios', category: 'scenario' },
    { name: 'scenario:edit', description: 'Edit scenarios', category: 'scenario' },
    { name: 'scenario:delete', description: 'Delete scenarios', category: 'scenario' },
    
    // Import/Export
    { name: 'import:data', description: 'Import data from external sources', category: 'import' },
    { name: 'export:data', description: 'Export data to external formats', category: 'import' }
  ];

  const insertedPermissions = await knex('system_permissions').insert(permissions).returning('*');
  console.log(`✅ Inserted ${insertedPermissions.length} system permissions`);

  // 9. Insert default user roles
  const roles = [
    { name: 'System Administrator', description: 'Full system access', priority: 1, is_system_admin: true },
    { name: 'Project Manager', description: 'Can manage projects and assignments', priority: 10, is_system_admin: false },
    { name: 'Resource Manager', description: 'Can manage people and availability', priority: 20, is_system_admin: false },
    { name: 'Team Lead', description: 'Can manage team assignments and availability', priority: 30, is_system_admin: false },
    { name: 'Planner', description: 'Can create and manage projects', priority: 40, is_system_admin: false },
    { name: 'Viewer', description: 'Read-only access to projects and reports', priority: 100, is_system_admin: false }
  ];

  const insertedRoles = await knex('user_roles').insert(roles).returning('*');
  console.log(`✅ Inserted ${insertedRoles.length} user roles`);

  // 10. Set up default role permissions
  const rolePermissions = [];
  
  // System Administrator gets all permissions
  const adminRole = insertedRoles.find(r => r.name === 'System Administrator');
  if (adminRole) {
    const allPermissions = await knex('system_permissions').select('id');
    for (const permission of allPermissions) {
      rolePermissions.push({
        user_role_id: adminRole.id,
        permission_id: permission.id
      });
    }
  }

  // Project Manager permissions
  const pmRole = insertedRoles.find(r => r.name === 'Project Manager');
  if (pmRole) {
    const pmPermissions = await knex('system_permissions')
      .select('id')
      .whereIn('name', [
        'project:create', 'project:view', 'project:edit', 'project:assign', 'project:phases', 'project:types',
        'people:view', 'people:assignments', 'people:availability',
        'role:view', 'role:planning',
        'report:view', 'report:export',
        'scenario:create', 'scenario:view', 'scenario:edit'
      ]);
    
    for (const permission of pmPermissions) {
      rolePermissions.push({
        user_role_id: pmRole.id,
        permission_id: permission.id
      });
    }
  }

  // Resource Manager permissions
  const rmRole = insertedRoles.find(r => r.name === 'Resource Manager');
  if (rmRole) {
    const rmPermissions = await knex('system_permissions')
      .select('id')
      .whereIn('name', [
        'project:view', 'project:assign',
        'people:create', 'people:view', 'people:edit', 'people:availability', 'people:assignments',
        'role:create', 'role:view', 'role:edit', 'role:planning',
        'report:view', 'report:export'
      ]);
    
    for (const permission of rmPermissions) {
      rolePermissions.push({
        user_role_id: rmRole.id,
        permission_id: permission.id
      });
    }
  }

  // Team Lead permissions
  const tlRole = insertedRoles.find(r => r.name === 'Team Lead');
  if (tlRole) {
    const tlPermissions = await knex('system_permissions')
      .select('id')
      .whereIn('name', [
        'project:view', 'project:assign',
        'people:view', 'people:availability', 'people:assignments',
        'role:view',
        'report:view'
      ]);
    
    for (const permission of tlPermissions) {
      rolePermissions.push({
        user_role_id: tlRole.id,
        permission_id: permission.id
      });
    }
  }

  // Planner permissions
  const plannerRole = insertedRoles.find(r => r.name === 'Planner');
  if (plannerRole) {
    const plannerPermissions = await knex('system_permissions')
      .select('id')
      .whereIn('name', [
        'project:create', 'project:view', 'project:edit', 'project:phases',
        'people:view',
        'role:view',
        'report:view',
        'scenario:create', 'scenario:view', 'scenario:edit'
      ]);
    
    for (const permission of plannerPermissions) {
      rolePermissions.push({
        user_role_id: plannerRole.id,
        permission_id: permission.id
      });
    }
  }

  // Viewer permissions
  const viewerRole = insertedRoles.find(r => r.name === 'Viewer');
  if (viewerRole) {
    const viewerPermissions = await knex('system_permissions')
      .select('id')
      .whereIn('name', [
        'project:view',
        'people:view',
        'role:view',
        'report:view',
        'scenario:view'
      ]);
    
    for (const permission of viewerPermissions) {
      rolePermissions.push({
        user_role_id: viewerRole.id,
        permission_id: permission.id
      });
    }
  }

  if (rolePermissions.length > 0) {
    await knex('user_role_permissions').insert(rolePermissions);
    console.log(`✅ Inserted ${rolePermissions.length} role permissions`);
  }

  // 11. Set default user role for existing users (give them Viewer role)
  const viewerRoleId = insertedRoles.find(r => r.name === 'Viewer')?.id;
  if (viewerRoleId) {
    const peopleCount = await knex('people').count('* as count').first();
    if (peopleCount && peopleCount.count > 0) {
      await knex('people').update({ user_role_id: viewerRoleId });
      console.log('✅ Assigned default Viewer role to existing users');
    } else {
      console.log('✅ No existing users found, skipping role assignment');
    }
  }

  // 12. Add foreign key constraints after all data is populated
  await knex.schema.table('user_permissions', (table) => {
    table.foreign('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.foreign('permission_id').references('id').inTable('system_permissions').onDelete('CASCADE');
    table.foreign('granted_by').references('id').inTable('people').onDelete('SET NULL');
  });

  console.log('✅ User permissions system created successfully');
  
  // Re-enable foreign key checks
  await knex.raw('PRAGMA foreign_keys = ON');
}

export async function down(knex: Knex): Promise<void> {
  // Drop views first
  await knex.raw('DROP VIEW IF EXISTS project_health_view');
  await knex.raw('DROP VIEW IF EXISTS person_utilization_view');
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');

  // Remove columns from people table
  await knex.schema.table('people', (table) => {
    table.dropColumn('user_role_id');
    table.dropColumn('is_system_admin');
    table.dropColumn('is_active');
    table.dropColumn('last_login');
  });

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('user_permissions');
  await knex.schema.dropTableIfExists('user_role_permissions');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('system_permissions');

  // Recreate the views (simplified versions from original migrations)
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
          AND od.phase_id = sd.phase_id
          AND od.role_id = sd.role_id
          AND od.start_date <= sd.end_date
          AND od.end_date >= sd.start_date
      )
    )
    SELECT * FROM all_demands
  `);

  await knex.raw(`
    CREATE VIEW person_utilization_view AS
    SELECT 
      p.id as person_id,
      p.name as person_name,
      pr.name as primary_role,
      p.default_availability_percentage,
      p.default_hours_per_day,
      COALESCE(
        (
          SELECT SUM(pa.allocation_percentage)
          FROM project_assignments pa
          WHERE pa.person_id = p.id
            AND pa.start_date <= date('now')
            AND pa.end_date >= date('now')
        ), 0
      ) as total_allocation,
      p.default_availability_percentage - COALESCE(
        (
          SELECT SUM(pa.allocation_percentage)
          FROM project_assignments pa
          WHERE pa.person_id = p.id
            AND pa.start_date <= date('now')
            AND pa.end_date >= date('now')
        ), 0
      ) as available_capacity,
      COALESCE(
        (
          SELECT COUNT(*)
          FROM project_assignments pa
          WHERE pa.person_id = p.id
            AND pa.start_date <= date('now')
            AND pa.end_date >= date('now')
        ), 0
      ) as active_assignments
    FROM people p
    LEFT JOIN roles pr ON p.primary_role_id = pr.id
  `);

  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    WITH role_capacity AS (
      SELECT 
        r.id as role_id,
        r.name as role_name,
        COUNT(DISTINCT p.id) as total_people,
        SUM(p.default_availability_percentage / 100.0) as total_capacity_fte
      FROM roles r
      LEFT JOIN people p ON r.id = p.primary_role_id
      GROUP BY r.id, r.name
    ),
    role_demand AS (
      SELECT 
        pdv.role_id,
        SUM(pdv.demand_hours) / (8 * 5) as total_demand_fte
      FROM project_demands_view pdv
      WHERE pdv.start_date <= date('now')
        AND pdv.end_date >= date('now')
      GROUP BY pdv.role_id
    )
    SELECT 
      rc.role_id,
      rc.role_name,
      rc.total_people,
      rc.total_capacity_fte,
      COALESCE(rd.total_demand_fte, 0) as total_demand_fte,
      rc.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) as gap_fte,
      CASE 
        WHEN rc.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) < 0 THEN 'GAP'
        WHEN rc.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) = 0 THEN 'EXACT'
        ELSE 'SURPLUS'
      END as status
    FROM role_capacity rc
    LEFT JOIN role_demand rd ON rc.role_id = rd.role_id
    ORDER BY gap_fte ASC
  `);

  await knex.raw(`
    CREATE VIEW project_health_view AS
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.priority,
      pt.name as project_type,
      l.name as location,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM project_assignments pa 
          WHERE pa.project_id = p.id 
            AND pa.start_date <= date('now') 
            AND pa.end_date >= date('now')
        ) THEN 'ACTIVE'
        WHEN p.aspiration_start > date('now') THEN 'PLANNED'
        ELSE 'INACTIVE'
      END as status,
      COALESCE(
        (
          SELECT COUNT(DISTINCT pa.person_id)
          FROM project_assignments pa
          WHERE pa.project_id = p.id
            AND pa.start_date <= date('now')
            AND pa.end_date >= date('now')
        ), 0
      ) as assigned_people,
      COALESCE(
        (
          SELECT SUM(pdv.demand_hours)
          FROM project_demands_view pdv
          WHERE pdv.project_id = p.id
            AND pdv.start_date <= date('now')
            AND pdv.end_date >= date('now')
        ), 0
      ) as current_demand_hours,
      CASE 
        WHEN COALESCE(
          (
            SELECT SUM(pdv.demand_hours)
            FROM project_demands_view pdv
            WHERE pdv.project_id = p.id
              AND pdv.start_date <= date('now')
              AND pdv.end_date >= date('now')
          ), 0
        ) = 0 THEN 100
        ELSE CAST(
          COALESCE(
            (
              SELECT SUM(pa.allocation_percentage * pe.default_hours_per_day)
              FROM project_assignments pa
              INNER JOIN people pe ON pa.person_id = pe.id
              WHERE pa.project_id = p.id
                AND pa.start_date <= date('now')
                AND pa.end_date >= date('now')
            ), 0
          ) * 100.0 / 
          COALESCE(
            (
              SELECT SUM(pdv.demand_hours)
              FROM project_demands_view pdv
              WHERE pdv.project_id = p.id
                AND pdv.start_date <= date('now')
                AND pdv.end_date >= date('now')
            ), 0
          ) AS INTEGER
        )
      END as fulfillment_percentage
    FROM projects p
    LEFT JOIN project_types pt ON p.project_type_id = pt.id
    LEFT JOIN locations l ON p.location_id = l.id
    WHERE p.include_in_demand = 1
    ORDER BY p.priority ASC, p.name ASC
  `);
}