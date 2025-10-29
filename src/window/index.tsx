import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import WindownApp from "./app";
import mainTheme from "../theme";
import { AuthProvider } from "./auth/AuthContext";

const root = document.createElement("div");
root.className = "container";
document.body.appendChild(root);
const rootDiv = ReactDOM.createRoot(root);
rootDiv.render(
  <React.StrictMode>
    <ChakraProvider theme={mainTheme}>
      <AuthProvider>
        <WindownApp />
      </AuthProvider>
    </ChakraProvider>
  </React.StrictMode>
);
