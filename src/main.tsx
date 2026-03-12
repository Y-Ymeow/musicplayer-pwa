import { render } from "preact";
import { App } from "./app";
import "./style.css";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Root element #app not found");
}

window.addEventListener("tauri-ready", async () => {});

render(<App />, root);
