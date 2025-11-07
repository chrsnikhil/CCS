'use client';

import { useEffect, useRef, useState } from 'react';

export default function CrackPage() {
	const [taskId, setTaskId] = useState<string | null>(null);
	const [log, setLog] = useState<any[]>([]);
	const [status, setStatus] = useState<string>('idle');
	const [attempts, setAttempts] = useState<number>(0);
	const [aps, setAps] = useState<number | undefined>(undefined);
	const [eta, setEta] = useState<number | undefined>(undefined);
	const [summary, setSummary] = useState<string>('');
	const [targetInfo, setTargetInfo] = useState<any>(null);
	const esRef = useRef<EventSource | null>(null);
	const [scenario, setScenario] = useState<string>('');

	async function startScenario(s: string) {
		const res = await fetch('/api/tasks', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ kind: 'crack', payload: { scenario: s } }),
		});
		const json = await res.json();
		setLog([]);
		setStatus('running');
		setAttempts(0);
		setAps(undefined);
		setEta(undefined);
		setSummary('');
		setScenario(s);
		setTaskId(json.task.id);
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
				if (data?.type === 'info') {
					setTargetInfo(data.info?.target ?? null);
				}
				if (data?.type === 'result') {
					setStatus('completed');
					setSummary(summarizeResult(data.result));
				}
			} catch {}
		};
		return () => es.close();
	}, [taskId]);

	function summarizeResult(res: any): string {
		if (!res) return '';
		if (res.shift !== undefined) return `Best shift: ${res.shift}`;
		if (res.key !== undefined && typeof res.key === 'number') return `Best key: ${res.key}`;
		if (res.key) return `Best key: ${res.key}`;
		if (res.candidate) return `Found: ${res.candidate}`;
		if (res.found === false) return 'Not found';
		return JSON.stringify(res);
	}

	return (
		<main style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
			<h1 style={{ marginBottom: 16, color: '#000' }}>Crack</h1>
			{scenario && (
				<div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff', marginBottom: 12, color: '#000' }}>
					<div style={{ fontSize: 12, marginBottom: 4 }}>What is being cracked</div>
					<div style={{ fontFamily: 'monospace', marginBottom: 6 }}>{prettyScenario(scenario)}</div>
					<div style={{ fontSize: 13, marginBottom: 6 }}>{scenarioDescription(scenario)}</div>
					{targetInfo && (
						<div style={{ fontSize: 12, marginTop: 6 }}>
							{targetInfo.plaintext && (
								<div><strong>Plaintext:</strong> <span style={{ fontFamily: 'monospace' }}>{targetInfo.plaintext}</span></div>
							)}
							{targetInfo.ciphertext && (
								<div><strong>Ciphertext:</strong> <span style={{ fontFamily: 'monospace' }}>{targetInfo.ciphertext}</span></div>
							)}
							{targetInfo.ciphertextHex && (
								<div><strong>Ciphertext (hex):</strong> <span style={{ fontFamily: 'monospace' }}>{targetInfo.ciphertextHex}</span></div>
							)}
							{targetInfo.saltHex && (
								<div><strong>Salt (hex):</strong> <span style={{ fontFamily: 'monospace' }}>{targetInfo.saltHex}</span></div>
							)}
							{targetInfo.ivHex && (
								<div><strong>IV (hex):</strong> <span style={{ fontFamily: 'monospace' }}>{targetInfo.ivHex}</span></div>
							)}
							{targetInfo.mask && (
								<div><strong>Mask:</strong> <span style={{ fontFamily: 'monospace' }}>{targetInfo.mask}</span></div>
							)}
							{targetInfo.note && (
								<div style={{ marginTop: 4 }}>{targetInfo.note}</div>
							)}
						</div>
					)}
				</div>
			)}
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
				<button onClick={() => startScenario('caesar')} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', color: '#000' }}>Caesar exhaustive</button>
				<button onClick={() => startScenario('xor')} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', color: '#000' }}>XOR single-byte exhaustive</button>
				<button onClick={() => startScenario('vigenere')} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', color: '#000' }}>Vigenère exhaustive (len 1-3)</button>
				<button onClick={() => startScenario('sha1_mask')} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', color: '#000' }}>SHA1 mask (quick demo)</button>
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
					{summary && (
						<div style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}>
							<div style={{ fontSize: 12, color: '#000', marginBottom: 4 }}>Result</div>
							<div style={{ fontFamily: 'monospace' }}>{summary}</div>
						</div>
					)}
					<div>
						<div style={{ fontSize: 12, color: '#000', marginBottom: 6 }}>Events</div>
						<div style={{ background: '#f5f5f5', color: '#000', borderRadius: 6, padding: 12, maxHeight: 320, overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
							{log.length === 0 ? (
								<div style={{ color: '#000' }}>No events yet. Choose a scenario.</div>
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

function prettyScenario(s: string): string {
	switch (s) {
		case 'caesar': return 'Caesar cipher (26 shifts, exhaustive search)';
		case 'vigenere': return 'Vigenère cipher (A–Z keys length 1–3, exhaustive)';
		case 'xor': return 'Single-byte XOR (keys 0–255, exhaustive)';
		case 'md5_dict': return 'MD5 password hash (dictionary with simple mangles)';
		case 'sha1_mask': return 'SHA1 password hash (mask ?l?l?l?l?d?d?d?d)';
		case 'aes_dict': return 'AES-256-CTR with PBKDF2 passphrase (dictionary with simple mangles)';
		default: return s;
	}
}

function scenarioDescription(s: string): string {
	switch (s) {
		case 'caesar':
			return 'We recover the shift by trying all 26 possibilities and scoring decrypted text against English letter frequencies.';
		case 'vigenere':
			return 'We try every key composed of letters A–Z with length 1 to 3 and pick the best English-looking decryption.';
		case 'xor':
			return 'We try every 0–255 key byte; the best plaintext has the highest ratio of printable characters.';
		case 'md5_dict':
			return 'We attempt to match a given MD5 hash by iterating a small dictionary and simple variations (capitalization, numeric suffixes).';
		case 'sha1_mask':
			return 'We enumerate all passwords matching the mask ?l?l?l?l?d?d?d?d (e.g., pass1234) and compare their SHA1 hashes.';
		case 'aes_dict':
			return 'We attempt to decrypt AES-CTR using passphrases derived via PBKDF2 from a dictionary with simple variations until the plaintext matches.';
		default:
			return '';
	}
}


