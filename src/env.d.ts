/// <reference types="astro/client" />

type KVNamespace = import('@cloudflare/workers-types').KVNamespace;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

interface Env {
  RECIPES: KVNamespace;
  IMAGES: R2Bucket;
  SESSION_SECRET: string;
  IXIL_PASSWORD: string;
  MATHILDE_PASSWORD: string;
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Env;
    };
  }
}
