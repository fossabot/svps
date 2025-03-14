import fs from 'fs';
import { normalize } from 'path';
import { escapeQuotes } from '../../../modules/escape-quotes.js';
import { setCertificate } from '../../../modules/configs/certificate.js';
import { setUsers } from '../../../modules/configs/users.js';
import sh from '../../../modules/sh.js';
import { setFTP } from './ftp.js';
import { setSFTP } from './sftp.js';
import { MOUNT } from '../../../types/mount.js';
import { rootSVPS } from '../../../modules/root.js';

export default (configs: MOUNT) => {
  const certificate = setCertificate(configs);
  const users = setUsers(configs);

  if (!users) return [] as string[];

  const commands: string[] = [
    `echo "${sh.startTitle}Setting up Users${sh.endTitle}"`,
    'apt-get update',
    'apt-get install acl -y',
  ];
  const hasFTP = users?.some((user) => typeof user.ftp === 'object') || false;
  const hasSFTP = users?.some((user) => typeof user.sftp === 'object') || false;
  const vsftpd_conf = escapeQuotes(
    fs.readFileSync(normalize(`${rootSVPS}/resources/ftp/vsftpd.conf`), 'utf-8')
  ).replace(/{!CERT}/gm, certificate?.output || '/etc/ssl/private/cert.pem');

  const sshdConfigPath = '/etc/ssh/sshd_config';
  const sftpConfigPath = '/etc/ssh/sshd_config.d/sftp.conf';

  if (hasFTP) {
    Object.assign(commands, [
      ...commands,
      'apt-get update',
      'apt-get purge vsftpd -y 2>/dev/null',
      'rm -rf /etc/vsftpd.userlist',
      'apt-get install vsftpd -y',
      'mkdir -p /etc/vsftpd/user_config_dir',
      `echo ${vsftpd_conf} | cat > /etc/vsftpd.conf`,
    ]);
  }

  if (hasSFTP) {
    Object.assign(commands, [
      ...commands,
      `sed -i 's/Subsystem\\ssftp\\s\\/usr\\/lib\\/openssh\\/sftp-server/Subsystem\\tsftp\\tinternal-sftp/g' ${sshdConfigPath}`,
      `sed -i '/#svps-start/,/#svps-end/d' ${sshdConfigPath}`,
      `rm -f ${sftpConfigPath}`,
    ]);
  }

  for (const user of users) {
    Object.assign(commands, [
      ...commands,
      `id -u ${user.name} &>/dev/null || adduser --disabled-password --gecos "" ${user.name}`,
      `mkdir -p ${user.directory}`,
      `echo "${user.name}:${user.password}" | chpasswd`,
      `echo "${user.name}"`,
    ]);

    if (user.sudo) commands.push(`gpasswd -a "${user.name}" sudo`);
    if (user.ftp) Object.assign(commands, [...commands, ...setFTP(user)]);
    if (user.sftp) Object.assign(commands, [...commands, ...setSFTP(user)]);
    if (user.groups.length > 0) {
      user.groups.forEach((group) =>
        Object.assign(commands, [
          ...commands,
          `groupadd -f ${group}`,
          `usermod -a -G ${group} ${user.name}`,
        ])
      );

      const primary = user.groups.shift();

      Object.assign(commands, [
        ...commands,
        `usermod -g ${primary} ${user.name}`,
        `--catch chown -R ${user.name}:${primary} ${user.directory}`,
      ]);
    } else commands.push(`--catch chown -R ${user.name} ${user.directory}`);

    Object.assign(commands, [
      ...commands,
      `--catch setfacl -Rb ${user.directory}`,
      `--catch chown -R ${user.name} ${user.directory}`,
      `--catch chmod -R 0755 ${user.directory}`,
      `chmod 0700 ${user.directory}`,
    ]);
  }

  if (hasFTP) commands.push('systemctl restart vsftpd');
  if (hasSFTP) commands.push('--restart-ssh');

  commands.push(sh.done);

  return commands;
};
