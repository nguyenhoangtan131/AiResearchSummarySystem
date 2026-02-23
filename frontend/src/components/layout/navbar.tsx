import React from 'react';
import { authApi } from '../../services/api';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
export default function Navbar() {
  const handleLoginSuccess = async (credentialResponse: any) => {
    const token = credentialResponse.credential;

    try {
    const res = await authApi.loginWithGoogle(token);
    console.log("Kết quả từ Backend:", res.data);
    
  } catch (err) {
    console.error("Lỗi đăng nhập:", err);
  }

  };

  return (
    <nav className="bg-blue-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold tracking-tighter">🔬 AI RESEARCH</Link>
        <div className="flex gap-6">
          <Link title="Trang chủ" to="/" className="hover:text-blue-200 font-medium">Trang chủ</Link>
          <Link title="Lịch sử" to="/history" className="hover:text-blue-200 font-medium">Lịch sử nghiên cứu</Link>
        </div>

        <div className="ml-4">
            <GoogleLogin 
              onSuccess={handleLoginSuccess} 
              onError={() => console.log('Login Failed')}
              theme="outline"
              shape="pill"
            />
          </div>
      </div>
    </nav>
  );
}