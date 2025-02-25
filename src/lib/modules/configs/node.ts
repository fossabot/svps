import { NODE } from '../../types/node.js';
import { MOUNT } from '../../types/mount.js';

export const setNode = (configs: MOUNT): Required<NODE> | null => {
  if (!configs?.node || typeof configs?.node !== 'object') return null;

  return {
    version:
      configs?.node && typeof configs.node.version === 'number'
        ? configs.node.version
        : 18,
    packages:
      configs?.node && Array.isArray(configs.node.packages)
        ? configs.node.packages
        : [],
  };
};
