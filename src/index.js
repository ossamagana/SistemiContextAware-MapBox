import React from "react"
import ReactDOM from "react-dom"
import "./index.css"
import App from "./App"
import { ThemeProvider } from "atomize"
import { Provider as StyletronProvider, DebugEngine } from "styletron-react"
import { Client as Styletron } from "styletron-engine-atomic"
import { theme } from "./config"

const debug = new DebugEngine()

// 1. Create a client engine instance
const engine = new Styletron()

ReactDOM.render(
    <StyletronProvider value={engine} debug={debug} debugAfterHydration>
        <ThemeProvider theme={theme}>
            <App />
        </ThemeProvider>
    </StyletronProvider>,
    document.getElementById("root")
)
