/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@akd/db", "@akd/shared"],
  experimental: {
    outputFileTracingIncludes: {
      "/**": ["./node_modules/.prisma/client/**/*"],
    },
  },
};

export default nextConfig;
