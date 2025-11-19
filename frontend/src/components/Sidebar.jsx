import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const menuItems = [
    { label: "Dashboard", path: "/app/dashboard" },
    { label: "Destinations", path: "/app/destinations" },
    { label: "Places", path: "/app/places" },
    { label: "RateRanges", path: "/app/rate-ranges" },
    { label: "Dealers", path: "/app/dealers" },
    { label: "Destination Entries", path: "/app/destination-entries" },
  ];

  return (
    <aside className="w-60 bg-gray-900 text-white h-full flex flex-col p-4">
      <h2 className="text-xl font-semibold mb-6">ERP Shan</h2>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-4 py-2 rounded-md ${
                isActive ? "bg-gray-700" : "hover:bg-gray-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
