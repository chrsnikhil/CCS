import { TaskRegistry } from '@/lib/tasks/registry';

export async function GET(_: Request, { params }: { params: { id: string } }) {
	const task = TaskRegistry.get(params.id);
	if (!task) return new Response('Not found', { status: 404 });
	return Response.json({ task });
}


