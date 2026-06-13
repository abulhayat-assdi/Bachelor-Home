/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the Docker
  // runtime image can run `node server.js` without the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
