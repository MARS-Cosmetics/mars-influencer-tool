declare module "pg" {
  export class Pool {
    constructor(config?: { connectionString?: string; [key: string]: unknown });
    end(): Promise<void>;
  }
}
