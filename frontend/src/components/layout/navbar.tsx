import React from 'react';
import { useState, useEffect } from 'react';
import { authApi } from '../../services/api';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

interface User {
  full_name: string;
  email: string;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user_info');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);
  const handleLoginSuccess = async (credentialResponse: any) => {
    const token = credentialResponse.credential;
    try {
      const res = await authApi.loginWithGoogle(token);
      const userInfo = res.data.user || res.data; 
      localStorage.setItem('user_info', JSON.stringify(userInfo));
      setUser(userInfo);
      console.log("Đăng nhập thành công", userInfo.full_name);
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
    }
  };
  const  handleLogout = async () => {
    try {
      await authApi.logout();
    }catch (err) {
      console.error("Lỗi xóa session backend", err);
    } finally {
      localStorage.removeItem("user_info");
      setUser(null);
      window.location.href = "/";
    }
  }

  return (
    <nav className="bg-blue-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold tracking-tighter hover:text-blue-200 transition-colors">
          🔬 AI RESEARCH
        </Link>
        
        <div className="flex gap-8 items-center">
          <Link to="/" className="hover:text-blue-200 font-medium transition-colors">Trang chủ</Link>
          <Link to="/history" className="hover:text-blue-200 font-medium transition-colors">Lịch sử nghiên cứu</Link>
          
          <div className="ml-4 min-w-37.5 flex justify-end">
            {user ? (
              <div className="flex items-center gap-3 bg-blue-800 border border-blue-700 py-1.5 px-4 rounded-full shadow-inner">
                <span className="text-sm font-semibold truncate max-w-30">
                  {user.full_name}
                </span>
                <div className="w-px h-4 bg-blue-600"></div>
                <button 
                  onClick={handleLogout}
                  className="text-xs uppercase tracking-wider font-bold text-blue-300 hover:text-white transition-colors"
                >
                  Thoát
                </button>
              </div>
            ) : (
              <GoogleLogin 
                onSuccess={handleLoginSuccess} 
                onError={() => console.log('Login Failed')}
                theme="outline"
                shape="pill"
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}