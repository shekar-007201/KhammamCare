import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 5175;
const appUrl = `http://127.0.0.1:${port}/`;

async function isKhammamCareRunning() {
    try {
        const response = await fetch(appUrl, {
            signal: AbortSignal.timeout(1200),
        });
        if (!response.ok) return false;

        const html = await response.text();
        return html.includes('KhammamCare | React') && html.includes('/@vite/client');
    } catch {
        return false;
    }
}

function reportAlreadyRunning() {
    console.log(`KhammamCare is already running at http://localhost:${port}/`);
}

if (await isKhammamCareRunning()) {
    reportAlreadyRunning();
    process.exit(0);
}

const viteEntrypoint = fileURLToPath(
    new URL('../node_modules/vite/bin/vite.js',
        import.meta.url),
);
const server = spawn(
    process.execPath, [viteEntrypoint, '--host', '0.0.0.0', '--port', String(port), '--strictPort'], { stdio: 'inherit' },
);

process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));

server.on('error', (error) => {
    console.error('Unable to start the KhammamCare dev server:', error.message);
    process.exitCode = 1;
});

server.on('close', async(code) => {
    if (code !== 0 && (await isKhammamCareRunning())) {
        reportAlreadyRunning();
        process.exitCode = 0;
        return;
    }

    process.exitCode = code === null ? 1 : code;
});