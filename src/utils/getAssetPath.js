const isProd = process.env.NODE_ENV === "production";
const BASE_PATH = isProd ? "/acetic" : "";


export function getAssetPath(path) {
 return `${BASE_PATH}${path}`;
}
