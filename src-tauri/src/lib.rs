use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct BackendProcess(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Check if backend port 8080 is already running
            let is_running = TcpStream::connect("127.0.0.1:8080").is_ok();
            if !is_running {
                // Auto-spawn backend server process on startup
                let mut cmd = Command::new("cmd");
                #[cfg(windows)]
                cmd.args(["/C", "bun", "run", "dev"]);
                #[cfg(not(windows))]
                cmd.args(["-c", "bun run dev"]);

                cmd.current_dir("../backend");

                if let Ok(child) = cmd.spawn() {
                    let state = app.state::<BackendProcess>();
                    match state.0.lock() {
                        Ok(mut guard) => {
                            *guard = Some(child);
                        }
                        Err(_) => {}
                    };
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<BackendProcess>();
                match state.0.lock() {
                    Ok(mut guard) => {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                    Err(_) => {}
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
