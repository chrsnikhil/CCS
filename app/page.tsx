import Link from 'next/link';

export default function Home() {
	return (
		<main style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
			<h1>Brute-Force Demo</h1>
			<p>Generate datasets and demonstrate cracking with live progress.</p>
			<div style={{ display: 'flex', gap: 12 }}>
				<Link href="/generate">Generate</Link>
				<Link href="/crack">Crack</Link>
			</div>
		</main>
	);
}
