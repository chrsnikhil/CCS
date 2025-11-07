'use client';

import { useEffect, useRef, useState } from 'react';

export default function GeneratePage() {
	const [taskId, setTaskId] = useState<string | null>(null);
	const [log, setLog] = useState<any[]>([]);
	const [status, setStatus] = useState<string>('idle');
	const [attempts, setAttempts] = useState<number>(0);
	const [aps, setAps] = useState<number | undefined>(undefined);
	const [eta, setEta] = useState<number | undefined>(undefined);
	const esRef = useRef<EventSource | null>(null);

	async function start() {
		const res = await fetch('/api/tasks', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ kind: 'generate', payload: { demo: true } }),
		});
		const json = await res.json();
		setTaskId(json.task.id);
		setLog([]);
		setStatus('running');
		setAttempts(0);
		setAps(undefined);
		setEta(undefined);
	}

	async function downloadJson() {
		const res = await fetch('/api/datasets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count: 100 }) });
		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'datasets.json';
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	useEffect(() => {
		if (!taskId) return;
		if (esRef.current) esRef.current.close();
		const es = new EventSource(`/api/tasks/${taskId}/events`);
		esRef.current = es;
		es.onmessage = (ev) => {
			try {
				const data = JSON.parse(ev.data);
				setLog((l) => [...l, data]);
				if (data?.type === 'status') setStatus(String(data.status));
				if (data?.type === 'progress') {
					if (typeof data.attempts === 'number') setAttempts(data.attempts);
					if (typeof data.attemptsPerSecond === 'number') setAps(data.attemptsPerSecond);
					if (typeof data.etaSeconds === 'number') setEta(data.etaSeconds);
				}
				if (data?.type === 'result') setStatus('completed');
			} catch {}
		};
		return () => es.close();
	}, [taskId]);

	return (
		<main style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
			<h1 style={{ marginBottom: 16 }}>Generate datasets</h1>
			<div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
				<button onClick={start} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', color: '#000' }}>Start generation</button>
				<button onClick={downloadJson} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', color: '#000' }}>Download JSON (100)</button>
			</div>
			{taskId && (
				<div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#fff' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
						<div>
							<div style={{ fontSize: 12, color: '#000' }}>Task</div>
							<div style={{ fontFamily: 'monospace', fontSize: 13 }}>{taskId}</div>
						</div>
						<div>
							<span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, background: status === 'completed' ? '#e6ffed' : status === 'failed' ? '#ffe6e6' : '#e6f0ff', color: '#000' }}>{status}</span>
						</div>
					</div>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
						<div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
							<div style={{ fontSize: 12, color: '#000' }}>Attempts</div>
							<div style={{ fontWeight: 600 }}>{attempts.toLocaleString()}</div>
						</div>
						<div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
							<div style={{ fontSize: 12, color: '#000' }}>Attempts/sec</div>
							<div style={{ fontWeight: 600 }}>{aps ? aps.toLocaleString() : '-'}</div>
						</div>
						<div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
							<div style={{ fontSize: 12, color: '#000' }}>ETA (s)</div>
							<div style={{ fontWeight: 600 }}>{eta ?? '-'}</div>
						</div>
					</div>
					<div>
						<div style={{ fontSize: 12, color: '#000', marginBottom: 6 }}>Events</div>
						<div style={{ background: '#f5f5f5', color: '#000', borderRadius: 6, padding: 12, maxHeight: 320, overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
							{log.length === 0 ? (
								<div style={{ color: '#000' }}>No events yet. Click "Start generation".</div>
							) : (
								log.map((l, i) => (
									<div key={i} style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(l)}</div>
								))
							)}
						</div>
					</div>
				</div>
			)}
		</main>
	);
}


