import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <>
      <App />
      <Toaster />
    </>
  );
}
