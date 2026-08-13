import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to this project.
    //
    // Turbopack walks up looking for a lockfile to infer the root, and an
    // unrelated package.json further up the tree makes it warn on every build.
    // Being explicit removes the ambiguity rather than depending on what
    // happens to exist in parent directories.
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
