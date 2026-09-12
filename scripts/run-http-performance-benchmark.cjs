const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode < 500) resolve(true);
        else if (Date.now() - start > timeoutMs) reject(new Error('timeout'));
        else setTimeout(check, 300);
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('timeout'));
        else setTimeout(check, 300);
      });
    };
    check();
  });
}

function makeRequest(url) {
  const start = process.hrtime.bigint();
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      res.resume();
      res.on('end', () => {
        const durationNs = process.hrtime.bigint() - start;
        const durationMs = Number(durationNs) / 1e6;
        resolve(durationMs);
      });
    }).on('error', reject);
  });
}

async function runBenchmark() {
  console.log('Starting API server on port 3334 for HTTP load benchmark...');
  const apiServer = spawn('node', ['apps/api/dist/main.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: '3334', ENVIRONMENT: 'staging' },
    stdio: 'ignore',
  });

  try {
    await waitForServer('http://localhost:3334/health');
    console.log('API server ready.');

    // Warm-up
    for (let i = 0; i < 25; i++) {
      await makeRequest('http://localhost:3334/health');
    }

    const iterations = 500;
    const latencies = [];
    const benchStart = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      const lat = await makeRequest('http://localhost:3334/health/system');
      latencies.push(lat);
    }

    const totalDurationNs = process.hrtime.bigint() - benchStart;
    const totalDurationMs = Number(totalDurationNs) / 1e6;
    const throughput = (iterations / totalDurationMs) * 1000;
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(iterations * 0.5)];
    const p95 = latencies[Math.floor(iterations * 0.95)];
    const p99 = latencies[Math.floor(iterations * 0.99)];
    const avg = latencies.reduce((a, b) => a + b, 0) / iterations;

    console.log('====================================================');
    console.log('E3-EOS HTTP API Real Latency & Throughput Benchmark');
    console.log('====================================================');
    console.log(`Endpoint: GET /health/system`);
    console.log(`Requests Completed: ${iterations}`);
    console.log(`Total Wall Time:    ${totalDurationMs.toFixed(2)} ms`);
    console.log(`Throughput:         ${throughput.toFixed(1)} req/sec`);
    console.log(`Average Latency:    ${avg.toFixed(2)} ms`);
    console.log(`P50 Latency:        ${p50.toFixed(2)} ms`);
    console.log(`P95 Latency:        ${p95.toFixed(2)} ms`);
    console.log(`P99 Latency:        ${p99.toFixed(2)} ms`);
    console.log('====================================================');
  } finally {
    apiServer.kill();
  }
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
