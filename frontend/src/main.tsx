import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AdSenseProvider } from "./ads/AdSenseProvider";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdSenseProvider>
        <App />
      </AdSenseProvider>
    </BrowserRouter>
  </React.StrictMode>
);
