use std::process::Command;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let resource_dir = app
                .path()
                .resource_dir()
                .expect("failed to get resource dir");

            let backend = resource_dir.join("bin").join("server.exe");

            Command::new(&backend)
                .spawn()
                .expect("Failed to start Django backend");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri");
}
