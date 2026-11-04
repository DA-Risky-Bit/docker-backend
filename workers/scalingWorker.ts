import { dockerScaler } from '../services/dockerScaler';

interface FrontendService {
  serviceName: string;
  imageName: string;
  currentReplicas: number;
  minReplicas: number;
  maxReplicas: number;
}


const frontends: FrontendService[] = [
  {
    serviceName: 'admin-frontend',
    imageName: 'ghcr.io/da-risky-bit/admin-frontend:latest',
    currentReplicas: 1,
    minReplicas: 1,
    maxReplicas: 5,
  },
  {
    serviceName: 'chat-frontend',
    imageName: 'ghcr.io/da-risky-bit/chat-frontend:latest',
    currentReplicas: 1,
    minReplicas: 1,
    maxReplicas: 5,
  },
  {
    serviceName: 'challenge-frontend',
    imageName: 'ghcr.io/da-risky-bit/challenge-frontend:latest',
    currentReplicas: 1,
    minReplicas: 1,
    maxReplicas: 5,
  },
];

const CHECK_INTERVAL_MS = 30_000;
const COOLDOWN_MS = 90_000;

const lastScaled = new Map<string, number>();
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    for (const f of frontends) {
      try {
        const current = (await dockerScaler.getActiveInstances(f.serviceName)).length;
        if (current === 0) continue;

        const avgCpu = await dockerScaler.getAverageResourceUsage(f.serviceName);
        console.log(`[${f.serviceName}] Replicas: ${current} | Avg CPU: ${avgCpu.toFixed(2)}%`);

        if (Date.now() - (lastScaled.get(f.serviceName) ?? 0) < COOLDOWN_MS) continue;

        let target = current;
        if (avgCpu > 80 && current < f.maxReplicas) target = current + 1;
        else if (avgCpu < 20 && current > f.minReplicas) target = current - 1;

        if (target !== current) {
          console.log(`Scaling ${f.serviceName}: ${current} -> ${target}`);
          await dockerScaler.scaleService(f.serviceName, target);
          lastScaled.set(f.serviceName, Date.now());
        }
      } catch (error) {
        console.error(`Error in scaling loop for ${f.serviceName}:`, error);
      }
    }
  } finally {
    running = false;
  }
}

export function startScalingWorker() {
  console.log('Docker Compose multi-service auto-scaler worker started...');
  setInterval(tick, CHECK_INTERVAL_MS);
}
