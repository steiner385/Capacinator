import { getDb } from './src/server/database/index.js';

const db = getDb();

async function checkProjectDates() {
  const project = await db('projects').where('id', '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1').first();
  console.log('Project dates:', {
    id: project.id,
    name: project.name,
    aspiration_start: project.aspiration_start,
    aspiration_finish: project.aspiration_finish,
    start_date: project.start_date,
    end_date: project.end_date
  });
  process.exit(0);
}

checkProjectDates().catch(console.error);