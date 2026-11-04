import Dockerode from 'dockerode';
import util from 'util';
import path from 'path';
import { execFile } from 'child_process';

const execFilePromise = util.promisify(execFile);
const docker = new Dockerode();

export const dockerScaler = {
  async getActiveInstances(serviceName: string) {
    return docker.listContainers({
      filters: JSON.stringify({
        status: ['running'],
        label: [
          `com.docker.compose.project=riskybit`,
          `com.docker.compose.service=${serviceName}`,
        ],
      }),
    });
  },

  async getAverageResourceUsage(serviceName: string): Promise<number> {
    const containers = await this.getActiveInstances(serviceName);
    if (containers.length === 0) return 0;

    const usages = await Promise.all(containers.map(async (c) => {
      const stats = await docker.getContainer(c.Id).stats({ stream: false });
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpus = stats.cpu_stats.online_cpus || 1;
      return systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * cpus * 100 : 0;
    }));

    return usages.reduce((a, b) => a + b, 0) / usages.length;
  },

  async scaleService(serviceName: string, replicas: number) {
    const composeFile = path.resolve(__dirname, '../docker-compose.yml');

    console.log(`Scaling '${serviceName}' to ${replicas} replicas...`);

    try {
      const { stdout, stderr } = await execFilePromise('docker', [
        'compose',
        '-p', "riskybit",
        '-f', composeFile,
        'up', '-d',
        '--no-deps',
        '--no-recreate',
        '--scale', `${serviceName}=${replicas}`,
        serviceName,
      ]);
      console.log(`Scaled ${serviceName} to ${replicas}.`);
      if (stdout) console.log(stdout);
      if (stderr) console.log(stderr);
    } catch (err: any) {
      console.error(`Failed to scale via Docker Compose: ${err.message}`);
    }
  }
};
