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
      name: '',
      password: '',
      sudo: false,
      sftp: true,
    },
  ],
  apache: true,
  php: true,
  node: true,
  mysql: {
    root: {
      pass: '',
    },
    users: [],
  },
  repair: true,
  apt: true,
  firewall: true,
  docker: false,
  desktop: false,
  reboot: true,
});

await svps.end();
