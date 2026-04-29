import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm', 'iife'], // 打包出适用于各种环境的版本
  dts: true, // 自动生成 d.ts 类型提示文件
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  globalName: 'Martian', // 在纯 html 里通过 script 引入时，全局变量名叫 Martian
});
