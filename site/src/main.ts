const app = document.querySelector("#app");

if (!app) {
    throw new Error("App container not found");
}

app.innerHTML = `
    <h1>mainz</h1>
    <p>A class-based TSX runtime built on Web Components.</p>
    <p>Use the playground locally to test scenarios and experiments.</p>
`;