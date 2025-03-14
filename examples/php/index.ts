/**
 * Using a Docker Container to create a local VPS:
 * docker run -d --privileged -p 22:22 --restart always wellwelwel/vps:latest
 *
 * Or just put your own VPS access to test
 */

// @ts-check
// import { SVPS } from 'svps';
import { SVPS } from '../../lib/index.js';

const svps = new SVPS({
  access: {
    host: '127.0.0.1',
    username: String(process.env.USER),
    password: process.env.PASS,
  },
});

await svps.mount({
  users: [
    {
      name: 'manager',
      password: String(process.env.MANAGER_PASS),
      sftp: {
        chRoot: '/var/www',
        chUser: '/var/www/domains',
        mask: '022',
      },
      groups: ['www-data'],
    },
  ],
  apache: {
    accessFromIP: false,
  },
  php: {
    composer: true,
    version: 8.2,
  },
});

await svps.end();
