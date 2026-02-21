import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-blue-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold tracking-tighter">🔬 AI RESEARCH</Link>
        <div className="flex gap-6">
          <Link title="Trang chủ" to="/" className="hover:text-blue-200 font-medium">Trang chủ</Link>
          <Link title="Lịch sử" to="/history" className="hover:text-blue-200 font-medium">Lịch sử nghiên cứu</Link>
        </div>
      </div>
    </nav>
  );
}