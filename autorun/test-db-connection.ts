import { db } from './lib/prisma';

async function testConnection() {
  try {
    console.log('Testing database connection...');

    // Test basic connection
    const user = await db.user.findFirst();
    console.log('✓ Database connection successful');

    // Check school_memberships table
    const membershipCount = await db.schoolMembership.count();
    console.log(`✓ school_memberships table accessible. Records: ${membershipCount}`);

    // Test the specific query
    const schoolId = '550e8400-e29b-41d4-a716-446655440000';
    console.log(`\nTesting query for school: ${schoolId}`);
    
    const members = await db.schoolMembership.findMany({
      where: {
        schoolId: schoolId,
        status: 'approved'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`✓ Query successful. Found ${members.length} approved members`);
    
    if (members.length > 0) {
      const member = members[0] as any;
      console.log('Sample member:', JSON.stringify({
        id: member.id,
        studentId: member.studentId,
        schoolId: member.schoolId,
        status: member.status,
        createdAt: member.createdAt
      }, null, 2));
    } else {
      console.log('⚠ No approved members found for this school');
    }

  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

testConnection();
