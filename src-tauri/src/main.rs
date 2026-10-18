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

/// Path to the bundled payload (`<resources>/app`) when running a packaged app.
fn bundled_payload(app: &tauri::AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    let bundled = resource_dir.join("app");
    if bundled.join("server.tar.gz").exists() {
        Some(bundled)
    } else {
        None
    }
}

/// Dev project root (used when not running a packaged app).
fn dev_root() -> PathBuf {
    if let Ok(dir) = std::env::var("TICKETER_APP_ROOT") {
        return PathBuf::from(dir);
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

/// Extracts the bundled server tarball into <data_dir>/runtime/server, but only
/// when the BUILD_ID differs from the last extraction. Returns the server dir.
/// Tar preserves pnpm's symlinks, so the extracted tree resolves correctly.
fn ensure_server_extracted(payload: &PathBuf) -> std::io::Result<PathBuf> {
    let runtime = data_dir().join("runtime");
    let server = runtime.join("server");
    let stamp = runtime.join("BUILD_ID");

    let bundled_id = fs::read_to_string(payload.join("BUILD_ID")).unwrap_or_default();
    let current_id = fs::read_to_string(&stamp).unwrap_or_default();

    if !server.join("server.js").exists() || bundled_id != current_id {
        let _ = fs::remove_dir_all(&server);
        fs::create_dir_all(&server)?;
        Command::new("tar")
            .arg("-xzf")
            .arg(payload.join("server.tar.gz"))
            .arg("-C")
            .arg(&server)
            .status()?;
        fs::write(&stamp, bundled_id)?;
    }
    Ok(server)
}

/// Node runtime to use: the bundled copy when present, else system `node`.
fn node_bin(dir: &PathBuf) -> PathBuf {
    let bundled = dir.join("node");
    if bundled.exists() {
        return bundled;
    }
    PathBuf::from(std::env::var("TICKETER_NODE").unwrap_or_else(|_| "node".into()))
}

fn spawn_server_bundled(
    payload: &PathBuf,
    port: u16,
) -> std::io::Result<Child> {
    let server = ensure_server_extracted(payload)?;
    let node = node_bin(payload);
    Command::new(node)
        .arg(server.join("server.js"))
        .env("PORT", port.to_string())
        .env("TICKETER_PORT", port.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .current_dir(&server)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
}

fn spawn_server_dev(root: &PathBuf, port: u16) -> std::io::Result<Child> {
    Command::new(node_bin(root))
        .arg(root.join("scripts").join("start-server.mjs"))
        .env("PORT", port.to_string())
        .env("TICKETER_PORT", port.to_string())
        .current_dir(root)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
}

fn spawn_mcp_bundled(payload: &PathBuf) -> std::io::Result<Child> {
    Command::new(node_bin(payload))
        .arg(payload.join("mcp-server.cjs"))
        .current_dir(payload)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
}

fn spawn_mcp_dev(root: &PathBuf) -> std::io::Result<Child> {
    // tsx's bin is a shell script, so run it directly.
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

            let mut children = vec![];
            match bundled_payload(&handle) {
                Some(payload) => {
                    if let Ok(child) = spawn_server_bundled(&payload, port) {
                        children.push(child);
                    }
                    if let Ok(child) = spawn_mcp_bundled(&payload) {
                        children.push(child);
                    }
                }
                None => {
                    let root = dev_root();
                    if let Ok(child) = spawn_server_dev(&root, port) {
                        children.push(child);
                    }
                    if let Ok(child) = spawn_mcp_dev(&root) {
                        children.push(child);
                    }
                }
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
