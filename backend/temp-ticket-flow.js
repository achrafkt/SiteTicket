const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const loginRes = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@site-ticket.local', password: 'Admin1234!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('LOGIN_STATUS', loginRes.status);
  const project = await prisma.project.findUnique({ where: { code: 'DEMO-001' }, select: { id: true } });
  const ticketType = await prisma.ticketType.findUnique({ where: { code: 'RFI' }, select: { id: true } });
  const status = await prisma.ticketStatus.findUnique({ where: { code: 'ASSIGNED' }, select: { id: true } });
  const createRes = await fetch('http://localhost:3001/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ projectId: project.id, ticketTypeId: ticketType.id, title: 'Ticket from terminal workflow', description: 'Workflow end-to-end verification', priority: 'high', isBlocking: true, locationZone: 'Zone A', trade: 'Electricity', externalParty: 'Internal team', dueDate: '2026-08-20' })
  });
  const created = await createRes.json();
  console.log('CREATE_STATUS', createRes.status);
  console.log('CREATED_ID', created.id);
  console.log('CREATED_NUMBER', created.ticket_number);
  const listRes = await fetch('http://localhost:3001/tickets', { headers: { Authorization: `Bearer ${token}` } });
  const list = await listRes.json();
  console.log('LIST_STATUS', listRes.status);
  console.log('TICKET_COUNT', Array.isArray(list) ? list.length : 'not-array');
  const updateRes = await fetch(`http://localhost:3001/tickets/${created.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ statusId: status.id }) });
  const updated = await updateRes.json();
  console.log('UPDATE_STATUS', updateRes.status);
  console.log('UPDATED_STATUS_NAME', updated.status?.name);
  await prisma.$disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
