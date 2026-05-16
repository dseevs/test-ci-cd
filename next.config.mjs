// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   /* config options here */
//   reactCompiler: true,
// };

// export default nextConfig;



// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   output: 'export',

//   images: {
//     unoptimized: true,
//   },
//   distDir: 'build',

//   basePath: '',
//   assetPrefix: './',
// }

// export default nextConfig  // ← Use 'export default' instead of 'module.exports'



import { createRequire } from 'module';


const isProd = process.env.NODE_ENV === 'production';


/** @type {import('next').NextConfig} */
const nextConfig = {
 output: 'export',
 images: {
   unoptimized: true,
 },
 distDir: 'build',
 ...(isProd && {
   basePath: "/acetic",    ///Put the name according to you lab name
   assetPrefix: "/acetic/",///Put the name according to you lab name


 }),
};


export default nextConfig;