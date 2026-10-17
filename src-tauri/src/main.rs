// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use tauri::{Manager, WindowEvent};

const DEFAULT_PORT: u16 = 5164;

struct Sidecars {
    children: Vec<Child>,
}

fn data_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("TICKETER_DATA_DIR") {
        return PathBuf::from(dir);
    }
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    if cfg!(target_os = "macos") {
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("Ticketer")
    } else {
        PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("Ticketer")
    }
}

fn resolve_port() -> u16 {
    if let Ok(p) = std::env::var("TICKETER_PORT").or_else(|_| std::env::var("PORT")) {
        if let Ok(n) = p.parse::<u16>() {
            if n >= 1024 {
                return n;
            }
        }
    }
    let settings = data_dir().join("settings.json");
    if let Ok(raw) = fs::read_to_string(settings) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(n) = v.get("port").and_then(|p| p.as_u64()) {
                if (1024..=65535).contains(&n) {
                    return n as u16;
                }
            }
        }
    }
    DEFAULT_PORT
}

/// Directory containing the Next.js build + node scripts (the project root).
/// Override with TICKETER_APP_ROOT; otherwise falls back to the project path
/// baked in at compile time (fine for local `pnpm app:build` on this machine).
fn app_root(_app: &tauri::AppHandle) -> PathBuf {
    if let Ok(dir) = std::env::var("TICKETER_APP_ROOT") {
        return PathBuf::from(dir);
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn node_bin() -> String {
    std::env::var("TICKETER_NODE").unwrap_or_else(|_| "node".into())
}

fn spawn_server(root: &PathBuf, port: u16) -> std::io::Result<Child> {
    Command::new(node_bin())
        .arg(root.join("scripts").join("start-server.mjs"))
        .env("PORT", port.to_string())
        .env("TICKETER_PORT", port.to_string())
        .current_dir(root)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
}

fn spawn_mcp(root: &PathBuf) -> std::io::Result<Child> {
    // Launch the MCP server alongside the app. It speaks stdio; keeping its
    // stdin open lets a local client attach. Shares the same DB.
    // tsx's bin is a shell script, so run it directly rather than via node.
    let tsx = root.join("node_modules").join(".bin").join("tsx");
    Command::new(tsx)
        .arg(root.join("mcp").join("server.ts"))
        .current_dir(root)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
}

fn wait_for_port(port: u16, timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(150));
    }
    false
}

fn main() {
    let port = resolve_port();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(Sidecars { children: vec![] }))
        .setup(move |app| {
            let handle = app.handle().clone();
            let root = app_root(&handle);

            let mut children = vec![];
            if let Ok(child) = spawn_server(&root, port) {
                children.push(child);
            }
            if let Ok(child) = spawn_mcp(&root) {
                children.push(child);
            }
            {
                let state = app.state::<Mutex<Sidecars>>();
                state.lock().unwrap().children = children;
            }

            // Wait for the web server, then navigate the main window to it.
            let main = app.get_webview_window("main").unwrap();
            thread::spawn(move || {
                wait_for_port(port, Duration::from_secs(30));
                let url = format!("http://localhost:{port}");
                let _ = main.eval(&format!("window.location.replace('{url}')"));
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Destroyed = event {
                let state = window.state::<Mutex<Sidecars>>();
                let mut guard = state.lock().unwrap();
                for child in guard.children.iter_mut() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Ticketer");
}
