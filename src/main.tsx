import { render } from "preact";
import { App } from "./app";
import "./style.css";
import axios from "axios";
import { load } from "cheerio";
import { initTheme } from "./utils/theme";

// 初始化主题色
initTheme();

const root = document.getElementById("app");
if (!root) {
  throw new Error("Root element #app not found");
}

render(<App />, root);
