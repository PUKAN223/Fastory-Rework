use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct ProcessManager(Mutex<Vec<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ProcessManager(Mutex::new(Vec::new())))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let mut children = Vec::new();

            // 1. Auto-spawn Backend on Port 8080 if not running
            if TcpStream::connect("127.0.0.1:8080").is_err() {
                let mut cmd = Command::new("cmd");
                #[cfg(windows)]
                cmd.args(["/C", "bun", "run", "dev"]);
                #[cfg(not(windows))]
                cmd.args(["-c", "bun run dev"]);
                cmd.current_dir("../backend");

                if let Ok(child) = cmd.spawn() {
                    children.push(child);
                }
            }

            // 2. Auto-spawn Frontend on Port 3000 if not running
            if TcpStream::connect("127.0.0.1:3000").is_err() {
                let mut cmd = Command::new("cmd");
                #[cfg(windows)]
                cmd.args(["/C", "bun", "run", "dev"]);
                #[cfg(not(windows))]
                cmd.args(["-c", "bun run dev"]);
                cmd.current_dir("../frontend");

                if let Ok(child) = cmd.spawn() {
                    children.push(child);
                }
            }

            if !children.is_empty() {
                let state = app.state::<ProcessManager>();
                if let Ok(mut guard) = state.0.lock() {
                    *guard = children;
                };
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<ProcessManager>();
                if let Ok(mut guard) = state.0.lock() {
                    for mut child in guard.drain(..) {
                        let _ = child.kill();
                    }
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
