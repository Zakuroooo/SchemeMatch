// Image files imported from code are bundled by Metro and resolve to an image source.
declare module "*.jpg" {
  const source: number;
  export default source;
}
