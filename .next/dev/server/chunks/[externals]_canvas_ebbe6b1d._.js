module.exports = [
"[externals]/canvas [external] (canvas, cjs, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/[externals]_canvas_e2349c47._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/canvas [external] (canvas, cjs)");
    });
});
}),
];