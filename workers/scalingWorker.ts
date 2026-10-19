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

const CHECK_INTERVAL_MS = 30000;

export function startScalingWorker() {
  console.log('Docker Compose multi-service auto-scaler worker started...');

  setInterval(async () => {
    for (const frontend of frontends) {
      try {
        const avgCpuUsage = await dockerScaler.getAverageResourceUsage(frontend.imageName);
        console.log(`[${frontend.serviceName}] Replicas: ${frontend.currentReplicas} | Avg CPU: ${avgCpuUsage.toFixed(2)}%`);

        if (avgCpuUsage > 80 && frontend.currentReplicas < frontend.maxReplicas) {
          frontend.currentReplicas++;
          console.log(`High load on ${frontend.serviceName}. Scaling up to ${frontend.currentReplicas}...`);
          await dockerScaler.scaleService(frontend.serviceName, frontend.currentReplicas);
        }
        else if (avgCpuUsage < 20 && frontend.currentReplicas > frontend.minReplicas) {
          frontend.currentReplicas--;
          console.log(`Low load on ${frontend.serviceName}. Scaling down to ${frontend.currentReplicas}...`);
          await dockerScaler.scaleService(frontend.serviceName, frontend.currentReplicas);
        }

      } catch (error) {
        console.error(`Error in scaling loop for ${frontend.serviceName}:`, error);
      }
    }
  }, CHECK_INTERVAL_MS);
}
