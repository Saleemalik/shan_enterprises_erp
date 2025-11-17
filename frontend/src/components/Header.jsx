// src/components/Header.jsx
import { logout } from "../api/auth";

export default function Header() {
  return (
    <header className="w-full h-14 bg-white border-b shadow flex items-center justify-between px-6">

      <h1 className="text-2xl font-semibold">Shan Enterprises ERP</h1>

      <button
        onClick={logout}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Logout
      </button>

    </header>
  );
}
