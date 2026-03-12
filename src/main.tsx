import { render } from "preact";
import { App } from "./app";
import "./style.css";
import axios from "axios";
import { load } from "cheerio";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Root element #app not found");
}

render(<App />, root);
