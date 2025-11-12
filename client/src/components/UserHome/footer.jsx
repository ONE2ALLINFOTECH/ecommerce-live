import React from 'react';
import { Facebook, Twitter, Youtube, Instagram } from 'lucide-react';

export default function FlipkartFooter() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Main Content Area (for demo) */}
      <div className="flex-1 flex items-center justify-center ">
        <div className="text-center">
        
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* About Section */}
            <div>
              <h3 className="text-gray-400 text-xs font-semibold mb-4 uppercase tracking-wide">About</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm hover:text-white transition">Contact Us</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">About Us</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Careers</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Flipkart Stories</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Press</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Corporate Information</a></li>
              </ul>
            </div>

            {/* Group Companies */}
            <div>
              <h3 className="text-gray-400 text-xs font-semibold mb-4 uppercase tracking-wide">Group Companies</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm hover:text-white transition">Myntra</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Cleartrip</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Shopsy</a></li>
              </ul>
            </div>

            {/* Help Section */}
            <div>
              <h3 className="text-gray-400 text-xs font-semibold mb-4 uppercase tracking-wide">Help</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm hover:text-white transition">Payments</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Shipping</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Cancellation & Returns</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">FAQ</a></li>
              </ul>
            </div>

            {/* Consumer Policy */}
            <div>
              <h3 className="text-gray-400 text-xs font-semibold mb-4 uppercase tracking-wide">Consumer Policy</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm hover:text-white transition">Cancellation & Returns</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Terms Of Use</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Security</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Sitemap</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">Grievance Redressal</a></li>
                <li><a href="#" className="text-sm hover:text-white transition">EPR Compliance</a></li>
              </ul>
            </div>

            {/* Mail Us & Social */}
            <div className="space-y-6">
              <div>
                <h3 className="text-gray-400 text-xs font-semibold mb-4 uppercase tracking-wide">Mail Us:</h3>
                <p className="text-sm leading-relaxed">
                  Flipkart Internet Private Limited,<br />
                  Buildings Alyssa, Begonia &<br />
                  Clove Embassy Tech Village,<br />
                  Outer Ring Road, Devarabeesanahalli Village,<br />
                  Bengaluru, 560103,<br />
                  Karnataka, India
                </p>
              </div>

              <div>
                <h3 className="text-gray-400 text-xs font-semibold mb-4 uppercase tracking-wide">Social:</h3>
                <div className="flex gap-4">
                  <a href="#" className="hover:text-white transition">
                    <Facebook size={20} />
                  </a>
                  <a href="#" className="hover:text-white transition">
                    <Twitter size={20} />
                  </a>
                  <a href="#" className="hover:text-white transition">
                    <Youtube size={20} />
                  </a>
                  <a href="#" className="hover:text-white transition">
                    <Instagram size={20} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Registered Office Address */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <div className="text-sm leading-relaxed">
              <h3 className="text-gray-400 text-xs font-semibold mb-3 uppercase tracking-wide">Registered Office Address:</h3>
              <p>
                Flipkart Internet Private Limited,<br />
                Buildings Alyssa, Begonia &<br />
                Clove Embassy Tech Village,<br />
                Outer Ring Road, Devarabeesanahalli Village,<br />
                Bengaluru, 560103,<br />
                Karnataka, India<br />
                <span className="text-gray-400">CIN : U51109KA2012PTC066107</span><br />
                <span className="text-gray-400">Telephone: </span>
                <a href="tel:044-45614700" className="text-blue-400 hover:text-blue-300">044-45614700</a>
                <span className="text-gray-400"> / </span>
                <a href="tel:044-67415800" className="text-blue-400 hover:text-blue-300">044-67415800</a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="bg-gray-950 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              {/* Left Links */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
                <a href="#" className="flex items-center gap-2 hover:text-white transition">
                  <span className="text-yellow-500">🏪</span>
                  Become a Seller
                </a>
                <a href="#" className="flex items-center gap-2 hover:text-white transition">
                  <span className="text-yellow-500">📢</span>
                  Advertise
                </a>
                <a href="#" className="flex items-center gap-2 hover:text-white transition">
                  <span className="text-yellow-500">🎁</span>
                  Gift Cards
                </a>
                <a href="#" className="flex items-center gap-2 hover:text-white transition">
                  <span className="text-blue-400">❓</span>
                  Help Center
                </a>
              </div>

              {/* Copyright */}
              <div className="text-sm text-gray-400">
                © 2007-2025 Flipkart.com
              </div>

              {/* Payment Methods */}
              <div className="flex gap-2 flex-wrap justify-center">
                <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-gray-800">VISA</div>
                <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-gray-800">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-orange-500 -ml-1"></div>
                  </div>
                </div>
                <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-blue-600">Maestro</div>
                <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-gray-800">AMEX</div>
                <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-orange-500">PayPal</div>
                <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-purple-600">PhonePe</div>
                <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-gray-800">Paytm</div>
                <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-blue-500">UPI</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}