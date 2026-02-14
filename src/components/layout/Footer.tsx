import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white">
      <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-10 xl:px-16 py-16">

        {/* Top grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">
              VAAL EXOTICS
            </h3>
            <p className="mt-4 text-sm text-white/70 leading-relaxed">
              Fresh. Exotic. Locally grown.
              <br />
              Family-run mushroom farm based in the Vaal.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Shop
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              <li><Link to="/mushrooms/grow-kits" className="hover:text-white">Grow Kits</Link></li>
              <li><Link to="/mushrooms/grain-and-cultures" className="hover:text-white">Grain & Cultures</Link></li>
              <li><Link to="/mushrooms/cultivation-supplies" className="hover:text-white">Cultivation Supplies</Link></li>
              <li><Link to="/mushrooms/medicinal-supplements" className="hover:text-white">Medicinal Supplements</Link></li>
              <li><Link to="/bulk-herbal" className="hover:text-white">Bulk Herbal</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Info
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              <li><Link to="/about" className="hover:text-white">About</Link></li>
              <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link to="/disclaimer" className="hover:text-white">Disclaimer</Link></li>
              <li><Link to="/cart" className="hover:text-white">Cart</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Contact
            </h4>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              <p>Meyerton, South Africa</p>
              <p>Email: info@vaalexotics.co.za</p>
              <p>Phone: 078 216 6865</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-12 h-px w-full bg-white/10" />

        {/* Bottom */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-white/50">
          <p>© {new Date().getFullYear()} Vaal Exotics. All rights reserved.</p>

          <div className="flex items-center gap-6">
            <p>Proudly developed by Digital Solutions SA.</p>

            {/* Subtle Admin Link */}
            <Link
              to="/admin"
              className="text-white/40 hover:text-white/70 transition"
              aria-label="Admin login"
            >
              ADMIN
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
