interface BasicVirtualHost {
  language: 'php' | 'node';
  /**
   * Set a default `index.html` page at `/var/www/domains/${domain}/public_html/index.html`
   */
  defaultPage?: string;
  /**
   * Set `true` to allow the access of this **Virtual Host** directly from your **VPS Host**.
   *
   * Ex.: `http://${VPS_HOST}:5000`
   *
   * ---
   *
   * default: `false`
   */
  isPublic?: boolean;
  /**
   * #### Accessing your database from **Node.js** or **PHP**
   * - **host:** `${domain}-db` (ex.: `site.com-db`)
   * - **user:** `root`
   * - **port:** `3306`
   *
   * Then, your `database name` and `password`
   */
  /**
   * Set a custom permission for this Virutal Host
   *
   * ---
   *
   * **A)** Only `user`
   * ```bash
   * chmod -R 0755 /var/containers/domains/${domain}
   * chown -R ${user} /var/containers/domains/${domain}
   * ```
   *
   * ---
   *
   * **B)** Only `group`
   * ```bash
   * chmod -R 0775 /var/containers/domains/${domain}
   * chown -R :${group} /var/containers/domains/${domain}
   * ```
   *
   * ---
   *
   * **C)** Both `user` and `group`
   * ```bash
   * chmod -R 0775 /var/containers/domains/${domain}
   * chown -R ${user}:${group} /var/containers/domains/${domain}
   * ```
   */
  permissions?: {
    /**
     * This options won't create the user, in case it doesn't exists.
     *
     * You can easily create users using the `users` option from `mount` method.
     */
    user?: string;
    /**
     * This options won't create the group, in case it doesn't exists.
     */
    group?: string;
  };
  mysql?: {
    /** database name */
    database: string;
    /**
     * `root` password
     */
    password: string;
    /**
     * To access your database outside the container, you can expose it to a **custom port** by proxying the container's default port `3306` , then access it using your **VPS** host and the exposed port.
     */
    expose?: number;
    /**
     * Set `true` to allow the access of this **Database** directly from your **VPS Host**.
     *
     * ---
     *
     * default: `false`
     */
    isPublic?: boolean;
  };
  /**
   * Build the Docker image from scratch.
   *
   * - `true`: the Docker image is built from scratch.
   * - `false`: the Docker image is pulled from Docker Hub.
   *
   * ---
   *
   * default: `false`
   */
  buildFromScratch?: boolean;
}

/**
 * Required:
 *   - `apache` (to proxy the virtual ports to `80`)
 *
 * Optional:
 *   - `docker` (required to automatically create the **Basic Servers**)
 */
export interface VIRTUAL_HOST {
  /** Ex.: `site.com` */
  domain: string;
  /** Local Port for this domain that will be exposed by Docker */
  port: number;
  /** Set `true` to create a "www" CNAME */
  www?: boolean;
  /**
   * ### Basic Usage (easier)
   * Allows you to create a starter **PHP** (**8.2**) or **Node.js** (**LTS**) server with an optional **MySQL** empty database.
   *
   * ---
   *
   * ### Advanced Usage (manual)
   * By not using the basic `server`, you can create a completely customized server as you want and only creates the **Virtual Host** for your **port** and **domain**.
   */
  server?: BasicVirtualHost;
}

export interface BASIC_VIRTUAL_HOST extends VIRTUAL_HOST {
  server: BasicVirtualHost;
}
