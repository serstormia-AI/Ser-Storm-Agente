import { NextResponse } from 'next/server';
import { getLeads, getBrain, getConversations, getAgency } from '../../actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const leads = await getLeads();
    const brain = await getBrain();
    const convs = await getConversations();
    const agency = await getAgency('serstorm');

    return NextResponse.json({
      status: 'ok',
      leadsCount: leads.length,
      firstLead: leads[0] || null,
      brainLoaded: !!brain,
      brainTitle: brain?.content ? brain.content.slice(0, 60) : null,
      convsCount: convs.length,
      agencyLoaded: !!agency,
      agencyName: agency?.name || null,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error?.message || String(error),
      stack: error?.stack,
    }, { status: 500 });
  }
}
