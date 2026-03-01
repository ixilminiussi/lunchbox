/// <reference types="astro/client" />

type KVNamespace = import('@cloudflare/workers-types').KVNamespace;

interface Env {
  RECIPES: KVNamespace;
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
