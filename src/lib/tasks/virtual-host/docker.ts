import { escapeQuotes } from '../../modules/escape-quotes.js';
import { importFile } from '../../modules/prepare-files.js';
import { rootSVPS } from '../../modules/root.js';
import { BASIC_VIRTUAL_HOST } from '../../types/virtual-hosts.js';
import { createDefaultPage } from './create-default-page.js';

const createNodeServer = (port: number) =>
  `const http=require("http"),fs=require("fs");http.createServer((e,t)=>{fs.readFile("./public_html/index.html",(e,r)=>{t.writeHead(200,{"Content-Type":"text/html"}),t.end(r)})}).listen(${port});`;

export const createBasicContainer = (
  virtualHost: BASIC_VIRTUAL_HOST
): string[] => {
  const useDB = !!virtualHost.server?.mysql?.database;

  const domain = virtualHost.domain.trim();
  const port = String(virtualHost.port);
  const commands = [`mkdir -p /var/containers/domains/${domain}/public_html`];
  const { language } = virtualHost.server;
  const buildFromScratch: boolean =
    virtualHost.server?.buildFromScratch || false;

  const composePath = `${rootSVPS}/resources/docker/virtual-host/${
    virtualHost.server.language
  }/docker-compose${useDB ? '-mysql' : ''}.yml`;

  const isPublic =
    typeof virtualHost.server?.isPublic === 'boolean'
      ? virtualHost.server.isPublic
      : false;

  const isPublicDB = useDB
    ? typeof virtualHost.server?.mysql?.isPublic === 'boolean'
      ? virtualHost.server.mysql.isPublic
      : false
    : false;

  /** Docker Compose */
  const composeName = domain.replace(/\./g, '_');
  const composeFile = `${composeName}.yml`;

  const composeSource = importFile(composePath)
    .replace(/\${!DOMAIN}/gm, domain)
    .replace(/\${!PORT}/gm, port)
    .replace(/\${!DB_NAME}/gm, String(virtualHost.server.mysql?.database))
    .replace(/\${!DB_PASS}/gm, String(virtualHost.server.mysql?.password))
    .replace(
      /\${!DB_EXPOSE}/gm,
      virtualHost.server.mysql?.expose
        ? String(`${virtualHost.server.mysql?.expose}:`)
        : ''
    )
    .replace(
      /\${!IMAGE}/gm,
      buildFromScratch ? 'Dockerfile-php-8-scratch' : 'Dockerfile-php-8'
    )
    .replace(/\${!PUBLIC}/gm, isPublic ? '' : '127.0.0.1:')
    .replace(/\${!DB_PUBLIC}/gm, isPublicDB ? '' : '127.0.0.1:');

  /** Reset current Virtual Host if it exists */
  Object.assign(commands, [
    ...commands,
    `echo ${escapeQuotes(
      composeSource
    )} | cat > /var/containers/compositions/${composeFile}`,
    `chmod 0600 /var/containers/compositions/${composeFile}`,
    `docker compose -p ${composeName} -f /var/containers/compositions/${composeFile} down 2>&1 || true`,
    `rm -rf /var/containers/domains/${domain}`,
    `rm -rf /var/containers/images/${domain}`,
    `rm -rf /var/containers/databases/${domain}`,
  ]);

  if (useDB) {
    const dbCNF = importFile(
      `${rootSVPS}/resources/docker/virtual-host/mysql/my.cnf`
    );

    Object.assign(commands, [
      ...commands,
      `mkdir -p /var/containers/databases/${domain}/conf.d`,
      `echo ${escapeQuotes(
        dbCNF
      )} | cat > /var/containers/databases/${domain}/conf.d/my.cnf`,
      `echo "${virtualHost.server.mysql?.password}" | cat > /var/containers/databases/${domain}/conf.d/secret`,
      `chmod 0400 /var/containers/databases/${domain}/conf.d/my.cnf`,
      `chmod 0400 /var/containers/databases/${domain}/conf.d/secret`,
    ]);
  }

  /** Creating default page */
  /* eslint-disable @typescript-eslint/indent */
  /* eslint-disable indent */
  const defaultPage = virtualHost.server?.defaultPage
    ? escapeQuotes(importFile(virtualHost.server.defaultPage))
    : escapeQuotes(
        createDefaultPage({
          domain,
          icon: language === 'node' ? '🌱' : '🐘',
          language: language === 'node' ? 'Node.js' : 'PHP',
          colors: {
            main: language === 'node' ? '#6ae619' : '#7375af',
            secondary: language === 'node' ? '#46b200' : '#404275',
          },
        })
      );
  /* eslint-enable @typescript-eslint/indent */
  /* eslint-enable indent */

  Object.assign(commands, [
    ...commands,
    `mkdir -p /var/containers/domains/${domain}/public_html`,
    `chmod -R 0755 /var/containers/domains/${domain}`,
    `echo ${defaultPage} | cat > /var/containers/domains/${domain}/public_html/index.html`,
    `docker compose -p ${composeName} -f /var/containers/compositions/${composeFile} up -d`,
  ]);

  /** Composing NODE server */
  if (virtualHost.server.language === 'node') {
    const dockerfile = importFile(
      `${rootSVPS}/resources/docker/virtual-host/node/Dockerfile`
    );

    const pm2 = importFile(
      `${rootSVPS}/resources/docker/virtual-host/node/pm2.json`
    ).replace(/\${!DOMAIN}/gm, domain);

    Object.assign(commands, [
      ...commands,
      `echo ${escapeQuotes(
        dockerfile
      )} | cat > /var/containers/images/Dockerfile-node-lts-alpine`,
      `chmod 0600 /var/containers/images/Dockerfile-node-lts-alpine`,
      `echo ${escapeQuotes(
        createNodeServer(virtualHost.port)
      )} | cat > /var/containers/domains/${domain}/app.js`,
      `echo ${escapeQuotes(
        pm2
      )} | cat > /var/containers/domains/${domain}/pm2.json`,
    ]);
  } else if (virtualHost.server.language === 'php') {
    /** Composing PHP server */
    const dockerfile = importFile(
      `${rootSVPS}/resources/docker/virtual-host/php/Dockerfile${
        buildFromScratch ? '.scratch' : ''
      }`
    );

    const default000 = importFile(
      `${rootSVPS}/resources/docker/virtual-host/php/resources/000-default.conf`
    ).replace(/\${!DOMAIN}/gm, domain);

    const phpINI = importFile(
      `${rootSVPS}/resources/docker/virtual-host/php/resources/php.ini`
    ).replace(/\${!DOMAIN}/gm, domain);

    Object.assign(commands, [
      ...commands,
      'mkdir -p /var/containers/images/resources',
      `echo ${escapeQuotes(
        dockerfile
      )} | cat > /var/containers/images/Dockerfile-php-8${
        buildFromScratch ? '-scratch' : ''
      }`,
      `chmod 0600 /var/containers/images/Dockerfile-php-8${
        buildFromScratch ? '-scratch' : ''
      }`,
      `echo ${escapeQuotes(
        default000
      )} | cat > /var/containers/images/resources/000-default.conf`,
      `chmod 0600 /var/containers/images/resources/000-default.conf`,
      `echo ${escapeQuotes(
        phpINI
      )} | cat > /var/containers/images/resources/php.ini`,
      `chmod 0600 /var/containers/images/resources/php.ini`,
    ]);
  }

  /** Permissions */
  if (virtualHost?.server?.permissions) {
    const remote = `/var/containers/domains/${domain}`;
    const { user, group } = virtualHost.server.permissions;

    if (user && group) {
      Object.assign(commands, [
        ...commands,
        `chown -R ${user}:${user} "${remote}"`,
        `chmod -R 0775 "${remote}"`,
      ]);
    } else if (user) {
      Object.assign(commands, [
        ...commands,
        `chown -R ${user}: "${remote}"`,
        `chmod -R 0755 "${remote}"`,
      ]);
    } else if (group) {
      Object.assign(commands, [
        ...commands,
        `chown -R :${group} "${remote}"`,
        `chmod -R 0775 "${remote}"`,
      ]);
    }
  }

  /** Composing container */
  commands.push(
    `docker compose -p ${composeName} -f /var/containers/compositions/${composeFile} up -d --build`
  );

  return commands;
};
