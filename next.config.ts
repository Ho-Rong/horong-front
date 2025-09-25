import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";
import type { NextConfig } from "next";

const withVanillaExtract = createVanillaExtractPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    optimizePackageImports: ["@vapor-ui/core", "@vapor-ui/icons"],
  },

  webpack(config) {
    // ✅ 기존 file-loader가 .svg를 처리하지 않도록 제외
    const fileLoaderRule = config.module.rules.find(
      // @ts-ignore
      (rule) => rule?.test?.test?.(".svg")
    );
    if (fileLoaderRule) {
      // @ts-ignore
      fileLoaderRule.exclude = /\.svg$/i;
    }

    // ✅ SVGR 로더 추가
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            icon: true,
            svgo: true,
            svgoConfig: {
              plugins: [
                { name: "removeViewBox", active: false }, // viewBox 유지
                { name: "removeDimensions", active: true }, // width/height 제거
              ],
            },
          },
        },
      ],
    });

    return config;
  },
};

export default withVanillaExtract(nextConfig);
