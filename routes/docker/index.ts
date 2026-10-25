import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import Docker from 'dockerode';
import { PassThrough, Readable } from 'stream';

const PROJECT = { label: ['com.docker.compose.project=riskybit'] };

type SendFn = (event: string, data: unknown) => void;

interface StatsPayload {
  cpuPct: number;
  memUsed: number;
  memLimit: number;
  net: Docker.ContainerStats['networks'];
  blkio: Docker.ContainerStats['blkio_stats'];
}

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch(next);
  };

function sseStart(res: Response): SendFn {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  // Never write to a response that's already closed
  return (event, data) => {
    if (res.writableEnded || res.destroyed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
}

/**
 * Ties an upstream Docker stream to the client connection.
 * An unhandled 'error' event on a Node stream crashes the whole process, and
 * destroying a Docker response stream (which happens every time a browser tab
 * closes or React re-mounts an effect) emits one. Always attach this.
 */
function bindLifecycle(req: Request, res: Response, stream: Readable): void {
  stream.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code !== 'ECONNRESET') console.error('[docker stream]', err.message);
    if (!res.writableEnded) res.end();
  });
  stream.on('end', () => {
    if (!res.writableEnded) res.end();
  });
  res.on('error', () => stream.destroy());
  req.on('close', () => stream.destroy());
}

const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;
function getId(req: Request): string {
  const id = req.params.id;
  if (!ID_RE.test(id)) throw Object.assign(new Error('Invalid container id'), { status: 400 });
  return id;
}

function calcStats(s: Docker.ContainerStats): StatsPayload {
  const cpuDelta = s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
  const sysDelta = (s.cpu_stats.system_cpu_usage ?? 0) - (s.precpu_stats.system_cpu_usage ?? 0);
  const cpus = s.cpu_stats.online_cpus || 1;
  const cpuPct = sysDelta > 0 ? (cpuDelta / sysDelta) * cpus * 100 : 0;

  const mstats = (s.memory_stats.stats ?? {}) as Record<string, number>;
  const memCache = mstats.inactive_file ?? mstats.cache ?? 0;

  return {
    cpuPct,
    memUsed: s.memory_stats.usage - memCache,
    memLimit: s.memory_stats.limit,
    net: s.networks,
    blkio: s.blkio_stats,
  };
}

export function createDockerRouter(docker: Docker = new Docker()): Router {
  const router = Router();

  router.get('/containers', wrap(async (_req, res) => {
    res.json(await docker.listContainers({ all: true, filters: PROJECT }));
  }));

  router.get('/containers/:id/logs', wrap(async (req, res) => {
    const container = docker.getContainer(getId(req));
    const info = await container.inspect();

    const send = sseStart(res);
    const stream = (await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: 100,
      timestamps: true,
    })) as unknown as Readable;

    bindLifecycle(req, res, stream);

    if (info.Config.Tty) {
      stream.on('data', (c: Buffer) => send('stdout', c.toString()));
    } else {
      const out = new PassThrough();
      const err = new PassThrough();
      out.on('error', () => {});
      err.on('error', () => {});
      docker.modem.demuxStream(stream, out, err);
      out.on('data', (c: Buffer) => send('stdout', c.toString()));
      err.on('data', (c: Buffer) => send('stderr', c.toString()));
    }
  }));

  router.get('/containers/:id/stats', wrap(async (req, res) => {
    const container = docker.getContainer(getId(req));
    const send = sseStart(res);
    const stream = (await container.stats({ stream: true })) as unknown as Readable;

    bindLifecycle(req, res, stream);

    stream.on('data', (chunk: Buffer) => {
      try {
        send('stats', calcStats(JSON.parse(chunk.toString()) as Docker.ContainerStats));
      } catch {
        /* ignore partial chunk */
      }
    });
  }));

  router.get('/events', wrap(async (req, res) => {
    const send = sseStart(res);
    const stream = (await docker.getEvents({
      filters: { type: ['container'] },
    })) as unknown as Readable;

    bindLifecycle(req, res, stream);

    stream.on('data', (c: Buffer) => {
      try {
        send('docker', JSON.parse(c.toString()));
      } catch {
        /* ignore partial chunk */
      }
    });
  }));

  router.get('/info', wrap(async (req, res) => {
    const [i, list] = await Promise.all([
      docker.info(),
      docker.listContainers({ all: true, filters: PROJECT }),
    ]);

    const count = (state: string) => list.filter((c) => c.State === state).length;
    const running = count('running');
    const paused = count('paused');

    res.json({
      containers: list.length,
      running,
      paused,
      stopped: list.length - running - paused, // exited, created, dead
      images: i.Images, // still unfiltered
      ncpu: i.NCPU,
      memTotal: i.MemTotal,
      serverVersion: i.ServerVersion,
      os: i.OperatingSystem,
    });
  }));

  router.get('/stats', wrap(async (req, res) => {
    const send = sseStart(res);
    const streams = new Map<string, Readable>();
    const latest = new Map<string, StatsPayload>();
    let closed = false;
    let reconcileTimer: NodeJS.Timeout | undefined;
    let snapshotTimer: NodeJS.Timeout | undefined;

    const drop = (id: string) => {
      streams.delete(id);
      latest.delete(id);
    };

    const open = async (id: string) => {
      if (streams.has(id)) return;
      try {
        const stream = (await docker.getContainer(id).stats({ stream: true })) as unknown as Readable;
        streams.set(id, stream);
        stream.on('data', (chunk: Buffer) => {
          try {
            latest.set(id, calcStats(JSON.parse(chunk.toString()) as Docker.ContainerStats));
          } catch {
            /* ignore partial chunk */
          }
        });
        stream.on('error', () => drop(id)); // required: unhandled stream errors crash the process
        stream.on('end', () => drop(id));
      } catch {
        /* container vanished before we could attach */
      }
    };

    // Keep the set of open streams in sync with the running containers
    let busy = false;
    const reconcile = async () => {
      if (busy) return;
      busy = true;
      try {
        const running = await docker.listContainers({ filters: PROJECT });
        const ids = new Set(running.map((c) => c.Id));
        await Promise.all([...ids].map(open));
        for (const [id, s] of streams) {
          if (!ids.has(id)) {
            s.destroy();
            drop(id);
          }
        }
      } catch {
        /* docker unreachable; retry on the next tick */
      } finally {
        busy = false;
      }
    };

    req.on('close', () => {
      closed = true;
      clearInterval(reconcileTimer);
      clearInterval(snapshotTimer);
      for (const s of streams.values()) s.destroy();
      streams.clear();
    });

    await reconcile();
    if (closed) {
      for (const s of streams.values()) s.destroy();
      return;
    }

    reconcileTimer = setInterval(reconcile, 10_000);
    snapshotTimer = setInterval(() => send('snapshot', Object.fromEntries(latest)), 2_000);
  }));

  router.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return void res.end();
    res.status(err.status ?? 500).json({ error: err.message });
  });

  return router;
}
