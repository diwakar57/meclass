import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'accountant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const category = searchParams.get('category') || 'all';

    // Mock ledger data
    const ledgerData = {
      transactions: [
        { id: '1', date: '2026-03-20', description: 'Tuition Fees - School A', type: 'Income', amount: 15000, category: 'Tuition', balance: 15000 },
        { id: '2', date: '2026-03-19', description: 'Staff Salary', type: 'Expense', amount: 8000, category: 'Expenses', balance: 7000 },
        { id: '3', date: '2026-03-18', description: 'Facility Fees', type: 'Income', amount: 5000, category: 'Fees', balance: 12000 },
        { id: '4', date: '2026-03-17', description: 'Utilities Payment', type: 'Expense', amount: 2000, category: 'Expenses', balance: 10000 },
        { id: '5', date: '2026-03-16', description: 'Grant Received', type: 'Income', amount: 25000, category: 'Grants', balance: 35000 },
      ],
      summary: {
        totalIncome: 45000,
        totalExpense: 10000,
        netBalance: 35000,
        accountsReceivable: 12000,
        accountsPayable: 5000,
      },
      monthlyTrend: [
        { month: 'January', income: 50000, expense: 15000 },
        { month: 'February', income: 48000, expense: 16000 },
        { month: 'March', income: 45000, expense: 10000 },
      ],
    };

    return NextResponse.json({ data: ledgerData });
  } catch (error) {
    console.error('Error fetching accountant ledger:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
