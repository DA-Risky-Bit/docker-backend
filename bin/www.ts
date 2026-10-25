<<<<<<< HEAD
#!/usr/bin/env node

=======
>>>>>>> I_worked_on_no_branch_help_me_please
/**
 * Module dependencies.
 */

<<<<<<< HEAD
import app from '../app'; // Adjust this path if your folder structure is different
import debugLib from 'debug';
import http from 'http';
=======
import http from 'http';
import debugLib from 'debug';
import app from '../app';
>>>>>>> I_worked_on_no_branch_help_me_please

const debug = debugLib('auth-backend:server');

/**
 * Get port from environment and store in Express.
 */

<<<<<<< HEAD
const port = normalizePort(process.env.PORT || '3000');
=======
const port = normalizePort(process.env.PORT ?? '3001');
>>>>>>> I_worked_on_no_branch_help_me_please
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
<<<<<<< HEAD
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string): number | string | false {
  const portNum = parseInt(val, 10);

  if (isNaN(portNum)) {
=======
 * Normalize a port into a number or string (named pipe).
 */

function normalizePort(val: string): string | number {
  const parsed = parseInt(val, 10);

  if (isNaN(parsed)) {
>>>>>>> I_worked_on_no_branch_help_me_please
    // named pipe
    return val;
  }

<<<<<<< HEAD
  if (portNum >= 0) {
    // port number
    return portNum;
  }

  return false;
=======
  if (parsed >= 0) {
    // port number
    return parsed;
  }

  throw new Error(`Invalid port: ${val}`);
>>>>>>> I_worked_on_no_branch_help_me_please
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    throw error;
  }

<<<<<<< HEAD
  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;
=======
  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;
>>>>>>> I_worked_on_no_branch_help_me_please

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
<<<<<<< HEAD
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
=======
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
    // eslint-disable-next-line no-fallthrough
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
    // eslint-disable-next-line no-fallthrough
>>>>>>> I_worked_on_no_branch_help_me_please
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening(): void {
  const addr = server.address();
<<<<<<< HEAD
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + (addr ? addr.port : '');
  debug('Listening on ' + bind);
=======
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
  debug(`Listening on ${bind}`);
>>>>>>> I_worked_on_no_branch_help_me_please
}
