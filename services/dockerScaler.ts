import Dockerode from 'dockerode';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);
const docker = new Dockerode();

export const dockerScaler = {
  async getActiveInstances(imageName: string) {
    const containers = await docker.listContainers({
      all: true,
      filters: JSON.stringify({ ancestor: [imageName], status: ['running'] })
    });
    return containers;
  },

  async getAverageResourceUsage(imageName: string): Promise<number> {
    const containers = await this.getActiveInstances(imageName);
    if (containers.length === 0) return 0;

    let totalCpuPercent = 0;

    for (const containerInfo of containers) {
      const container = docker.getContainer(containerInfo.Id);
      const stats = await container.stats({ stream: false });

      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const numberCPUs = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;

      let cpuPercent = 0.0;
      if (systemDelta > 0 && cpuDelta > 0) {
        cpuPercent = (cpuDelta / systemDelta) * numberCPUs * 100.0;
      }

      totalCpuPercent += cpuPercent;
    }

    return totalCpuPercent / containers.length;
  },

  async scaleService(serviceName: string, replicas: number) {
    try {
      const composeFilePath = path.resolve(__dirname, '../');

      console.log(`Scaling Docker Compose service '${serviceName}' to ${replicas} replicas...`);

      const { stdout, stderr } = await execPromise(
        `docker compose -f ${composeFilePath}/docker-compose.yml up --scale ${serviceName}=${replicas} -d`
      );

      console.log(`Successfully scaled ${serviceName} to ${replicas} instances.`);
      if (stdout) console.log(stdout);
    } catch (err: any) {
      console.error(`Failed to scale service via Docker Compose: ${err.message}`);
    }
  }
};
