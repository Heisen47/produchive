// Ambient type declarations for static asset imports (Vite)
// This file must NOT have any top-level import/export statements,
// otherwise TypeScript treats it as a module and the declarations
// become scoped instead of global.

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}
