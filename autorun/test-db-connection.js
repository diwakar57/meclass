#!/usr/bin/env node

const { db } = require('./lib/prisma.ts');

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
      console.log('Sample member:', JSON.stringify(members[0], null, 2));
    } else {
      console.log('⚠ No approved members found for this school');
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

testConnection();
