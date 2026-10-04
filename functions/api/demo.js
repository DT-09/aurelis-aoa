import { demoScenario } from '../../lib/demo.js';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const scenario = body?.scenario || 'silent-failure';
    return Response.json(demoScenario(scenario), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ ok:false, error:String(error?.message || error) }, { status:400 });
  }
}
